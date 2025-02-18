
import { createClient } from 'npm:@supabase/supabase-js';
import { google } from 'npm:googleapis';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize service account with proper error handling
let auth;
let drive;

try {
  const serviceAccount = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || '{}');
  
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    console.error('Invalid or missing service account credentials');
    throw new Error('Service account configuration is invalid');
  }

  auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  drive = google.drive({ version: 'v3', auth });
  
} catch (error) {
  console.error('Error initializing Google service account:', error);
  throw new Error('Failed to initialize Google Drive service');
}

const _supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  {
    auth: {
      persistSession: false
    }
  }
);

export const createFolder = async (folderName: string): Promise<string> => {
  try {
    console.log('Creating folder:', folderName);
    
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

    const folderLink = `https://drive.google.com/drive/folders/${folder.data.id}`;
    console.log('Folder created successfully:', folderLink);
    return folderLink;
  } catch (error) {
    console.error('Create folder error:', error);
    throw new Error(`Failed to create folder: ${error.message}`);
  }
};

export const uploadFiles = async (files: any[]): Promise<{ fileLinks: string[], folderLink: string }> => {
  try {
    console.log('Starting file upload process for', files.length, 'files');
    
    const folderName = `CV_Uploads_${new Date().toISOString()}`;
    const folderLink = await createFolder(folderName);
    const folderId = folderLink.split('/').pop();

    console.log('Created folder for uploads:', folderLink);

    const uploadPromises = files.map(async (fileData) => {
      const { fileName, fileContent, mimeType } = fileData;
      console.log('Processing file:', fileName);
      
      // Convert base64 to binary
      const binaryContent = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));

      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      const media = {
        mimeType: mimeType,
        body: binaryContent
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
      });

      console.log('File uploaded successfully:', fileName);
      return file.data.webViewLink || '';
    });

    const fileLinks = await Promise.all(uploadPromises);
    console.log('All files uploaded successfully');
    
    return {
      fileLinks,
      folderLink
    };
  } catch (error) {
    console.error('Upload files error:', error);
    throw error;
  }
};

export const deleteFolder = async (folderId: string): Promise<{ success: boolean }> => {
  try {
    console.log('Attempting to delete folder:', folderId);
    await drive.files.delete({
      fileId: folderId,
    });
    console.log('Folder deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Delete folder error:', error);
    throw new Error(`Failed to delete folder: ${error.message}`);
  }
};

export const updateRefreshToken = async (token: string): Promise<{ success: boolean }> => {
  try {
    console.log('Attempting to update refresh token in secrets table');
    
    // Update the token in the secrets table
    const { error: secretError } = await _supabaseAdmin
      .from('secrets')
      .upsert({
        key: 'GOOGLE_REFRESH_TOKEN',
        value: token,
        updated_at: new Date().toISOString()
      });

    if (secretError) {
      throw secretError;
    }

    console.log('Token updated successfully in secrets table');
    return { success: true };
  } catch (error) {
    console.error('Error updating refresh token:', error);
    throw new Error(`Failed to update refresh token: ${error.message}`);
  }
};

export const handleOperation = async (operation: string, payload: any): Promise<any> => {
  console.log(`Handling operation: ${operation}`);
  
  switch (operation) {
    case 'uploadFiles':
      return await uploadFiles(payload.files);
    case 'createFolder':
      return await createFolder(payload.folderName);
    case 'deleteFolder':
      return await deleteFolder(payload.folderId);
    case 'updateRefreshToken':
      return await updateRefreshToken(payload.token);
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
};

