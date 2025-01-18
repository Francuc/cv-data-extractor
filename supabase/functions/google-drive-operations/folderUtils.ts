import { getAccessToken } from './authUtils.ts';

export async function createFolder(access_token: string, folderName: string) {
  console.log('Creating folder:', folderName);
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [Deno.env.get('GOOGLE_DRIVE_FOLDER_ID') || '']
  };

  try {
    const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(folderMetadata),
    });

    if (!folderResponse.ok) {
      const errorText = await folderResponse.text();
      console.error('Folder creation failed with status:', folderResponse.status);
      console.error('Error response:', errorText);
      
      if (folderResponse.status === 403) {
        throw new Error(`API access denied. Please ensure the Google Drive API is enabled in your Google Cloud Console. Error details: ${errorText}`);
      }
      
      throw new Error(`Failed to create folder: ${errorText}`);
    }

    const folder = await folderResponse.json();
    console.log('Folder created with ID:', folder.id);
    
    // Set public permissions first
    await setPermissions(access_token, folder.id);
    
    // Set editor permissions for the target user
    await setEditorPermissions(access_token, folder.id);
    
    return folder;
  } catch (error) {
    console.error('Error in createFolder:', error);
    throw error;
  }
}

export async function setEditorPermissions(access_token: string, fileId: string) {
  const editorEmail = 'zuluetadawn26@gmail.com';
  console.log(`Setting editor permissions for ${editorEmail} on file/folder: ${fileId}`);
  
  try {
    const editorPermissionBody = {
      role: 'writer',
      type: 'user',
      emailAddress: editorEmail
    };

    console.log('Creating editor permission with body:', JSON.stringify(editorPermissionBody));

    const editorResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editorPermissionBody),
    });

    if (!editorResponse.ok) {
      const errorText = await editorResponse.text();
      console.error('Failed to set editor permission. Status:', editorResponse.status);
      console.error('Error response:', errorText);
      throw new Error(`Failed to set editor permission: ${errorText}`);
    }

    console.log('Successfully set editor permission');
  } catch (error) {
    console.error('Error in setEditorPermissions:', error);
    throw error;
  }
}

export async function setPermissions(access_token: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to set permissions: ${errorText}`);
  }
}