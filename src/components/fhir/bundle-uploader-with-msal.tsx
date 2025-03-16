"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context-with-msal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Upload, CheckCircle, AlertCircle } from "lucide-react";

export function BundleUploaderWithMsal() {
  const { isAuthenticated, acquireFhirToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file || !isAuthenticated) return;

    try {
      setUploading(true);
      setUploadStatus('idle');
      setErrorMessage('');

      // Read the file content
      const fileContent = await file.text();
      
      // Parse the JSON to validate it's a FHIR bundle
      let bundleJson;
      try {
        bundleJson = JSON.parse(fileContent);
        
        // Basic validation that it's a FHIR bundle
        if (!bundleJson.resourceType || bundleJson.resourceType !== "Bundle") {
          throw new Error("The file is not a valid FHIR bundle. It must have a resourceType of 'Bundle'.");
        }
      } catch (error) {
        setUploadStatus('error');
        setErrorMessage("Invalid JSON format or not a valid FHIR bundle.");
        setUploading(false);
        return;
      }

      // Get token for FHIR API access
      const token = await acquireFhirToken();
      
      if (!token) {
        setUploadStatus('error');
        setErrorMessage("Failed to acquire authentication token. Please try signing in again.");
        setUploading(false);
        return;
      }

      // Upload the bundle to our API
      const response = await fetch('/api/fhir/Bundle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json',
          'Authorization': `Bearer ${token}`
        },
        body: fileContent,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload FHIR bundle");
      }

      const result = await response.json();
      setUploadStatus('success');
      console.log('Upload successful:', result);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Upload FHIR Bundle</CardTitle>
        <CardDescription>
          Upload your FHIR bundle file to store in your health record
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bundle-file">FHIR Bundle File (JSON)</Label>
            <Input
              id="bundle-file"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </div>
          
          {uploadStatus === 'success' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Upload Successful</AlertTitle>
              <AlertDescription className="text-green-700">
                Your FHIR bundle has been successfully uploaded.
              </AlertDescription>
            </Alert>
          )}
          
          {uploadStatus === 'error' && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Upload Failed</AlertTitle>
              <AlertDescription className="text-red-700">
                {errorMessage || "There was an error uploading your FHIR bundle."}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleUpload} 
          disabled={!file || uploading || !isAuthenticated}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Bundle
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
