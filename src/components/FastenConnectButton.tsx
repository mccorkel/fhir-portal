"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context-with-msal';
import { useCurrentUser } from '@/lib/current-user-context';
import { Button } from './ui/button';

export function FastenConnectButton() {
  const { refreshUser } = useCurrentUser();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/fasten/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate connection');
      }

      const { url } = await response.json();
      
      // Refresh user data before redirecting
      await refreshUser();
      
      window.location.href = url;
    } catch (error) {
      console.error('Failed to initiate Fasten Connect:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        variant="primary"
        size="lg"
      >
        {isConnecting ? 'Connecting...' : 'Connect Health Records'}
      </Button>
      
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
} 