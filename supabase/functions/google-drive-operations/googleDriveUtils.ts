export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function getAccessToken() {
  const credentials = {
    client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
    client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
    refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN"),
    grant_type: 'refresh_token',
  };

  console.log('Starting token refresh process...');
  console.log('Credentials check:', {
    hasClientId: !!credentials.client_id,
    hasClientSecret: !!credentials.client_secret,
    hasRefreshToken: !!credentials.refresh_token,
  });

  if (!credentials.client_id || !credentials.client_secret || !credentials.refresh_token) {
    console.error('Missing required Google credentials');
    throw new Error('Missing required Google credentials. Please check all required secrets are set.');
  }

  try {
    console.log('Making token refresh request to Google...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const responseText = await tokenResponse.text();
    console.log('Token response status:', tokenResponse.status);
    console.log('Token response:', responseText);

    if (!tokenResponse.ok) {
      throw new Error(`Failed to refresh token: ${responseText}`);
    }

    const tokenData = JSON.parse(responseText);
    console.log('Successfully obtained new access token');
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

export async function createFolder(access_token: string, folderName: string) {
  console.log('Creating folder:', folderName);
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
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

    const responseText = await folderResponse.text();
    console.log('Folder creation response:', responseText);

    if (!folderResponse.ok) {
      console.error('Folder creation failed:', responseText);
      throw new Error(`Failed to create folder: ${responseText}`);
    }

    const folder = JSON.parse(responseText);
    console.log('Folder created with ID:', folder.id);
    return folder;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

export async function uploadFile(access_token: string, file: any, folderId: string) {
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