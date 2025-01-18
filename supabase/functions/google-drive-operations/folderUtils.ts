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
    
    // Set the owner for the folder
    await setOwner(access_token, folder.id);
    
    return folder;
  } catch (error) {
    console.error('Error in createFolder:', error);
    throw error;
  }
}

export async function setOwner(access_token: string, fileId: string) {
  const ownerEmail = 'zuluetadawn26@gmail.com';
  console.log(`Setting owner to ${ownerEmail} for file/folder: ${fileId}`);
  
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'owner',
        type: 'user',
        emailAddress: ownerEmail,
        transferOwnership: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to set owner:', errorText);
      // We don't throw here as we want the process to continue even if ownership transfer fails
    } else {
      console.log(`Successfully set owner to ${ownerEmail}`);
    }
  } catch (error) {
    console.error('Error setting owner:', error);
    // We don't throw here as we want the process to continue even if ownership transfer fails
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