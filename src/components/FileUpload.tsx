'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAzureAuth } from '@/lib/azure-auth-context';
import { useCurrentUser } from '@/lib/current-user-context';

export function FileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getServiceToken } = useAzureAuth();
  const { user } = useCurrentUser();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      setError(null);
      setSuccess(null);

      // Get Azure token
      const token = await getServiceToken();
      if (!token) {
        throw new Error('Failed to get Azure token');
      }

      const formData = new FormData();
      formData.append('file', file);

      // Validate file content based on type
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const content = await file.text();
        try {
          const json = JSON.parse(content);
          if (!json.resourceType) {
            throw new Error('Invalid FHIR resource: missing resourceType');
          }
          formData.append('resourceType', json.resourceType);
          formData.append('format', 'json');
        } catch (error) {
          throw new Error('Invalid JSON file or not a valid FHIR resource');
        }
      } else if (file.type === 'application/xml' || file.name.endsWith('.xml')) {
        const content = await file.text();
        try {
          // Basic XML validation - we'll let the server do the full FHIR validation
          if (!content.includes('xmlns="http://hl7.org/fhir"')) {
            throw new Error('Invalid FHIR XML: missing FHIR namespace');
          }
          formData.append('format', 'xml');
        } catch (error) {
          throw new Error('Invalid XML file or not a valid FHIR resource');
        }
      } else {
        throw new Error('Unsupported file format. Please upload a FHIR JSON or XML file.');
      }

      const response = await fetch('/api/users/' + user.id + '/records', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess('File uploaded successfully');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept=".json,.xml"
          className="hidden"
          disabled={isUploading}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Choose File'}
        </Button>
        <span className="text-sm text-gray-500">
          Supported formats: FHIR JSON, FHIR XML
        </span>
      </div>
      
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      {success && (
        <p className="text-green-500 text-sm">{success}</p>
      )}
    </div>
  );
} 