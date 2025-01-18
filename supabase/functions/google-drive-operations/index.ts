import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { handleUploadFiles, handleDeleteFolder } from './operationsHandler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('Received request:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    const { operation, files, folderId } = await req.json();
    console.log('Operation:', operation);

    switch (operation) {
      case 'uploadFiles':
        return await handleUploadFiles(files, corsHeaders);
      case 'deleteFolder':
        return await handleDeleteFolder(folderId, corsHeaders);
      default:
        console.error('Invalid operation:', operation);
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 400 
          }
        );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        details: 'Failed to process the request'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
})