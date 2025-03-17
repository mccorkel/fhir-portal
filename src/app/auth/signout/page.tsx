"use client";

import React from 'react';
import { useAuth } from '../../../lib/auth-context-with-msal';

export default function SignOut() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">Signing Out</h1>
          <p className="mb-8 text-lg text-gray-600">Please wait while we sign you out...</p>
        </div>
      </div>
    </div>
  );
} 