
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function createFolder(accessToken: string, folderName: string) {
  console.log('Creating folder:', folderName);
  
  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }

    const folder = await response.json();
    
    // Make the folder accessible via link
    await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    // Get the webViewLink for the folder
    const folderResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folder.id}?fields=webViewLink`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!folderResponse.ok) {
      throw new Error(`Failed to get folder webViewLink: ${folderResponse.statusText}`);
    }

    const folderData = await folderResponse.json();
    return { ...folder, webViewLink: folderData.webViewLink };
  } catch (error) {
    console.error('Create folder error:', error);
    throw error;
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function uploadFile(accessToken: string, file: any, folderId: string) {
  console.log(`Starting upload for file: ${file.fileName}`);
  
  try {
    const metadata = {
      name: file.fileName,
      parents: [folderId]
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const contentType = file.mimeType || 'application/octet-stream';
    
    let multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + contentType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n' +
      '\r\n' +
      file.fileContent +
      close_delim;

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
    }

    const uploadedFile = await uploadResponse.json();

    if (!uploadedFile.id) {
      throw new Error('File upload succeeded but no file ID was returned');
    }

    // Set file permissions with a small delay
    await delay(500);
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedFile.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });

    console.log('File uploaded successfully:', uploadedFile.webViewLink);
    return uploadedFile.webViewLink;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

async function getAccessToken() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing required Google credentials');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get access token');
  }

  const data = await response.json();
  return data.access_token;
}

let currentFolderId: string | null = null;

export async function handleOperation(operation: string, payload: any) {
  console.log(`Starting operation: ${operation}`);
  
  const accessToken = await getAccessToken();
  
  switch (operation) {
    case 'uploadFiles': {
      console.log('Processing batch upload');
      const { files, isLastBatch, startIndex } = payload;
      
      try {
        // Create folder only for first batch
        if (!currentFolderId) {
          const now = new Date();
          const folderName = `CV_Batch_${now.toISOString().replace(/[:.]/g, '-')}`;
          console.log('Creating new folder:', folderName);
          
          const folder = await createFolder(accessToken, folderName);
          currentFolderId = folder.id;
          console.log('Created folder:', folder);
        }

        // Upload files in current batch
        console.log(`Processing files ${startIndex + 1}-${startIndex + files.length}`);
        const fileLinks = [];
        
        for (const file of files) {
          const link = await uploadFile(accessToken, file, currentFolderId);
          fileLinks.push(link);
          console.log(`File ${fileLinks.length}/${files.length} in batch uploaded`);
          
          if (fileLinks.length < files.length) {
            await delay(500); // Small delay between files in same batch
          }
        }

        // If this is the last batch, get and reset the folder info
        let folderLink;
        if (isLastBatch && currentFolderId) {
          const folderResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${currentFolderId}?fields=webViewLink`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );
          
          if (folderResponse.ok) {
            const folderData = await folderResponse.json();
            folderLink = folderData.webViewLink;
          }
          
          currentFolderId = null; // Reset for next upload session
        }

        return { fileLinks, folderLink };
      } catch (error) {
        console.error('Error in batch upload:', error);
        throw error;
      }
    }
    case 'deleteFolder': {
      const { folderId } = payload;
      
      try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete folder: ${response.statusText}`);
        }

        return { success: true };
      } catch (error) {
        console.error('Error deleting folder:', error);
        throw error;
      }
    }
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, files, folderId } = await req.json();
    console.log(`Processing ${operation} operation`);

    const result = await handleOperation(operation, { files, folderId });
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Operation failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
