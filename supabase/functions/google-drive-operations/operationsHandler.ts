import { createFolder, uploadFile, getAccessToken, setPermissions } from './googleDriveUtils.ts'

export async function handleUploadFiles(files: any[], corsHeaders: any) {
  try {
    console.log('Starting file upload process...');
    const access_token = await getAccessToken();
    console.log('Got access token');
    
    // Create a folder for this batch of files
    const folderName = `CV_Upload_${new Date().toISOString().slice(0, 10)}`;
    console.log('Creating folder:', folderName);
    const folder = await createFolder(access_token, folderName);
    console.log('Created folder:', folder.id);
    
    // Make the folder accessible
    console.log('Setting folder permissions');
    await setPermissions(access_token, folder.id);
    
    // Upload all files and collect their links
    console.log('Starting file uploads');
    const fileLinks = await Promise.all(
      files.map(async (file) => {
        console.log('Uploading file:', file.fileName);
        return uploadFile(access_token, file, folder.id);
      })
    );
    
    console.log('All files uploaded successfully');
    
    return new Response(
      JSON.stringify({
        fileLinks,
        folderLink: `https://drive.google.com/drive/folders/${folder.id}`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );
  } catch (error) {
    console.error('Error in handleUploadFiles:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        details: 'Failed to upload files to Google Drive'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
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
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );
  } catch (error) {
    console.error('Error in handleDeleteFolder:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        details: 'Failed to delete folder from Google Drive'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
}