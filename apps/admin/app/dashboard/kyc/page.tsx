'use client';

import { useEffect, useState } from 'react';
import { api, KycItem } from '@/lib/api';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatDate, maskEmail } from '@/lib/utils/formats';

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
      <PageHeader
        title="KYC Review"
        description="Review and approve pending KYC submissions"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 text-sm text-gray-600">
          Pending: {total}
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-gray-600">No pending KYC checks.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 font-semibold text-gray-700">User</th>
                <th className="text-left py-3 px-6 font-semibold text-gray-700">Submitted</th>
                <th className="text-left py-3 px-6 font-semibold text-gray-700">Provider</th>
                <th className="text-right py-3 px-6 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-6">
                    <div className="font-medium text-gray-900">
                      {item.user.firstName} {item.user.lastName}
                    </div>
                    <div className="text-xs text-gray-600">{maskEmail(item.user.email)}</div>
                  </td>
                  <td className="py-3 px-6 text-sm text-gray-600">
                    {formatDate(item.submittedAt)}
                  </td>
                  <td className="py-3 px-6 text-sm text-gray-600">
                    {item.provider || '—'}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <button
                      onClick={() => approve(item.userId)}
                      disabled={actionId === item.userId}
                      className="btn-primary px-3 py-1 text-xs disabled:opacity-60"
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
