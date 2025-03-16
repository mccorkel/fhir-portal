"use client";

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm text-center">
        <h1 className="text-4xl font-bold mb-8">Authentication Error</h1>
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-8" role="alert">
          <p className="font-bold">Error</p>
          <p>{error || 'An unknown error occurred during authentication.'}</p>
        </div>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 transition-colors"
        >
          ← Return to Home
        </Link>
      </div>
    </div>
  );
} 