const FHIR_BASE_URL = "https://tigercareworkspace-tigercare-test.fhir.azurehealthcareapis.com";

export class FhirClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${FHIR_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Accept': 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
      },
    });

    if (!response.ok) {
      throw new Error(`FHIR API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async searchPatient(params: Record<string, string> = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/Patient?${searchParams.toString()}`);
  }

  async getPatient(id: string) {
    return this.request(`/Patient/${id}`);
  }

  async searchObservation(params: Record<string, string> = {}) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/Observation?${searchParams.toString()}`);
  }

  async getObservation(id: string) {
    return this.request(`/Observation/${id}`);
  }

  // Add more FHIR resource methods as needed
} 