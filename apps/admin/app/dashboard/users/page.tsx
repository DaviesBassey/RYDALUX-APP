'use client';

import { useEffect, useState } from 'react';
import { api, normalizeListResponse, UserItem } from '@/lib/api';
import { DataTable, DataTableColumn } from '@/lib/components/DataTable';
import { StatusBadge } from '@/lib/components/StatusBadge';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatDate, maskEmail, maskPhone } from '@/lib/utils/formats';

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 20;

  const columns: DataTableColumn<UserItem>[] = [
    {
      key: 'firstName',
      label: 'Name',
      render: (first, row) => `${first || ''} ${row?.lastName || ''}`.trim() || 'N/A',
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => value ? maskEmail(value) : '—',
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value) => value ? maskPhone(value) : '—',
    },
    {
      key: 'role',
      label: 'Role',
      render: (value) => (
        <span className="capitalize">{(value || 'UNKNOWN').toLowerCase().replace('_', ' ')}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value || 'UNKNOWN'} />,
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      render: (value) => value ? formatDate(value) : 'Never',
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value) => value ? formatDate(value) : '—',
    },
  ];

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getUsers(role || undefined, status || undefined, pageSize, currentPage * pageSize);
      const normalized = normalizeListResponse<UserItem>(res);
      const safeItems = normalized.items;

      const filteredItems = safeItems.filter((u) => {
        const matchesRole = !role || u.role === role;
        const matchesStatus = !status || u.status === status;
        return matchesRole && matchesStatus;
      });

      setUsers(filteredItems);
      setTotalCount(normalized.total || filteredItems.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCurrentPage(0);
  }, [role, status]);

  useEffect(() => {
    loadUsers();
  }, [role, status, currentPage]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage system users and access control"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-4 flex-wrap">
        <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field w-48">
          <option value="">All User Types</option>
          <option value="RIDER">Rider</option>
          <option value="DRIVER">Driver</option>
          <option value="ADMIN">Admin</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-48">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={users}
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
