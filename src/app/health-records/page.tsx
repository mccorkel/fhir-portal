import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/cosmos-db";
import { FhirClient } from "@/lib/fhir-client";
import { ClientHealthRecords } from "./client";

export default async function HealthRecordsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const user = await getUser(session.user.id);
  if (!user) {
    throw new Error("User not found");
  }

  let fhirData = null;
  if (session.accessToken) {
    try {
      const fhirClient = new FhirClient(session.accessToken);
      // Fetch patient and their observations
      const [patientData, observationData] = await Promise.all([
        fhirClient.searchPatient(),
        fhirClient.searchObservation()
      ]);
      fhirData = {
        patients: patientData,
        observations: observationData
      };
    } catch (error) {
      console.error('Failed to fetch FHIR data:', error);
      // We'll pass the error to the client component to display
      fhirData = { error: 'Failed to fetch health records' };
    }
  }

  return <ClientHealthRecords initialUser={user} fhirData={fhirData} />;
} 