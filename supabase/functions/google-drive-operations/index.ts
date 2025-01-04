import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { google } from "https://esm.sh/@googleapis/drive@8.0.0"

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

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
        redirect_uris: ["http://localhost:3000"],
      },
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });

    console.log("Auth initialized");

    const drive = google.drive({ version: 'v3', auth });
    console.log("Drive client created");

    if (operation === 'createSheet') {
      console.log('Creating new Google Sheet')
      return new Response(
        JSON.stringify({ sheetId: 'mock-sheet-id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (operation === 'uploadFile') {
      console.log('Starting file upload process')
      if (!files) {
        throw new Error('No file data provided')
      }

      // Create a folder with current date and time
      const now = new Date();
      const folderName = `CV_Files_${now.toISOString().replace(/[:.]/g, '-')}`;
      
      console.log('Creating folder:', folderName);
      
      try {
        const folderMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        };

        const folder = await drive.files.create({
          requestBody: folderMetadata,
          fields: 'id'
        });

        console.log('Folder created with ID:', folder.data.id);

        const folderId = folder.data.id;

        // Make the folder accessible via link
        await drive.permissions.create({
          fileId: folderId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });

        console.log('Folder permissions set');

        const { fileName, fileContent, mimeType } = files;
        
        const fileMetadata = {
          name: fileName,
          parents: [folderId]
        };

        console.log('Uploading file:', fileName);

        const media = {
          mimeType: mimeType,
          body: fileContent
        };

        const file = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, webViewLink'
        });

        console.log('File uploaded with ID:', file.data.id);

        // Make the file accessible via link
        await drive.permissions.create({
          fileId: file.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });

        console.log('File permissions set');

        return new Response(
          JSON.stringify({ 
            fileId: file.data.id,
            webViewLink: file.data.webViewLink,
            folderLink: `https://drive.google.com/drive/folders/${folderId}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (uploadError) {
        console.error('Error during file upload:', uploadError);
        throw uploadError;
      }
    }

    throw new Error(`Unknown operation: ${operation}`)

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})