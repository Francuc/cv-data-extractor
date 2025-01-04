import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const credentials = {
      client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
      redirect_uris: ["http://localhost:3000"],
    };

    if (!credentials.client_id || !credentials.client_secret) {
      throw new Error("Missing Google credentials");
    }

    if (operation === 'createSheet') {
      console.log('Creating new Google Sheet')
      // For now, return a mock response since we need to fix the Google API integration
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

      // For now, return a mock response since we need to fix the Google API integration
      return new Response(
        JSON.stringify({ 
          fileId: 'mock-file-id',
          webViewLink: 'https://mock-drive-link.com' 
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