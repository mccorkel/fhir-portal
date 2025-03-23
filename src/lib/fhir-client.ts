import { useAzureAuth } from './azure-auth-context';

const MAX_BUNDLE_ENTRIES = 400; // Setting to 400 to be safe, under the 500 limit

export class FhirClient {
  private baseUrl: string;
  private token: string;

  constructor(token: string) {
    this.baseUrl = process.env.NEXT_PUBLIC_FHIR_SERVICE_URL || '';
    this.token = token;
    console.log('FHIR Client initialized:', {
      baseUrl: this.baseUrl,
      hasToken: !!this.token
    });
  }

  async request(path: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${path}`;
    console.log('Making FHIR request:', {
      url,
      method: options.method || 'GET',
      headers: {
        ...options.headers,
        'Authorization': 'Bearer [hidden]',
      }
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/fhir+json',
          ...options.headers,
        },
        mode: 'cors',
      });

      console.log('FHIR response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('FHIR request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          cors: {
            allowOrigin: response.headers.get('access-control-allow-origin'),
            allowMethods: response.headers.get('access-control-allow-methods'),
            allowHeaders: response.headers.get('access-control-allow-headers')
          }
        });
        throw new Error(`FHIR request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('FHIR request successful:', {
        resourceType: data.resourceType,
        total: data.total,
        entry: data.entry?.length,
        bundle: data.type,
        link: data.link
      });

      // Log the first resource if available
      if (data.entry?.[0]?.resource) {
        console.log('Sample resource:', {
          resourceType: data.entry[0].resource.resourceType,
          id: data.entry[0].resource.id,
          meta: data.entry[0].resource.meta
        });
      }

      return data;
    } catch (error) {
      console.error('FHIR request error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'Unknown type',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async getAllPages(initialResponse: any): Promise<any> {
    let allEntries = [...(initialResponse.entry || [])];
    let nextUrl = initialResponse.link?.find((link: any) => link.relation === 'next')?.url;

    console.log('Pagination info:', {
      initialCount: allEntries.length,
      hasNextPage: !!nextUrl,
      total: initialResponse.total
    });

    while (nextUrl) {
      console.log('Fetching next page:', nextUrl);
      const nextResponse = await fetch(nextUrl, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/fhir+json',
        },
        mode: 'cors',
      });

      if (!nextResponse.ok) {
        throw new Error(`Failed to fetch next page: ${nextResponse.status}`);
      }

      const nextData = await nextResponse.json();
      allEntries = [...allEntries, ...(nextData.entry || [])];
      nextUrl = nextData.link?.find((link: any) => link.relation === 'next')?.url;

      console.log('Page fetched:', {
        newCount: nextData.entry?.length || 0,
        totalSoFar: allEntries.length,
        hasMorePages: !!nextUrl
      });
    }

    return {
      ...initialResponse,
      entry: allEntries
    };
  }

  async searchPatient(params: Record<string, string> = {}) {
    console.log('Searching for patients with params:', params);
    const queryString = new URLSearchParams(params).toString();
    const path = `Patient${queryString ? '?' + queryString : ''}`;
    const initialResponse = await this.request(path);
    return this.getAllPages(initialResponse);
  }

  async searchObservation(params: Record<string, string> = {}) {
    console.log('Searching for observations with params:', params);
    const queryString = new URLSearchParams(params).toString();
    const path = `Observation${queryString ? '?' + queryString : ''}`;
    const initialResponse = await this.request(path);
    return this.getAllPages(initialResponse);
  }

  async getPatient(id: string) {
    console.log('Getting patient:', id);
    return this.request(`Patient/${id}`);
  }

  async getObservation(id: string) {
    console.log('Getting observation:', id);
    return this.request(`Observation/${id}`);
  }

  private chunkBundle(bundle: any): any[] {
    if (!bundle.entry || bundle.entry.length <= MAX_BUNDLE_ENTRIES) {
      return [bundle];
    }

    console.log(`Splitting bundle of ${bundle.entry.length} entries into chunks of ${MAX_BUNDLE_ENTRIES}`);
    
    const chunks: any[] = [];
    for (let i = 0; i < bundle.entry.length; i += MAX_BUNDLE_ENTRIES) {
      const chunkEntries = bundle.entry.slice(i, i + MAX_BUNDLE_ENTRIES);
      chunks.push({
        ...bundle,
        entry: chunkEntries
      });
    }

    console.log(`Created ${chunks.length} bundle chunks`);
    return chunks;
  }

  async create(resource: any, format: 'json' | 'xml' = 'json') {
    console.log('Creating FHIR resource:', {
      resourceType: resource.resourceType,
      format,
      resource: JSON.stringify(resource).substring(0, 200) + '...'
    });
    
    // If this is a Bundle with type 'transaction', use the transaction endpoint
    if (resource.resourceType === 'Bundle' && resource.type === 'transaction') {
      return this.transaction(resource);
    }
    
    const contentType = format === 'json' ? 'application/fhir+json' : 'application/fhir+xml';
    const body = format === 'json' ? JSON.stringify(resource) : resource;
    
    return this.request(resource.resourceType || '', {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body,
    });
  }

  async transaction(bundle: any) {
    if (bundle.resourceType !== 'Bundle' || bundle.type !== 'transaction') {
      throw new Error('Invalid transaction bundle: must be a Bundle resource with type "transaction"');
    }

    console.log('Processing transaction bundle:', {
      resourceType: bundle.resourceType,
      type: bundle.type,
      entries: bundle.entry?.length || 0
    });

    // Split bundle into chunks if needed
    const chunks = this.chunkBundle(bundle);
    
    if (chunks.length > 1) {
      console.log(`Processing ${chunks.length} bundle chunks sequentially`);
      
      const results = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1} of ${chunks.length} (${chunks[i].entry.length} entries)`);
        const result = await this.request('', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/fhir+json',
          },
          body: JSON.stringify(chunks[i]),
        });
        results.push(result);
      }

      // Combine results into a single bundle
      const combinedResult = {
        resourceType: 'Bundle',
        type: 'transaction-response',
        entry: results.flatMap(r => r.entry || [])
      };

      console.log('Successfully processed all chunks:', {
        totalChunks: chunks.length,
        totalEntries: combinedResult.entry.length
      });

      return combinedResult;
    }

    // If no chunking needed, process normally
    return this.request('', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
      },
      body: JSON.stringify(bundle),
    });
  }

  async searchAll() {
    console.log('Searching all resource types...');
    return this.request('');
  }

  // Add more FHIR resource methods as needed
} 