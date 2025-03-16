import { NextRequest, NextResponse } from "next/server";

// Helper function for server-side logging
function log(type: 'info' | 'error', message: string, data?: any) {
  const prefix = '[FHIR API]';
  const timestamp = new Date().toISOString();
  if (data) {
    console[type](`${prefix} [${timestamp}] ${message}`, data);
  } else {
    console[type](`${prefix} [${timestamp}] ${message}`);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const searchParams = req.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    const token = req.headers.get('authorization')?.split(' ')[1];
    
    log('info', 'Received request:', {
      path,
      queryString,
      hasToken: !!token,
      headers: Object.fromEntries(req.headers.entries())
    });
    
    if (!token) {
      log('error', 'No authorization token provided');
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    const fhirServiceUrl = process.env.NEXT_PUBLIC_FHIR_SERVICE_URL?.replace(/\/$/, '');
    if (!fhirServiceUrl) {
      log('error', 'FHIR service URL not configured');
      return NextResponse.json(
        { error: "FHIR service URL not configured" },
        { status: 500 }
      );
    }

    const url = `${fhirServiceUrl}/${path}${queryString}`;
    log('info', 'Forwarding request to:', { url });

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'FHIR service error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    log('info', 'FHIR service response successful', {
      status: response.status,
      resourceType: data.resourceType,
      count: data.total || (data.entry?.length || 0)
    });

    return NextResponse.json(data);
  } catch (error) {
    log('error', 'Error handling FHIR request:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const token = req.headers.get('authorization')?.split(' ')[1];
    
    log('info', 'Received POST request:', {
      path,
      hasToken: !!token,
      contentType: req.headers.get('content-type'),
      headers: Object.fromEntries(req.headers.entries())
    });
    
    if (!token) {
      log('error', 'No authorization token provided');
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    const fhirServiceUrl = process.env.NEXT_PUBLIC_FHIR_SERVICE_URL?.replace(/\/$/, '');
    if (!fhirServiceUrl) {
      log('error', 'FHIR service URL not configured');
      return NextResponse.json(
        { error: "FHIR service URL not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    
    // Additional validation for Bundle uploads
    if (path === 'Bundle') {
      log('info', 'Validating Bundle:', {
        resourceType: body.resourceType,
        type: body.type,
        entryCount: body.entry?.length || 0
      });

      if (body.resourceType !== 'Bundle') {
        log('error', 'Invalid Bundle:', { resourceType: body.resourceType });
        return NextResponse.json(
          { error: "Resource must be a FHIR Bundle" },
          { status: 400 }
        );
      }
    }

    const url = `${fhirServiceUrl}/${path}`;
    log('info', 'Forwarding POST request to:', { 
      url,
      resourceType: body.resourceType,
      contentLength: JSON.stringify(body).length
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'FHIR service error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url,
        headers: Object.fromEntries(response.headers.entries())
      });
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    log('info', 'FHIR service POST response successful', {
      status: response.status,
      resourceType: data.resourceType,
      responseLength: JSON.stringify(data).length
    });

    return NextResponse.json(data);
  } catch (error) {
    log('error', 'Error handling FHIR POST request:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 