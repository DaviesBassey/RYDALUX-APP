'use client';

import { useEffect, useState } from 'react';
import { api, VehicleItem } from '@/lib/api';

export default function VehiclesPage() {
  const [items, setItems] = useState<VehicleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPendingVehicles();
      setItems(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function review(vehicleId: string, action: 'approve' | 'reject') {
    setActionId(vehicleId);
    try {
      await api.reviewVehicle(vehicleId, action);
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
      <h1 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 700 }}>Vehicle Approval</h1>
      {error && <div style={{ marginBottom: 16, padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 8 }}>{error}</div>}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#6b7280' }}>
          Pending: {total}
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No pending vehicles.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Driver</th>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Vehicle</th>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Details</th>
                <th style={{ textAlign: 'right', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 500 }}>
                      {item.driverProfile.user.firstName} {item.driverProfile.user.lastName}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{item.driverProfile.user.email}</div>
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 500 }}>{item.make} {item.model}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{item.registrationNumber}</div>
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                    {item.year} · {item.color} · {item.capacity} seats · {item.vehicleType}
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                    <button
                      onClick={() => review(item.id, 'approve')}
                      disabled={actionId === item.id}
                      style={{ marginRight: 8, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#111827', color: '#fff', fontSize: 13, cursor: 'pointer', opacity: actionId === item.id ? 0.6 : 1 }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review(item.id, 'reject')}
                      disabled={actionId === item.id}
                      style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer', opacity: actionId === item.id ? 0.6 : 1 }}
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
  );
}
