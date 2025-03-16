"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context-with-msal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";
import Link from "next/link";

type FhirResource = {
  resourceType: string;
  id: string;
  [key: string]: any;
};

export function PatientRecordsWithMsal() {
  const { isAuthenticated, acquireFhirToken, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<FhirResource[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [resources, setResources] = useState<{[key: string]: FhirResource[]}>({
    Observation: [],
    Condition: [],
    MedicationRequest: [],
    Procedure: []
  });
  
  // Fetch patients
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchPatients = async () => {
      try {
        setLoading(true);
        
        // Get token for FHIR API access
        const token = await acquireFhirToken();
        
        if (!token) {
          setError("Failed to acquire authentication token. Please try signing in again.");
          setLoading(false);
          return;
        }
        
        const response = await fetch('/api/fhir/Patient', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/fhir+json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch patients');
        }
        
        const data = await response.json();
        
        // Handle FHIR bundle response
        if (data.resourceType === 'Bundle' && data.entry) {
          const patientResources = data.entry
            .filter((entry: any) => entry.resource && entry.resource.resourceType === 'Patient')
            .map((entry: any) => entry.resource);
          
          setPatients(patientResources);
          
          // Select first patient by default if available
          if (patientResources.length > 0) {
            setSelectedPatient(patientResources[0].id);
          }
        } else {
          setPatients([]);
        }
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError('Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, [isAuthenticated, acquireFhirToken]);
  
  // Fetch resources for selected patient
  useEffect(() => {
    if (!isAuthenticated || !selectedPatient) return;
    
    const fetchResourcesForPatient = async (resourceType: string) => {
      try {
        // Get token for FHIR API access
        const token = await acquireFhirToken();
        
        if (!token) {
          setError("Failed to acquire authentication token. Please try signing in again.");
          return;
        }
        
        const response = await fetch(`/api/fhir/${resourceType}?patient=${selectedPatient}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/fhir+json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${resourceType}`);
        }
        
        const data = await response.json();
        
        // Handle FHIR bundle response
        if (data.resourceType === 'Bundle' && data.entry) {
          const resources = data.entry
            .filter((entry: any) => entry.resource)
            .map((entry: any) => entry.resource);
          
          setResources(prev => ({
            ...prev,
            [resourceType]: resources
          }));
        } else {
          setResources(prev => ({
            ...prev,
            [resourceType]: []
          }));
        }
      } catch (err) {
        console.error(`Error fetching ${resourceType}:`, err);
        setError(`Failed to load ${resourceType} data`);
      }
    };
    
    // Fetch different resource types
    const resourceTypes = ['Observation', 'Condition', 'MedicationRequest', 'Procedure'];
    resourceTypes.forEach(type => fetchResourcesForPatient(type));
    
  }, [isAuthenticated, selectedPatient, acquireFhirToken]);
  
  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please sign in to view your health records.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading patient records...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Error Loading Records</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (patients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Patient Records Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No patient records were found in your FHIR data. Try uploading a FHIR bundle first.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      {loading ? (
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4">
            {patients.map(patient => (
              <Card 
                key={patient.id}
                className={`cursor-pointer transition-colors ${
                  selectedPatient === patient.id ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => setSelectedPatient(patient.id)}
              >
                <CardContent className="p-4">
                  <h3 className="font-medium">
                    {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
                  </h3>
                  <p className="text-sm text-gray-500">
                    DOB: {patient.birthDate || 'Unknown'} 
                    {patient.gender ? ` • ${patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}` : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {selectedPatient && (
            <Tabs defaultValue="observations">
              <TabsList className="mb-4">
                <TabsTrigger value="observations">Observations</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="medications">Medications</TabsTrigger>
                <TabsTrigger value="procedures">Procedures</TabsTrigger>
              </TabsList>
              
              <TabsContent value="observations">
                <ResourceList 
                  title="Observations" 
                  resources={resources.Observation} 
                  emptyMessage="No observations found for this patient."
                  renderResource={(resource) => (
                    <div>
                      <strong>{resource.code?.text || 'Unknown Observation'}</strong>
                      <p>{resource.valueQuantity?.value} {resource.valueQuantity?.unit}</p>
                      <p className="text-sm text-gray-500">{resource.effectiveDateTime}</p>
                    </div>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="conditions">
                <ResourceList 
                  title="Conditions" 
                  resources={resources.Condition}
                  emptyMessage="No conditions found for this patient."
                  renderResource={(resource) => (
                    <div>
                      <strong>{resource.code?.text || 'Unknown Condition'}</strong>
                      <p className="text-sm text-gray-500">
                        {resource.onsetDateTime ? `Onset: ${resource.onsetDateTime}` : ''}
                      </p>
                    </div>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="medications">
                <ResourceList 
                  title="Medications" 
                  resources={resources.MedicationRequest}
                  emptyMessage="No medications found for this patient."
                  renderResource={(resource) => (
                    <div>
                      <strong>{resource.medicationCodeableConcept?.text || 'Unknown Medication'}</strong>
                      <p>{resource.dosageInstruction?.[0]?.text}</p>
                    </div>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="procedures">
                <ResourceList 
                  title="Procedures" 
                  resources={resources.Procedure}
                  emptyMessage="No procedures found for this patient."
                  renderResource={(resource) => (
                    <div>
                      <strong>{resource.code?.text || 'Unknown Procedure'}</strong>
                      <p className="text-sm text-gray-500">{resource.performedDateTime}</p>
                    </div>
                  )}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component to display lists of resources
function ResourceList({ 
  title, 
  resources, 
  emptyMessage, 
  renderResource 
}: { 
  title: string; 
  resources: FhirResource[]; 
  emptyMessage: string;
  renderResource: (resource: FhirResource) => React.ReactNode;
}) {
  if (resources.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-gray-500">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {resources.map(resource => (
          <Card key={resource.id}>
            <CardContent className="p-4">
              {renderResource(resource)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
