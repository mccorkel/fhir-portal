"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import HealthRecordsClient from './client';

export default function HealthRecordsPage() {
  return (
    <ProtectedRoute>
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Health Records</h1>
        <HealthRecordsClient />
      </div>
    </ProtectedRoute>
  );
} 