import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">TigerCare FHIR Portal</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <Link href="/records" className="group rounded-lg border border-gray-300 px-5 py-4 transition-colors hover:border-blue-500 hover:bg-blue-50">
            <h2 className="mb-3 text-2xl font-semibold">
              Patient Records{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-70">
              View and manage patient health records.
            </p>
          </Link>

          <Link href="/upload" className="group rounded-lg border border-gray-300 px-5 py-4 transition-colors hover:border-blue-500 hover:bg-blue-50">
            <h2 className="mb-3 text-2xl font-semibold">
              Upload FHIR Bundle{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-70">
              Upload FHIR bundles to the system.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
} 