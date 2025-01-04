import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from './googleDriveUtils.ts';
import { handleDeleteFolder, handleUploadFiles } from './operationsHandler.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, files, folderId } = await req.json();
    console.log(`Processing ${operation} operation`);

    if (operation === 'deleteFolder') {
      if (!folderId) {
        throw new Error('No folder ID provided');
      }

      console.log('Deleting folder:', folderId);
      const result = await handleDeleteFolder(folderId);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (operation === 'uploadFiles') {
      if (!files || !Array.isArray(files)) {
        throw new Error('No files data provided or invalid format');
      }

      const result = await handleUploadFiles(files);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown operation: ${operation}`);

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});