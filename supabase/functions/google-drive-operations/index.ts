import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from './googleDriveUtils.ts';
import { handleUploadFiles } from './operationsHandler.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, files } = await req.json();
    console.log(`Processing ${operation} operation`);

    if (operation === 'uploadFiles') {
      if (!files || !Array.isArray(files)) {
        throw new Error('No files data provided or invalid format');
      }

      console.log('Processing upload for', files.length, 'files');
      const result = await handleUploadFiles(files);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    throw new Error(`Unknown operation: ${operation}`);

  } catch (error) {
    console.error('Operation failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});