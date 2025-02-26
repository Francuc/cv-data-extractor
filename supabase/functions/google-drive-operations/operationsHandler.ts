
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
      const errorText = await response.text();
      console.error('Create folder response error:', errorText);
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }

    const folder = await response.json();
    console.log('Folder created successfully:', folder);
    
    // Make the folder accessible via link
    const permissionResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}/permissions`, {
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

    if (!permissionResponse.ok) {
      const errorText = await permissionResponse.text();
      console.error('Folder permission response error:', errorText);
      throw new Error(`Failed to set folder permissions: ${permissionResponse.statusText}`);
    }

    // Get the webViewLink for the folder
    const folderResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}?fields=webViewLink`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!folderResponse.ok) {
      const errorText = await folderResponse.text();
      console.error('Get folder webViewLink error:', errorText);
      throw new Error(`Failed to get folder webViewLink: ${folderResponse.statusText}`);
    }

    const folderData = await folderResponse.json();
    console.log('Folder data with webViewLink:', folderData);
    return { ...folder, webViewLink: folderData.webViewLink };
  } catch (error) {
    console.error('Create folder error:', error);
    throw error;
  }
}

// Add delay function for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function uploadFile(accessToken: string, file: any, folderId: string) {
  console.log(`Starting upload for file: ${file.fileName} to folder: ${folderId}`);
  console.log('File details:', { 
    size: file.fileContent.length,
    mimeType: file.mimeType
  });
  
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

    console.log('Sending upload request to Google Drive...');
    
    // Upload the file and request webViewLink in the same request
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload response error:', errorText);
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    const uploadedFile = await response.json();
    console.log('File upload response:', uploadedFile);

    if (!uploadedFile.id) {
      throw new Error('File upload succeeded but no file ID was returned');
    }

    // Add delay before setting permissions to avoid rate limiting
    await delay(1000);

    console.log('Setting file permissions...');
    // Make the file accessible via link
    const permissionResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedFile.id}/permissions`, {
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

    if (!permissionResponse.ok) {
      console.error('Permission response error:', await permissionResponse.text());
      throw new Error('Failed to set file permissions');
    }

    console.log('File upload completed successfully:', {
      id: uploadedFile.id,
      webViewLink: uploadedFile.webViewLink
    });
    
    return uploadedFile.webViewLink;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

async function getAccessToken() {
  console.log('Getting access token...');
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
    const errorText = await response.text();
    console.error('Token refresh error:', errorText);
    throw new Error('Failed to get access token');
  }

  const data = await response.json();
  console.log('Access token obtained successfully');
  return data.access_token;
}

export async function handleOperation(operation: string, payload: any) {
  console.log(`Starting operation: ${operation}`);
  console.log('Payload:', payload);
  
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

        // Process files sequentially with delays to avoid rate limiting
        console.log('Starting sequential file uploads, total files:', files.length);
        const fileLinks = [];
        for (const file of files) {
          // Add delay between file uploads
          if (fileLinks.length > 0) {
            await delay(2000); // Wait 2 seconds between files
          }
          
          const link = await uploadFile(accessToken, file, folder.id);
          fileLinks.push(link);
        }
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
          const errorText = await response.text();
          console.error('Delete folder error:', errorText);
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

