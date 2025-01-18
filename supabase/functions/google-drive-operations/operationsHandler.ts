import { createFolder, uploadFile, getAccessToken, setPermissions } from './googleDriveUtils.ts'

export async function handleUploadFiles(files: any[], corsHeaders: any) {
  try {
    console.log('Starting file upload process...');
    const access_token = await getAccessToken();
    
    // Create a folder for this batch of files
    const folderName = `CV_Upload_${new Date().toISOString().slice(0, 10)}`;
    const folder = await createFolder(access_token, folderName);
    console.log('Created folder:', folder.id);
    
    // Make the folder accessible
    await setPermissions(access_token, folder.id);
    
    // Upload all files and collect their links
    const fileLinks = await Promise.all(
      files.map(file => uploadFile(access_token, file, folder.id))
    );
    
    console.log('All files uploaded successfully');
    
    return new Response(
      JSON.stringify({
        fileLinks,
        folderLink: `https://drive.google.com/drive/folders/${folder.id}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handleUploadFiles:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}

export async function handleDeleteFolder(folderId: string, corsHeaders: any) {
  try {
    console.log('Starting folder deletion process...');
    const access_token = await getAccessToken();
    
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete folder: ${response.statusText}`);
    }

    console.log('Folder deleted successfully');
    
    return new Response(
      JSON.stringify({ message: 'Folder deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handleDeleteFolder:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}