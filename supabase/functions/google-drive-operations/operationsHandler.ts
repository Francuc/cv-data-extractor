
import { google } from 'npm:googleapis';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize OAuth2 client with proper error handling
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

export async function createFolder(folderName: string) {
  try {
    console.log('Creating folder:', folderName);
    
    const drive = await initializeGoogleDrive();
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });

    if (!folder.data.id) {
      throw new Error('Folder ID not found');
    }

    console.log('Folder created with ID:', folder.data.id);
    return folder.data;
  } catch (error) {
    console.error('Create folder error:', error);
    throw error;
  }
}

async function uploadFile(drive: any, file: any, folderId: string) {
  console.log(`Uploading file: ${file.fileName}`);
  
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

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(fileMetadata) +
      delimiter +
      'Content-Type: ' + file.mimeType + '\r\n\r\n';

    const requestParts = [
      new TextEncoder().encode(multipartRequestBody),
      bytes,
      new TextEncoder().encode(close_delim)
    ];
    
    const requestBody = new Uint8Array(
      requestParts.reduce((acc, part) => acc + part.length, 0)
    );
    
    let offset = 0;
    for (const part of requestParts) {
      requestBody.set(part, offset);
      offset += part.length;
    }

    const fileResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await drive.auth.getAccessToken()).token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: requestBody,
      }
    );

    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      console.error('Upload failed:', errorText);
      throw new Error(`Failed to upload file: ${errorText}`);
    }

    const uploadedFile = await fileResponse.json();
    console.log('File uploaded with ID:', uploadedFile.id);
    return uploadedFile.webViewLink;
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}

export async function handleOperation(operation: string, payload: any) {
  console.log(`Handling operation: ${operation}`);
  
  switch (operation) {
    case 'uploadFiles': {
      console.log('Starting batch file upload process');
      const { files } = payload;
      
      try {
        const drive = await initializeGoogleDrive();
        
        // Create a folder for the batch
        const now = new Date();
        const folderName = `CV_Batch_${now.toISOString().replace(/[:.]/g, '-')}`;
        console.log('Creating folder:', folderName);
        
        const folder = await createFolder(folderName);
        console.log('Folder created with ID:', folder.id);

        // Upload all files to the folder
        console.log('Starting file uploads, total files:', files.length);
        const uploadPromises = files.map(async (file: any) => {
          return await uploadFile(drive, file, folder.id);
        });

        const fileLinks = await Promise.all(uploadPromises);
        console.log('All files uploaded successfully');

        return { 
          fileLinks,
          folderLink: `https://drive.google.com/drive/folders/${folder.id}`
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
        const drive = await initializeGoogleDrive();
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
