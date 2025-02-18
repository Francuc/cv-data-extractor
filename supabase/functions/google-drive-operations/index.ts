
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_API = "https://api.supabase.com/v1";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, token } = await req.json();
    console.log(`Processing ${operation} operation`);

    switch (operation) {
      case 'updateRefreshToken': {
        // Update the secret using Supabase Management API
        const response = await fetch(
          `${SUPABASE_API}/projects/${Deno.env.get('PROJECT_ID')}/secrets`,
          {
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
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Failed to update secret:', errorText);
          throw new Error('Failed to update secret');
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
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
