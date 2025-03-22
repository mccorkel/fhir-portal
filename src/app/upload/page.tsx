"use client";

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { FileUpload } from '@/components/FileUpload';

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Upload Health Records</h1>
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600 mb-6">
            Upload your health records in PDF, JPG, or PNG format. These records will be securely stored and accessible through your health portal.
          </p>
          <FileUpload />
        </div>
      </div>
    </ProtectedRoute>
  );
}
