
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { google } from 'npm:googleapis';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function initializeGoogleDrive() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      Deno.env.get('GOOGLE_CLIENT_ID'),
      Deno.env.get('GOOGLE_CLIENT_SECRET')
    );

    oauth2Client.setCredentials({
      refresh_token: Deno.env.get('GOOGLE_REFRESH_TOKEN')
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
  } catch (error) {
    console.error('Error initializing Google Drive:', error);
    throw new Error('Failed to initialize Google Drive service');
  }
}

async function createFolder(drive: any, folderName: string) {
  try {
    console.log('Creating folder:', folderName);
    
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, webViewLink',  // Request both id and webViewLink
    });

    if (!folder.data.id) {
      throw new Error('Folder ID not found in response');
    }

    // Make the folder accessible via link
    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    console.log('Folder created with ID:', folder.data.id);
    return folder.data;
  } catch (error) {
    console.error('Create folder error:', error);
    throw error;
  }
}

async function uploadFile(drive: any, file: any, folderId: string) {
  console.log(`Uploading file: ${file.fileName} to folder: ${folderId}`);
  
  try {
    const binaryStr = atob(file.fileContent);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const fileMetadata = {
      name: file.fileName,
      parents: [folderId]
    };

    // Use the Drive API's upload method
    const media = {
      mimeType: file.mimeType,
      body: bytes
    };

    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',  // Request both id and webViewLink
    });

    if (!uploadedFile.data.id) {
      throw new Error('File ID not found in response');
    }

    // Make the file accessible via link
    await drive.permissions.create({
      fileId: uploadedFile.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    console.log('File uploaded successfully:', uploadedFile.data);
    return uploadedFile.data.webViewLink;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

export async function handleOperation(operation: string, payload: any) {
  console.log(`Handling operation: ${operation}`);
  
  const drive = await initializeGoogleDrive();
  
  switch (operation) {
    case 'uploadFiles': {
      console.log('Starting batch file upload process');
      const { files } = payload;
      
      try {
        // Create a folder for the batch
        const now = new Date();
        const folderName = `CV_Batch_${now.toISOString().replace(/[:.]/g, '-')}`;
        console.log('Creating folder:', folderName);
        
        const folder = await createFolder(drive, folderName);
        console.log('Folder created:', folder);

        // Upload all files to the folder
        console.log('Starting file uploads, total files:', files.length);
        const uploadPromises = files.map((file: any) => uploadFile(drive, file, folder.id));

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
        await drive.files.delete({
          fileId: folderId
        });
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
