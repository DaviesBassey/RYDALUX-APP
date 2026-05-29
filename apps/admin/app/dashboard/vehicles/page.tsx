'use client';

import { useEffect, useState } from 'react';
import { api, VehicleItem } from '@/lib/api';
import { PageHeader } from '@/lib/components/PageHeader';
import { maskEmail } from '@/lib/utils/formats';

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
      <PageHeader
        title="Vehicle Approval"
        description="Review and approve vehicle registrations"
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
          <div className="p-10 text-center text-gray-600">No pending vehicles.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-6 font-semibold text-gray-700">Driver</th>
                <th className="text-left py-3 px-6 font-semibold text-gray-700">Vehicle</th>
                <th className="text-left py-3 px-6 font-semibold text-gray-700">Details</th>
                <th className="text-right py-3 px-6 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-6">
                    <div className="font-medium text-gray-900">
                      {item.driverProfile.user.firstName} {item.driverProfile.user.lastName}
                    </div>
                    <div className="text-xs text-gray-600">{maskEmail(item.driverProfile.user.email)}</div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="font-medium text-gray-900">{item.make} {item.model}</div>
                    <div className="text-xs text-gray-600">{item.registrationNumber}</div>
                  </td>
                  <td className="py-3 px-6 text-sm text-gray-600">
                    {item.year} · {item.color} · {item.capacity} seats · {item.vehicleType}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <button
                      onClick={() => review(item.id, 'approve')}
                      disabled={actionId === item.id}
                      className="btn-primary px-3 py-1 text-xs mr-2 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => review(item.id, 'reject')}
                      disabled={actionId === item.id}
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
  );
}
