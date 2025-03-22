"use client";

import { useEffect, useState } from 'react';
import { useAzureAuth } from '@/lib/azure-auth-context';
import { FhirClient } from '@/lib/fhir-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FhirResource {
  resourceType: string;
  id: string;
  [key: string]: any;
}

export default function HealthRecordsClient() {
  const { getServiceToken } = useAzureAuth();
  const [patients, setPatients] = useState<FhirResource[]>([]);
  const [observations, setObservations] = useState<FhirResource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    async function fetchResources() {
      try {
        setError(null);
        setLoading(true);

        // Get the service token
        const token = await getServiceToken();
        if (!token) {
          throw new Error('Failed to get service token');
        }

        // Create FHIR client with token
        const client = new FhirClient(token);

        // First, try to get metadata to check if we can connect
        try {
          const metadataResponse = await client.request('metadata');
          console.log('FHIR metadata:', metadataResponse);
          setMetadata(metadataResponse);
        } catch (error) {
          console.error('Failed to fetch FHIR metadata:', error);
        }

        // Try to get all resources first
        try {
          const allResources = await client.searchAll();
          console.log('All resources:', allResources);
        } catch (error) {
          console.error('Failed to fetch all resources:', error);
        }

        // Fetch FHIR resources with parameters
        const [patientsData, observationsData] = await Promise.all([
          client.searchPatient({
            '_summary': 'true',
            '_count': '100'
          }),
          client.searchObservation({
            '_summary': 'true',
            '_count': '100'
          })
        ]);

        setPatients(patientsData.entry?.map((e: any) => e.resource) || []);
        setObservations(observationsData.entry?.map((e: any) => e.resource) || []);
      } catch (error) {
        console.error('Failed to fetch FHIR resources:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch health records');
      } finally {
        setLoading(false);
      }
    }

    fetchResources();
  }, [getServiceToken]);

  if (loading) {
    return <div>Loading health records...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-red-500">Error: {error}</div>
        {metadata && (
          <div className="text-sm text-gray-600">
            <h3 className="font-semibold">FHIR Server Information:</h3>
            <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {patients.length === 0 && observations.length === 0 && (
        <div className="text-amber-600 bg-amber-50 p-4 rounded">
          No health records found. This could mean:
          <ul className="list-disc ml-6 mt-2">
            <li>No records have been uploaded yet</li>
            <li>You don't have permission to access the records</li>
            <li>The FHIR service is empty</li>
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Patients ({patients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {patients.length === 0 ? (
            <p className="text-gray-600">No patients found</p>
          ) : (
            <ul className="space-y-2">
              {patients.map((patient) => (
                <li key={patient.id}>
                  {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observations ({observations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {observations.length === 0 ? (
            <p className="text-gray-600">No observations found</p>
          ) : (
            <ul className="space-y-2">
              {observations.map((observation) => (
                <li key={observation.id}>
                  {observation.code?.text || observation.code?.coding?.[0]?.display}:{' '}
                  {observation.valueQuantity
                    ? `${observation.valueQuantity.value} ${observation.valueQuantity.unit}`
                    : observation.valueString}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {metadata && (
        <Card>
          <CardHeader>
            <CardTitle>FHIR Server Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 