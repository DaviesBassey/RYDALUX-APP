'use client';

import { useEffect, useState } from 'react';
import { api, KycItem } from '@/lib/api';

export default function KycReviewPage() {
  const [items, setItems] = useState<KycItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPendingKyc();
      setItems(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function approve(userId: string) {
    setActionId(userId);
    try {
      await api.approveKyc(userId);
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
      <h1 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 700 }}>KYC Review</h1>
      {error && <div style={{ marginBottom: 16, padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 8 }}>{error}</div>}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#6b7280' }}>
          Pending: {total}
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No pending KYC checks.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>User</th>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Submitted</th>
                <th style={{ textAlign: 'left', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Provider</th>
                <th style={{ textAlign: 'right', padding: '12px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 500 }}>
                      {item.user.firstName} {item.user.lastName}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{item.user.email}</div>
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                    {new Date(item.submittedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                    {item.provider || '—'}
                  </td>
                  <td style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                    <button
                      onClick={() => approve(item.userId)}
                      disabled={actionId === item.userId}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#111827',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        opacity: actionId === item.userId ? 0.6 : 1,
                      }}
                    >
                      {actionId === item.userId ? 'Approving…' : 'Approve'}
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
