'use client';

import { useEffect, useState } from 'react';
import { api, normalizeListResponse, AuditLogItem } from '@/lib/api';
import { DataTable, DataTableColumn } from '@/lib/components/DataTable';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatDateTime, truncateText } from '@/lib/utils/formats';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 50;

  const columns: DataTableColumn<AuditLogItem>[] = [
    {
      key: 'createdAt',
      label: 'Timestamp',
      render: (value) => formatDateTime(value),
    },
    {
      key: 'action',
      label: 'Action',
      render: (value: string) =>
        value
          .split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' '),
    },
    {
      key: 'entity',
      label: 'Entity',
      render: (value: string) =>
        value
          .split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' '),
    },
    {
      key: 'entityId',
      label: 'Entity ID',
      render: (value) => truncateText(value, 20),
    },
    {
      key: 'actorId',
      label: 'Actor',
      render: (value) => (value ? truncateText(value, 16) : 'System'),
    },
    {
      key: 'payload',
      label: 'Details',
      render: (value) =>
        value ? (
          <span className="text-xs text-gray-500 font-mono">
            {truncateText(JSON.stringify(value), 40)}
          </span>
        ) : (
          '-'
        ),
    },
  ];

  async function loadLogs() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAuditLogs(undefined, entity || undefined, action || undefined, pageSize, currentPage * pageSize);
      const normalized = normalizeListResponse<AuditLogItem>(res);
      setLogs(normalized.items);
      setTotalCount(normalized.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(0);
  }, [action, entity]);

  useEffect(() => {
    loadLogs();
  }, [action, entity, currentPage]);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="View all system actions and changes for compliance and security"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className="input-field w-48">
          <option value="">All Entities</option>
          <option value="USER">User</option>
          <option value="TRIP">Trip</option>
          <option value="PAYMENT">Payment</option>
          <option value="PAYOUT">Payout</option>
          <option value="SUPPORT_TICKET">Support Ticket</option>
          <option value="SOS_EVENT">SOS Event</option>
          <option value="INCIDENT_REPORT">Incident Report</option>
          <option value="KYC">KYC</option>
          <option value="VEHICLE">Vehicle</option>
        </select>

        <select value={action} onChange={(e) => setAction(e.target.value)} className="input-field w-48">
          <option value="">All Actions</option>
          <option value="CREATED">Created</option>
          <option value="UPDATED">Updated</option>
          <option value="DELETED">Deleted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="STATUS_CHANGED">Status Changed</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={logs}
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
