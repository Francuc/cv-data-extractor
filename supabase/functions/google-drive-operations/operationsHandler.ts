import { corsHeaders, getAccessToken, createFolder, uploadFile } from './googleDriveUtils.ts';

export async function handleDeleteFolder(folderId: string) {
  const access_token = await getAccessToken();
  
  const deleteResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${access_token}`,
    },
  });

  if (!deleteResponse.ok) {
    const errorText = await deleteResponse.text();
    throw new Error(`Failed to delete folder: ${errorText}`);
  }

  return { message: 'Folder deleted successfully' };
}

export async function handleUploadFiles(files: any[]) {
  console.log('Starting batch file upload process');
  
  const access_token = await getAccessToken();

  // Create a folder for the batch
  const now = new Date();
  const folderName = `CV_Batch_${now.toISOString().replace(/[:.]/g, '-')}`;
  const folder = await createFolder(access_token, folderName);

  // Upload all files to the folder
  const uploadedFiles = await Promise.all(
    files.map(file => uploadFile(access_token, file, folder.id))
  );

  return { 
    fileLinks: uploadedFiles,
    folderLink: `https://drive.google.com/drive/folders/${folder.id}`
  };
}