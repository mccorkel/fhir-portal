"use client";

import { ProtectedRoute } from '@/components/ProtectedRoute';
import HealthRecordsClient from '../health-records/client';

export default function RecordsPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My Health Records</h1>
        <div className="max-w-6xl mx-auto">
          <HealthRecordsClient />
        </div>
      </div>
    </ProtectedRoute>
  );
}
