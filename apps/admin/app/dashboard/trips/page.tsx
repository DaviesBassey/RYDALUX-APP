'use client';

import { useEffect, useState } from 'react';
import { api, normalizeListResponse, TripItem } from '@/lib/api';
import { DataTable, DataTableColumn } from '@/lib/components/DataTable';
import { StatusBadge } from '@/lib/components/StatusBadge';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatDate, formatCurrency, formatTimeAgo } from '@/lib/utils/formats';

export default function TripsPage() {
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 20;

  const columns: DataTableColumn<TripItem>[] = [
    { key: 'reference', label: 'Trip ID', width: '100px' },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'riderProfile',
      label: 'Rider',
      render: (profile) => `${profile?.user?.firstName || ''} ${profile?.user?.lastName || ''}`,
    },
    {
      key: 'driverProfile',
      label: 'Driver',
      render: (profile) => profile?.user ? `${profile.user.firstName} ${profile.user.lastName}` : 'Unassigned',
    },
    {
      key: 'pickupAddress',
      label: 'From',
      render: (value) => (value ? value.split(',')[0] : 'N/A'),
    },
    {
      key: 'dropoffAddress',
      label: 'To',
      render: (value) => (value ? value.split(',')[0] : 'N/A'),
    },
    {
      key: 'fareQuote',
      label: 'Fare',
      render: (quote) => quote ? formatCurrency(quote.totalFare) : 'N/A',
    },
    {
      key: 'payment',
      label: 'Payment',
      render: (payment) => payment ? <StatusBadge status={payment.status} /> : 'Unpaid',
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value) => formatTimeAgo(value),
    },
  ];

  async function loadTrips() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getTrips(status || undefined, pageSize, currentPage * pageSize);
      const normalized = normalizeListResponse<TripItem>(res);
      setTrips(normalized.items);
      setTotalCount(normalized.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(0);
  }, [status]);

  useEffect(() => {
    loadTrips();
  }, [status, currentPage]);

  return (
    <div>
      <PageHeader
        title="Trips"
        description="Monitor and manage all trips in the system"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input-field w-48"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="REQUESTED">Requested</option>
          <option value="DRIVER_ASSIGNED">Driver Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED_BY_RIDER">Cancelled by Rider</option>
          <option value="CANCELLED_BY_DRIVER">Cancelled by Driver</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={trips}
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
