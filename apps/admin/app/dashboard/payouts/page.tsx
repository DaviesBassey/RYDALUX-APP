'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DataTable, DataTableColumn } from '@/lib/components/DataTable';
import { StatusBadge } from '@/lib/components/StatusBadge';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatCurrency, formatDate, formatTimeAgo } from '@/lib/utils/formats';

interface Payout {
  id: string;
  reference: string;
  driverProfile: { user: { firstName: string; lastName: string } };
  amount: number | string;
  currency: string;
  status: string;
  paymentMethod: string;
  createdAt: string;
  processedAt?: string;
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 20;

  const columns: DataTableColumn<Payout>[] = [
    { key: 'reference', label: 'Reference', width: '120px' },
    {
      key: 'driverProfile',
      label: 'Driver',
      render: (profile) => `${profile?.user?.firstName || ''} ${profile?.user?.lastName || ''}`,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (amount, row) => formatCurrency(amount, (row as any).currency),
    },
    {
      key: 'paymentMethod',
      label: 'Method',
      render: (value) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'processedAt',
      label: 'Processed',
      render: (value) => value ? formatDate(value) : 'Pending',
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value) => formatTimeAgo(value),
    },
  ];

  async function loadPayouts() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPayouts(status || undefined, pageSize, currentPage * pageSize);
      setPayouts(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(0);
  }, [status]);

  useEffect(() => {
    loadPayouts();
  }, [status, currentPage]);

  return (
    <div>
      <PageHeader
        title="Driver Payouts"
        description="Monitor and manage driver payment distributions"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-48">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={payouts}
        isLoading={loading}
        error={error}
        pageSize={pageSize}
        totalCount={totalCount}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
