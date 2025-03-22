"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/current-user-context';
import { useAzureAuth } from '@/lib/azure-auth-context';

export function FastenConnectButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useCurrentUser();
  const { getServiceToken } = useAzureAuth();

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get Azure token for FHIR service
      const azureToken = await getServiceToken();
      if (!azureToken) {
        throw new Error('Failed to get Azure token');
      }

      const response = await fetch('/api/fasten/initiate', {
        headers: {
          'Authorization': `Bearer ${azureToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate connection');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to connect:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect');
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div>
      <Button
        onClick={handleConnect}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Connecting...' : 'Connect Health Records'}
      </Button>
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
} 