import { NextRequest, NextResponse } from 'next/server';
import { FhirClient } from '@/lib/fhir-client';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    console.log('Processing FHIR upload for user:', params.userId);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string;

    if (!file) {
      console.error('No file provided in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('Received file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      format: format
    });

    // Get the file content
    const content = await file.text();
    console.log('File content preview:', content.substring(0, 200));

    // Create FHIR client with the token from the request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];
    console.log('Got valid authorization token');
    
    const fhirClient = new FhirClient(token);

    // Parse and validate the resource
    try {
      if (format === 'json') {
        console.log('Processing JSON FHIR resource');
        const resource = JSON.parse(content);
        
        // Validate resource type
        if (!resource.resourceType) {
          throw new Error('Invalid FHIR resource: missing resourceType');
        }

        // Log resource details
        if (resource.resourceType === 'Bundle') {
          console.log('Processing Bundle:', {
            type: resource.type,
            entries: resource.entry?.length || 0
          });
        } else {
          console.log('Processing single resource:', {
            resourceType: resource.resourceType,
            id: resource.id
          });
        }

        // Create on FHIR server - the client will handle Bundles appropriately
        const result = await fhirClient.create(resource);
        console.log('Successfully created resource:', {
          resourceType: result.resourceType,
          type: result.type,
          entries: result.entry?.length || 0
        });
        return NextResponse.json(result);
      } else if (format === 'xml') {
        console.log('Processing XML FHIR resource');
        // For XML, we'll let the FHIR server handle validation
        // Just check for basic FHIR namespace
        if (!content.includes('xmlns="http://hl7.org/fhir"')) {
          throw new Error('Invalid FHIR XML: missing FHIR namespace');
        }
        // Send as is, the FHIR server will parse it
        const result = await fhirClient.create(content, 'xml');
        console.log('Successfully created resource:', result);
        return NextResponse.json(result);
      } else {
        throw new Error('Unsupported format');
      }
    } catch (error) {
      console.error('FHIR validation/creation error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid FHIR resource format' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 