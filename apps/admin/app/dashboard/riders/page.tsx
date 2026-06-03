'use client';

import { useEffect, useState } from 'react';
import { api, normalizeListResponse } from '@/lib/api';
import { DataTable, DataTableColumn } from '@/lib/components/DataTable';
import { StatusBadge } from '@/lib/components/StatusBadge';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatDate, maskEmail } from '@/lib/utils/formats';

interface RiderProfile {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  rating?: number;
  totalTrips: number;
  status: string;
  kycStatus: string;
  createdAt: string;
}

export default function RidersPage() {
  const [riders, setRiders] = useState<RiderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kycStatus, setKycStatus] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 20;

  const columns: DataTableColumn<RiderProfile>[] = [
    {
      key: 'user',
      label: 'Name',
      render: (user) => `${user?.firstName || ''} ${user?.lastName || ''}`,
    },
    {
      key: 'user',
      label: 'Email',
      render: (user) => maskEmail(user?.email || ''),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (value) => value ? `${value.toFixed(1)} ⭐` : 'No rating',
    },
    {
      key: 'totalTrips',
      label: 'Trips',
      render: (value) => value || 0,
    },
    {
      key: 'kycStatus',
      label: 'KYC',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'createdAt',
      label: 'Joined',
      render: (value) => formatDate(value),
    },
  ];

  async function loadRiders() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getRiders(pageSize, currentPage * pageSize);
      const normalized = normalizeListResponse<any>(res);
      const safeItems = normalized.items.map((r: any, idx: number) => ({
        id: r?.id || r?.userId || `rider-row-${idx}`,
        user: {
          id: r?.user?.id || r?.userId || '',
          email: r?.user?.email || '',
          firstName: r?.user?.firstName || '',
          lastName: r?.user?.lastName || '',
        },
        rating: Number(r?.rating ?? r?.averageRating ?? 0) || 0,
        totalTrips: Number(r?.totalTrips ?? r?._count?.trips ?? 0) || 0,
        kycStatus: String(r?.kycStatus || r?.user?.kycStatus || 'PENDING'),
        status: String(r?.status || (r?.isActive === false ? 'INACTIVE' : 'ACTIVE')),
        createdAt: r?.createdAt || new Date().toISOString(),
      }));
      const filteredItems = safeItems.filter((r: any) => {
        const matchesKyc = !kycStatus || r.kycStatus === kycStatus;
        const matchesStatus = !status || r.status === status;
        return matchesKyc && matchesStatus;
      });

      setRiders(filteredItems);
      setTotalCount(filteredItems.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load riders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(0);
  }, [kycStatus, status]);

  useEffect(() => {
    loadRiders();
  }, [kycStatus, status, currentPage]);

  return (
    <div>
      <PageHeader
        title="Riders"
        description="Manage rider profiles and compliance"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        <select value={kycStatus} onChange={(e) => setKycStatus(e.target.value)} className="input-field w-48">
          <option value="">All KYC Status</option>
          <option value="PENDING">Pending</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-48">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={riders}
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
