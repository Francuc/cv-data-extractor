export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function getAccessToken() {
  try {
    const serviceAccount = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT") || "");
    
    // Create JWT
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id
    };

    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // Encode header and claim
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedClaim = btoa(JSON.stringify(claim));
    
    // Create signature
    const signatureInput = `${encodedHeader}.${encodedClaim}`;
    
    // Format private key by removing header, footer, and newlines
    const privateKey = serviceAccount.private_key
      .replace('-----BEGIN PRIVATE KEY-----\n', '')
      .replace('\n-----END PRIVATE KEY-----\n', '')
      .replace(/\n/g, '');
    
    // Decode base64 private key
    const binaryKey = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
    
    // Import private key
    const privateKeyObject = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
    
    const encoder = new TextEncoder();
    const signatureBytes = encoder.encode(signatureInput);
    
    // Sign the input
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKeyObject,
      signatureBytes
    );
    
    // Create JWT
    const jwt = `${encodedHeader}.${encodedClaim}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
    
    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error(`Failed to exchange token: ${errorData}`);
    }

    const { access_token } = await tokenResponse.json();
    return access_token;
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
    return folder;
  } catch (error) {
    console.error('Error in createFolder:', error);
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
    
    await setPermissions(access_token, uploadedFile.id);
    return uploadedFile.webViewLink;
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}