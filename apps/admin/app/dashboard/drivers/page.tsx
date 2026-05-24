'use client';

import { useEffect, useState } from 'react';
import { api, DriverDocumentItem, VehicleDocumentItem } from '@/lib/api';

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
      <h1 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 700 }}>Driver Documents</h1>
      {error && <div style={{ marginBottom: 16, padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 8 }}>{error}</div>}

      <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Driver Documents Pending ({totalDriver})</h2>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 32 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
        ) : driverDocs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No pending driver documents.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Driver</th>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Type</th>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Submitted</th>
                <th style={{ textAlign: 'right', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {driverDocs.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 500 }}>{doc.user.firstName} {doc.user.lastName}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{doc.user.email}</div>
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>{doc.documentType}</td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                    <button onClick={() => review(doc.id, 'approve')} disabled={actionId === doc.id} style={{ marginRight: 8, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#111827', color: '#fff', fontSize: 13, cursor: 'pointer', opacity: actionId === doc.id ? 0.6 : 1 }}>Approve</button>
                    <button onClick={() => review(doc.id, 'reject')} disabled={actionId === doc.id} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer', opacity: actionId === doc.id ? 0.6 : 1 }}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Vehicle Documents Pending ({totalVehicle})</h2>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
        ) : vehicleDocs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No pending vehicle documents.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Vehicle</th>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Type</th>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Submitted</th>
                <th style={{ textAlign: 'right', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicleDocs.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 500 }}>{doc.vehicle.make} {doc.vehicle.model}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{doc.vehicle.registrationNumber}</div>
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>{doc.documentType}</td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                    <button onClick={() => review(doc.id, 'approve')} disabled={actionId === doc.id} style={{ marginRight: 8, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#111827', color: '#fff', fontSize: 13, cursor: 'pointer', opacity: actionId === doc.id ? 0.6 : 1 }}>Approve</button>
                    <button onClick={() => review(doc.id, 'reject')} disabled={actionId === doc.id} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer', opacity: actionId === doc.id ? 0.6 : 1 }}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
