import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { google } from "https://deno.land/x/googleapis@v118.0.0/googleapis.ts";

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

    const drive = google.drive({ version: 'v3', auth });

    if (operation === 'createSheet') {
      console.log('Creating new Google Sheet')
      return new Response(
        JSON.stringify({ sheetId: 'mock-sheet-id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (operation === 'uploadFile') {
      console.log('Uploading file to Google Drive')
      if (!files) {
        throw new Error('No file data provided')
      }

      // Create a folder with current date and time
      const now = new Date();
      const folderName = `CV_Files_${now.toISOString().replace(/[:.]/g, '-')}`;
      
      console.log('Creating folder:', folderName);
      
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      };

      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id'
      });

      const folderId = folder.data.id;

      // Make the folder accessible via link
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      const { fileName, fileContent, mimeType } = files;
      
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      };

      const media = {
        mimeType: mimeType,
        body: fileContent
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
      });

      // Make the file accessible via link
      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return new Response(
        JSON.stringify({ 
          fileId: file.data.id,
          webViewLink: file.data.webViewLink,
          folderLink: `https://drive.google.com/drive/folders/${folderId}`
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