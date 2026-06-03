'use client';

import { useEffect, useState } from 'react';
import { api, normalizeListResponse } from '@/lib/api';
import { DataTable, DataTableColumn } from '@/lib/components/DataTable';
import { StatusBadge } from '@/lib/components/StatusBadge';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatDate, formatTimeAgo } from '@/lib/utils/formats';

interface SupportTicket {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  createdBy: { firstName: string; lastName: string; email: string };
  assignedTo?: { user?: { firstName: string; lastName: string }; firstName?: string; lastName?: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [priority, setPriority] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 20;

  const columns: DataTableColumn<SupportTicket>[] = [
    { key: 'title', label: 'Title', width: '250px', render: (val) => val || '—' },
    {
      key: 'type',
      label: 'Type',
      render: (value) => {
        const typeLabels: Record<string, string> = {
          PAYMENT_ISSUE: 'Payment',
          DRIVER_COMPLAINT: 'Driver Complaint',
          RIDER_COMPLAINT: 'Rider Complaint',
          LOST_ITEM: 'Lost Item',
          SAFETY_ISSUE: 'Safety',
          CANCELLATION_ISSUE: 'Cancellation',
          REFUND_REQUEST: 'Refund',
          PAYOUT_ISSUE: 'Payout',
          ACCOUNT_ISSUE: 'Account',
          VEHICLE_ISSUE: 'Vehicle',
          SHIPMENT_ISSUE: 'Shipment',
          OTHER: 'Other',
        };
        const val = value || 'OTHER';
        return typeLabels[val] || val;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value || 'OPEN'} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value) => {
        const val = value || 'MEDIUM';
        const colors: Record<string, string> = {
          LOW: 'badge-gray',
          MEDIUM: 'badge-info',
          HIGH: 'badge-warning',
          URGENT: 'badge-danger',
        };
        return (
          <span className={colors[val] || 'badge-gray'}>
            {val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()}
          </span>
        );
      },
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (creator) => creator ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || creator.email || '—' : '—',
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      render: (assigned) => {
        if (!assigned) return 'Unassigned';
        const firstName = assigned.firstName ?? assigned.user?.firstName ?? '';
        const lastName = assigned.lastName ?? assigned.user?.lastName ?? '';
        return `${firstName} ${lastName}`.trim() || assigned.email || 'Assigned';
      },
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value) => value ? formatTimeAgo(value) : '—',
    },
  ];

  async function loadTickets() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSupportTickets(
        status || undefined,
        type || undefined,
        priority || undefined,
        pageSize,
        currentPage * pageSize
      );
      const normalized = normalizeListResponse<any>(res);
      const safeItems = normalized.items.map((t: any, idx: number) => ({
        id: t?.id || `ticket-row-${idx}`,
        title: t?.title || '—',
        type: t?.type || 'OTHER',
        status: t?.status || 'OPEN',
        priority: t?.priority || 'MEDIUM',
        createdBy: {
          firstName: t?.createdBy?.firstName || '',
          lastName: t?.createdBy?.lastName || '',
          email: t?.createdBy?.email || '',
        },
        assignedTo: t?.assignedTo ? {
          firstName: t.assignedTo.firstName || t.assignedTo.user?.firstName || '',
          lastName: t.assignedTo.lastName || t.assignedTo.user?.lastName || '',
          email: t.assignedTo.email || t.assignedTo.user?.email || '',
        } : undefined,
        createdAt: t?.createdAt || new Date().toISOString(),
        updatedAt: t?.updatedAt || new Date().toISOString(),
      }));
      setTickets(safeItems);
      setTotalCount(normalized.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(0);
  }, [status, type, priority]);

  useEffect(() => {
    loadTickets();
  }, [status, type, priority, currentPage]);

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description="Manage customer support tickets and issues"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-40">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="WAITING_ON_USER">Waiting on User</option>
          <option value="WAITING_ON_ADMIN">Waiting on Admin</option>
          <option value="ESCALATED">Escalated</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select value={type} onChange={(e) => setType(e.target.value)} className="input-field w-40">
          <option value="">All Types</option>
          <option value="PAYMENT_ISSUE">Payment Issue</option>
          <option value="DRIVER_COMPLAINT">Driver Complaint</option>
          <option value="RIDER_COMPLAINT">Rider Complaint</option>
          <option value="SAFETY_ISSUE">Safety Issue</option>
          <option value="REFUND_REQUEST">Refund Request</option>
        </select>

        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-field w-40">
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={tickets}
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
