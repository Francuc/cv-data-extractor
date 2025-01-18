import { corsHeaders, getAccessToken, createFolder, uploadFile } from './googleDriveUtils.ts';

export async function handleDeleteFolder(folderId: string) {
  console.log('Starting folder deletion process for folder:', folderId);
  const access_token = await getAccessToken();
  
  const deleteResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${access_token}`,
    },
  });

  if (!deleteResponse.ok) {
    const errorText = await deleteResponse.text();
    console.error('Delete folder error:', errorText);
    throw new Error(`Failed to delete folder: ${errorText}`);
  }

  console.log('Folder deleted successfully');
  return { message: 'Folder deleted successfully' };
}

export async function handleUploadFiles(files: any[]) {
  console.log('Starting batch file upload process');
  
  try {
    const access_token = await getAccessToken();
    console.log('Successfully obtained access token');

    // Create a folder for the batch
    const now = new Date();
    const folderName = `CV_Batch_${now.toISOString().replace(/[:.]/g, '-')}`;
    console.log('Creating folder:', folderName);
    
    const folder = await createFolder(access_token, folderName);
    console.log('Folder created with ID:', folder.id);

    // Upload all files to the folder
    console.log('Starting file uploads, total files:', files.length);
    const uploadedFiles = await Promise.all(
      files.map(async (file, index) => {
        console.log(`Uploading file ${index + 1}/${files.length}: ${file.fileName}`);
        return uploadFile(access_token, file, folder.id);
      })
    );

    console.log('All files uploaded successfully');
    return { 
      fileLinks: uploadedFiles,
      folderLink: `https://drive.google.com/drive/folders/${folder.id}`
    };
  } catch (error) {
    console.error('Error in handleUploadFiles:', error);
    throw error;
  }
}