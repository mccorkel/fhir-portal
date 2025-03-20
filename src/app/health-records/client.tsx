"use client";

import { useState } from 'react';
import { User } from '@/lib/cosmos-db';
import { FastenConnectButton } from '@/components/FastenConnectButton';

interface FhirData {
  patients?: any;
  observations?: any;
  error?: string;
}

interface ClientHealthRecordsProps {
  initialUser: User;
  fhirData: FhirData | null;
}

export function ClientHealthRecords({ initialUser, fhirData }: ClientHealthRecordsProps) {
  const [user, setUser] = useState(initialUser);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Health Records</h1>

      {/* FHIR Data Section */}
      {fhirData && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">FHIR Health Records</h2>
          {fhirData.error ? (
            <div className="text-red-500">{fhirData.error}</div>
          ) : (
            <div className="space-y-6">
              {/* Patients */}
              {fhirData.patients?.entry?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Patient Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {fhirData.patients.entry.map((entry: any) => (
                      <div key={entry.resource.id} className="p-4 border rounded-lg">
                        <p>Name: {entry.resource.name?.[0]?.text || 'N/A'}</p>
                        <p>Gender: {entry.resource.gender || 'N/A'}</p>
                        <p>Birth Date: {entry.resource.birthDate || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observations */}
              {fhirData.observations?.entry?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Observations</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {fhirData.observations.entry.map((entry: any) => (
                      <div key={entry.resource.id} className="p-4 border rounded-lg">
                        <p className="font-medium">{entry.resource.code?.text || 'Unknown Observation'}</p>
                        <p>Value: {entry.resource.valueQuantity?.value || 'N/A'} {entry.resource.valueQuantity?.unit || ''}</p>
                        <p className="text-sm text-gray-500">
                          Date: {new Date(entry.resource.effectiveDateTime).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fasten Connections Section */}
      <div className="space-y-8">
        <h2 className="text-xl font-semibold">Connected Health Sources</h2>
        {user.fastenConnections && user.fastenConnections.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {user.fastenConnections.map((connection) => (
              <div
                key={connection.orgConnectionId}
                className="p-4 border rounded-lg shadow-sm"
              >
                <h3 className="font-medium">{connection.platformType}</h3>
                <p className="text-sm text-gray-500">
                  Connected: {new Date(connection.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  Status: {connection.status}
                </p>
                {connection.lastExport && (
                  <p className="text-sm text-gray-500">
                    Last Export: {new Date(connection.lastExport.exportedAt).toLocaleDateString()}
                    ({connection.lastExport.status})
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            No health records connected yet. Click below to connect your first health record source.
          </p>
        )}

        <div className="mt-8">
          <FastenConnectButton />
        </div>
      </div>
    </div>
  );
} 