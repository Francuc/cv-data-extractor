import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { google } from "https://googleapis.deno.dev/v1/googleapis.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { operation, files } = await req.json()
    console.log(`Processing ${operation} operation`)

    // Initialize Google Auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
        redirect_uris: ["http://localhost:3000"],
      },
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });

    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });
    const sheets = google.sheets({ version: 'v4', auth: client });

    if (operation === 'createSheet') {
      console.log('Creating new Google Sheet')
      const response = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: `CV Data ${new Date().toISOString().split('T')[0]}`
          }
        }
      });
      
      return new Response(
        JSON.stringify({ sheetId: response.data.spreadsheetId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (operation === 'uploadFile') {
      console.log('Uploading file to Google Drive')
      if (!files) {
        throw new Error('No file data provided')
      }

      const { fileName, fileContent, mimeType } = files
      
      const fileMetadata = {
        name: fileName,
        mimeType: mimeType,
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
          webViewLink: file.data.webViewLink 
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