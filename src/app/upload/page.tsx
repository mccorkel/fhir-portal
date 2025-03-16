"use client";

import { BundleUploaderWithMsal as BundleUploader } from "@/components/fhir/bundle-uploader-with-msal";
import { useAuth } from "@/lib/auth-context-with-msal";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function UploadPageWithMsal() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-2xl font-bold">Authentication Required</h1>
          <p className="text-gray-600">
            You need to be signed in to upload FHIR bundles.
          </p>
          <Button onClick={login}>Sign in with Entra ID</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">FHIR Portal</h1>
          <nav className="flex gap-4">
            <Link href="/" className="text-blue-600 hover:underline">
              Home
            </Link>
            <Link href="/upload" className="text-blue-600 hover:underline font-bold">
              Upload
            </Link>
            <Link href="/records" className="text-blue-600 hover:underline">
              My Records
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Upload FHIR Bundle</h2>
          <p className="mb-6 text-gray-600">
            Upload your FHIR bundle files to store and manage your health records. 
            The file must be in valid FHIR Bundle JSON format.
          </p>
          
          <BundleUploader />
          
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
            <h3 className="font-medium mb-2">About FHIR Bundles</h3>
            <p className="text-sm text-gray-600">
              FHIR (Fast Healthcare Interoperability Resources) bundles are collections of healthcare resources
              that represent patient data in a standardized format. They can include patient information,
              observations, conditions, medications, and more.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
