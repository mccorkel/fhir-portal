import { NextRequest, NextResponse } from "next/server";
import { headers } from 'next/headers';

// This is a utility function to handle FHIR API requests with client credentials
export async function handleFhirRequest(
  req: NextRequest,
  endpoint: string,
  method: string = "GET",
  body?: any
) {
  try {
    // Get token from our token endpoint using absolute URL
    const host = headers().get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const tokenUrl = `${protocol}://${host}/api/auth/token`;
    
    const tokenResponse = await fetch(tokenUrl, {
      headers: {
        'Cookie': req.headers.get('cookie') || '',
      },
    });
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || !tokenData.accessToken) {
      console.error("Failed to acquire access token");
      return NextResponse.json(
        { error: "Failed to acquire access token" },
        { status: 401 }
      );
    }

    // Use the FHIR service URL from environment variable
    const fhirServiceUrl = process.env.NEXT_PUBLIC_FHIR_SERVICE_URL?.replace(/\/$/, '') || "";
    
    if (!fhirServiceUrl) {
      return NextResponse.json(
        { error: "FHIR service URL not configured" },
        { status: 500 }
      );
    }

    // Make the request to the FHIR service
    const response = await fetch(`${fhirServiceUrl}/${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${tokenData.accessToken}`,
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      console.error('FHIR service error:', {
        status: response.status,
        statusText: response.statusText,
      });
      
      return NextResponse.json(
        { error: `FHIR service error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error handling FHIR request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
