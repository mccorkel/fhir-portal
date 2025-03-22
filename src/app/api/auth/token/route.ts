export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";

// Helper function for server-side logging
function log(type: 'info' | 'error', message: string, data?: any) {
  const prefix = '[FHIR Token API]';
  const timestamp = new Date().toISOString();
  if (data) {
    console[type](`${prefix} [${timestamp}] ${message}`, data);
  } else {
    console[type](`${prefix} [${timestamp}] ${message}`);
  }
}

export async function GET() {
  try {
    const fhirUrl = process.env.NEXT_PUBLIC_FHIR_SERVICE_URL?.replace(/\/$/, '') || "";
    const clientId = process.env.AZURE_AD_CLIENT_ID || "";
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET || "";
    const tenantId = process.env.AZURE_AD_TENANT_ID || "";
    
    log('info', 'Token request configuration:', {
      fhirUrl,
      clientId: clientId ? '✓ present' : '✗ missing',
      clientSecret: clientSecret ? '✓ present' : '✗ missing',
      tenantId,
    });
    
    if (!fhirUrl || !clientId || !clientSecret || !tenantId) {
      log('error', 'Missing configuration:', {
        fhirUrl: !fhirUrl,
        clientId: !clientId,
        clientSecret: !clientSecret,
        tenantId: !tenantId,
      });
      return NextResponse.json(
        { error: "Missing required configuration" },
        { status: 500 }
      );
    }

    // Prepare the token request body - matching the working example with both resource and scope
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      resource: fhirUrl,
      client_id: clientId,
      client_secret: clientSecret,
      scope: `${fhirUrl}/.default`
    });

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/token`;
    log('info', 'Making token request to:', { url: tokenUrl });
    log('info', 'Request body:', {
      grant_type: 'client_credentials',
      resource: fhirUrl,
      client_id: clientId,
      client_secret: '***[secret]***',
      scope: `${fhirUrl}/.default`
    });

    // Request token from Azure AD
    const tokenResponse = await fetch(
      tokenUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log('error', 'Token request failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        headers: Object.fromEntries(tokenResponse.headers.entries())
      });
      return NextResponse.json(
        { error: "Failed to acquire access token", details: errorText },
        { status: 401 }
      );
    }

    const data = await tokenResponse.json();
    log('info', 'Token acquired successfully:', {
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      resource: data.resource,
      accessTokenLength: data.access_token?.length || 0
    });

    return NextResponse.json({ accessToken: data.access_token });
  } catch (error) {
    log('error', 'Error acquiring token:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Failed to acquire token', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 