import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { operation, files } = await req.json()
    console.log(`Processing ${operation} operation`)

    if (operation === 'getAuthUrl') {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const redirectUri = 'http://localhost:5173/auth/callback';
      const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
      
      return new Response(
        JSON.stringify({ authUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (operation === 'getRefreshToken') {
      const { code } = await req.json();
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
          redirect_uri: 'http://localhost:5173/auth/callback',
          grant_type: 'authorization_code',
          code,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log('Refresh token obtained:', tokenData.refresh_token);
      
      return new Response(
        JSON.stringify({ refresh_token: tokenData.refresh_token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token using refresh token
    const credentials = {
      client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
      refresh_token: Deno.env.get("GOOGLE_REFRESH_TOKEN"),
    };

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.client_id!,
        client_secret: credentials.client_secret!,
        refresh_token: credentials.refresh_token!,
        grant_type: 'refresh_token',
      }),
    });

    const { access_token } = await tokenResponse.json();
    
    if (operation === 'uploadFiles') {
      console.log('Starting batch file upload process')
      if (!files || !Array.isArray(files)) {
        throw new Error('No files data provided or invalid format')
      }

      // Create a single folder for the batch
      const now = new Date();
      const folderName = `CV_Batch_${now.toISOString().replace(/[:.]/g, '-')}`;
      
      console.log('Creating folder:', folderName);
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(folderMetadata),
      });

      const folder = await folderResponse.json();
      console.log('Folder created with ID:', folder.id);

      // Set folder permissions to anyone with the link can view
      await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}/permissions`, {
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

      // Upload all files to the same folder
      const uploadedFiles = await Promise.all(files.map(async ({ fileName, fileContent, mimeType }) => {
        console.log('Uploading file:', fileName);
        
        try {
          const binaryStr = atob(fileContent);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          // Create file metadata
          const fileMetadata = {
            name: fileName,
            parents: [folder.id]
          };

          // Create multipart request
          const boundary = '-------314159265358979323846';
          const delimiter = "\r\n--" + boundary + "\r\n";
          const close_delim = "\r\n--" + boundary + "--";

          const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(fileMetadata) +
            delimiter +
            'Content-Type: ' + mimeType + '\r\n\r\n';

          // Combine metadata and file content
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

          // Upload file to Google Drive
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

          const file = await fileResponse.json();
          console.log('File uploaded with ID:', file.id);

          // Set file permissions to anyone with the link can view
          await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
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

          return file.webViewLink;
        } catch (error) {
          console.error('Error processing file:', error);
          throw new Error(`Failed to process file ${fileName}: ${error.message}`);
        }
      }));

      return new Response(
        JSON.stringify({ 
          fileLinks: uploadedFiles,
          folderLink: `https://drive.google.com/drive/folders/${folder.id}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unknown operation: ${operation}`)

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})