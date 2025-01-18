export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function getAccessToken() {
  try {
    const serviceAccount = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT") || "");
    
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id
    };

    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedClaim = btoa(JSON.stringify(claim));
    
    const signatureInput = `${encodedHeader}.${encodedClaim}`;
    
    const privateKey = serviceAccount.private_key
      .replace('-----BEGIN PRIVATE KEY-----\n', '')
      .replace('\n-----END PRIVATE KEY-----\n', '')
      .replace(/\n/g, '');
    
    const binaryKey = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
    
    const privateKeyObject = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
    
    const encoder = new TextEncoder();
    const signatureBytes = encoder.encode(signatureInput);
    
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKeyObject,
      signatureBytes
    );
    
    const jwt = `${encodedHeader}.${encodedClaim}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error(`Failed to exchange token: ${errorData}`);
    }

    const { access_token } = await tokenResponse.json();
    return access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}