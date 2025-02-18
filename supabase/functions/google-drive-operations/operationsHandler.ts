
import { createClient } from 'npm:@supabase/supabase-js';
import { google } from 'npm:googleapis';

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');

const _supabaseAdmin = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  {
    auth: {
      persistSession: false
    }
  }
);

const SCOPES = ['https://www.googleapis.com/auth/drive'];

const auth = new google.auth.JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

export const createFolder = async (folderName: string): Promise<string> => {
  try {
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

    return `https://drive.google.com/drive/folders/${folder.data.id}`;
  } catch (error) {
    console.error('Create folder error:', error);
    throw new Error('Failed to create folder');
  }
};

export const uploadFiles = async (files: any[]): Promise<{ fileLinks: string[], folderLink: string }> => {
  try {
    // Create a folder for the batch
    const folderName = `CV_Uploads_${new Date().toISOString()}`;
    const folderLink = await createFolder(folderName);
    const folderId = folderLink.split('/').pop();

    const uploadPromises = files.map(async (fileData) => {
      const { fileName, fileContent, mimeType } = fileData;
      
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

      return file.data.webViewLink || '';
    });

    const fileLinks = await Promise.all(uploadPromises);
    
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
    await drive.files.delete({
      fileId: folderId,
    });
    return { success: true };
  } catch (error) {
    console.error('Delete folder error:', error);
    throw new Error('Failed to delete folder');
  }
};

export const updateRefreshToken = async (token: string): Promise<{ success: boolean }> => {
  try {
    await _supabaseAdmin.functions.config.set([
      { name: 'GOOGLE_REFRESH_TOKEN', value: token }
    ]);
    return { success: true };
  } catch (error) {
    console.error('Error updating refresh token:', error);
    throw new Error('Failed to update refresh token');
  }
};

export const handleOperation = async (operation: string, payload: any): Promise<any> => {
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
