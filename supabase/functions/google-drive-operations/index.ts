import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { handleUploadFiles, handleDeleteFolder } from './operationsHandler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Log incoming request details for debugging
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
    // Parse request body
    const body = await req.json();
    console.log('Request body:', body);
    
    const { operation, files, folderId } = body;
    console.log('Operation:', operation);

    // Handle different operations
    switch (operation) {
      case 'uploadFiles':
        console.log('Processing uploadFiles operation with', files?.length, 'files');
        return await handleUploadFiles(files, corsHeaders);
      case 'deleteFolder':
        console.log('Processing deleteFolder operation for folder:', folderId);
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