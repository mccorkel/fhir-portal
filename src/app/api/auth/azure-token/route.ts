import { NextResponse } from 'next/server';

// Mark as dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID;
    const fhirServiceUrl = process.env.FHIR_SERVICE_URL;

    if (!clientId || !clientSecret || !tenantId || !fhirServiceUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/token`;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      resource: fhirServiceUrl.replace(/\/$/, ''), // Remove trailing slash if present
      client_id: clientId,
      client_secret: clientSecret,
    });
    
    console.log('Token request:', {
      url: tokenEndpoint,
      params: Object.fromEntries(params.entries()),
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    // Log response headers
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to get Azure token:', error);
      return new Response(
        JSON.stringify({ error: `Failed to get Azure token: ${error}` }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the raw response text first
    const rawText = await response.text();
    console.log('Raw response text:', rawText);

    // Try to parse the JSON
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      console.error('Raw response was:', rawText);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON response from token endpoint' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!data.access_token) {
      return new Response(
        JSON.stringify({ error: 'No access token in response' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Return the token directly
    return new Response(
      JSON.stringify({ accessToken: data.access_token }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Error getting Azure token:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to get Azure token' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 