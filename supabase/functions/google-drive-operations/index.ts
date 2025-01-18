import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { handleUploadFiles, handleDeleteFolder } from './operationsHandler.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Log incoming request details
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

    let response;
    switch (operation) {
      case 'uploadFiles':
        response = await handleUploadFiles(files, corsHeaders);
        break;
      case 'deleteFolder':
        response = await handleDeleteFolder(folderId, corsHeaders);
        break;
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

    // Ensure CORS headers are added to the response
    const headers = response.headers;
    Object.keys(corsHeaders).forEach(key => {
      headers.set(key, corsHeaders[key]);
    });

    return response;

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