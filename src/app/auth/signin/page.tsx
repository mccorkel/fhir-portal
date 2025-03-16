"use client";

import React from 'react';
import { useAuth } from '@/lib/auth-context-with-msal';

export default function SignIn() {
  const { login } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">Welcome to TigerCare FHIR Portal</h1>
          <p className="mb-8 text-lg text-gray-600">Please sign in to access your health records</p>
          <button
            onClick={login}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign in with Entra ID
          </button>
        </div>
      </div>
    </div>
  );
} 