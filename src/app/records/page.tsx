"use client";

import { PatientRecordsWithMsal as PatientRecords } from "@/components/fhir/patient-records-with-msal";
import { useAuth } from "@/lib/auth-context-with-msal";
import { Button } from "@/components/ui/button";

export default function RecordsPageWithMsal() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-2xl font-bold">Authentication Required</h1>
          <p className="text-gray-600">
            You need to be signed in to view your FHIR health records.
          </p>
          <Button onClick={login}>Sign in with Entra ID</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">My Health Records</h2>
        <p className="mb-6 text-gray-600">
          View and manage your FHIR health records. Select a patient to see their detailed information.
        </p>
        
        <PatientRecords />
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
          <h3 className="font-medium mb-2">About FHIR Resources</h3>
          <p className="text-sm text-gray-600">
            FHIR (Fast Healthcare Interoperability Resources) organizes health data into standardized resources.
            Common resource types include Patients, Observations (lab results, vital signs), Conditions (diagnoses),
            MedicationRequests (prescriptions), and Procedures (surgeries, therapies).
          </p>
        </div>
      </div>
    </div>
  );
}
