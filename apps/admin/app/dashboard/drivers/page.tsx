'use client';

import { useEffect, useState } from 'react';
import { api, DriverDocumentItem, VehicleDocumentItem } from '@/lib/api';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatDate, maskEmail } from '@/lib/utils/formats';

export default function DriverDocumentsPage() {
  const [driverDocs, setDriverDocs] = useState<DriverDocumentItem[]>([]);
  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocumentItem[]>([]);
  const [totalDriver, setTotalDriver] = useState(0);
  const [totalVehicle, setTotalVehicle] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPendingDriverDocuments();
      setDriverDocs(res.driverDocuments.items);
      setVehicleDocs(res.vehicleDocuments.items);
      setTotalDriver(res.driverDocuments.total);
      setTotalVehicle(res.vehicleDocuments.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function review(documentId: string, action: 'approve' | 'reject') {
    setActionId(documentId);
    try {
      await api.reviewDriverDocument(documentId, action);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Driver Documents"
        description="Review and approve driver and vehicle document submissions"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Driver Documents Pending ({totalDriver})</h2>
        <div className="card">
          {loading ? (
            <div className="p-10 text-center text-gray-600">Loading…</div>
          ) : driverDocs.length === 0 ? (
            <div className="p-10 text-center text-gray-600">No pending driver documents.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Driver</th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Submitted</th>
                  <th className="text-right py-3 px-6 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {driverDocs.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-6">
                      <div className="font-medium text-gray-900">{doc.user.firstName} {doc.user.lastName}</div>
                      <div className="text-xs text-gray-600">{maskEmail(doc.user.email)}</div>
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600">{doc.documentType}</td>
                    <td className="py-3 px-6 text-sm text-gray-600">{formatDate(doc.createdAt)}</td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => review(doc.id, 'approve')}
                        disabled={actionId === doc.id}
                        className="btn-primary px-3 py-1 text-xs mr-2 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => review(doc.id, 'reject')}
                        disabled={actionId === doc.id}
                        className="btn-secondary px-3 py-1 text-xs disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Vehicle Documents Pending ({totalVehicle})</h2>
        <div className="card">
          {loading ? (
            <div className="p-10 text-center text-gray-600">Loading…</div>
          ) : vehicleDocs.length === 0 ? (
            <div className="p-10 text-center text-gray-600">No pending vehicle documents.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Vehicle</th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-700">Submitted</th>
                  <th className="text-right py-3 px-6 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicleDocs.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-6">
                      <div className="font-medium text-gray-900">{doc.vehicle.make} {doc.vehicle.model}</div>
                      <div className="text-xs text-gray-600">{doc.vehicle.registrationNumber}</div>
                    </td>
                    <td className="py-3 px-6 text-sm text-gray-600">{doc.documentType}</td>
                    <td className="py-3 px-6 text-sm text-gray-600">{formatDate(doc.createdAt)}</td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => review(doc.id, 'approve')}
                        disabled={actionId === doc.id}
                        className="btn-primary px-3 py-1 text-xs mr-2 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => review(doc.id, 'reject')}
                        disabled={actionId === doc.id}
                        className="btn-secondary px-3 py-1 text-xs disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
