'use client';

import { useEffect, useState } from 'react';
import { api, normalizeListResponse, PaymentItem } from '@/lib/api';
import { DataTable, DataTableColumn } from '@/lib/components/DataTable';
import { StatusBadge } from '@/lib/components/StatusBadge';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatCurrency, formatDate, formatTimeAgo } from '@/lib/utils/formats';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 20;

  const columns: DataTableColumn<PaymentItem>[] = [
    { key: 'reference', label: 'Reference', width: '130px' },
    {
      key: 'amount',
      label: 'Amount',
      render: (amount, row) => formatCurrency(amount, row.currency),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'provider',
      label: 'Provider',
      render: (value) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    {
      key: 'trip',
      label: 'Trip',
      render: (trip) => trip?.reference || 'No trip',
    },
    {
      key: 'user',
      label: 'User',
      render: (user) => user?.displayName || user?.email || 'Unknown',
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (value) => formatDate(value),
    },
  ];

  async function loadPayments() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getPayments(status || undefined, provider || undefined, pageSize, currentPage * pageSize);
      const normalized = normalizeListResponse<PaymentItem>(res);
      setPayments(normalized.items);
      setTotalCount(normalized.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(0);
  }, [status, provider]);

  useEffect(() => {
    loadPayments();
  }, [status, provider, currentPage]);

  return (
    <div>
      <PageHeader title="Payments" description="View all payment transactions" />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-40">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="AUTHORIZED">Authorized</option>
          <option value="CAPTURED">Captured</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>

        <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input-field w-40">
          <option value="">All Providers</option>
          <option value="paystack">Paystack</option>
          <option value="flutterwave">Flutterwave</option>
          <option value="mock">Mock</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={payments}
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
