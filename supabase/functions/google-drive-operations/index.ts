
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, token } = await req.json();
    console.log(`Processing ${operation} operation with token length: ${token?.length || 0}`);

    switch (operation) {
      case 'updateRefreshToken': {
        // Log environment variables (without revealing sensitive data)
        console.log('Project ID available:', !!Deno.env.get('PROJECT_ID'));
        console.log('Service Role Key available:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

        // Update the secret using REST API directly
        const url = `https://api.supabase.com/v1/projects/${Deno.env.get('PROJECT_ID')}/secrets`;
        console.log('Making request to:', url);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([
            {
              name: 'GOOGLE_REFRESH_TOKEN',
              value: token
            }
          ])
        });

        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response body:', responseText);

        if (!response.ok) {
          throw new Error(`Failed to update secret: ${responseText}`);
        }

        console.log('Token updated successfully');
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error('Operation failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
