import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { handleUploadFiles, handleDeleteFolder } from './operationsHandler.ts'

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
    const { operation, files, folderId } = await req.json()

    switch (operation) {
      case 'uploadFiles':
        return await handleUploadFiles(files, corsHeaders)
      case 'deleteFolder':
        return await handleDeleteFolder(folderId, corsHeaders)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})