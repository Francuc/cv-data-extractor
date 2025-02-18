
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { handleOperation } from './operationsHandler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { operation, files, ...payload } = await req.json();
    console.log(`Processing ${operation} operation`);

    if (operation === 'uploadFiles') {
      if (!files || !Array.isArray(files)) {
        throw new Error('No files data provided or invalid format');
      }
      console.log('Processing upload for', files.length, 'files');
      payload.files = files;
    }

    const result = await handleOperation(operation, payload);
    console.log(`Operation ${operation} completed successfully:`, result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Operation failed:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});
