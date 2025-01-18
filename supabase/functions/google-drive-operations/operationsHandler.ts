import { getAccessToken, createFolder } from './googleDriveUtils.ts';

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
    const uploadPromises = files.map(async (file) => {
      console.log(`Uploading file: ${file.fileName}`);
      const fileLink = await uploadFile(access_token, file, folder.id);
      return fileLink;
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

async function uploadFile(access_token: string, file: any, folderId: string) {
  console.log('Uploading file:', file.fileName);
  
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
          'Authorization': `Bearer ${access_token}`,
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