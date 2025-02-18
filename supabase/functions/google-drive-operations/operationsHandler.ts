
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

    console.log('Folder created with ID:', folder.id);
    return folder;
  } catch (error) {
    console.error('Create folder error:', error);
    throw error;
  }
}

async function uploadFile(accessToken: string, file: any, folderId: string) {
  console.log(`Uploading file: ${file.fileName} to folder: ${folderId}`);
  
  try {
    const metadata = {
      name: file.fileName,
      parents: [folderId]
    };

    // Create multipart form-data
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

    // Upload the file
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    const uploadedFile = await response.json();

    // Make the file accessible via link
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

    // Get the webViewLink
    const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedFile.id}?fields=webViewLink`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    const fileData = await fileResponse.json();
    console.log('File uploaded successfully:', fileData);
    return fileData.webViewLink;
  } catch (error) {
    console.error('Error uploading file:', error);
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

async function handleOperation(operation: string, payload: any) {
  console.log(`Handling operation: ${operation}`);
  
  const accessToken = await getAccessToken();
  
  switch (operation) {
    case 'uploadFiles': {
      console.log('Starting batch file upload process');
      const { files } = payload;
      
      try {
        // Create a folder for the batch
        const now = new Date();
        const folderName = `CV_Batch_${now.toISOString().replace(/[:.]/g, '-')}`;
        console.log('Creating folder:', folderName);
        
        const folder = await createFolder(accessToken, folderName);
        console.log('Folder created:', folder);

        // Upload all files to the folder
        console.log('Starting file uploads, total files:', files.length);
        const uploadPromises = files.map((file: any) => uploadFile(accessToken, file, folder.id));

        const fileLinks = await Promise.all(uploadPromises);
        console.log('All files uploaded successfully. Links:', fileLinks);

        return { 
          fileLinks,
          folderLink: folder.webViewLink
        };
      } catch (error) {
        console.error('Error in handleUploadFiles:', error);
        throw error;
      }
    }
    case 'deleteFolder': {
      console.log('Starting folder deletion process');
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

        console.log('Folder deleted successfully');
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
  // Handle CORS preflight requests
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
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
