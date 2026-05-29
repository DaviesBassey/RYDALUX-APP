'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DataTable, DataTableColumn } from '@/lib/components/DataTable';
import { StatusBadge } from '@/lib/components/StatusBadge';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatDate, maskEmail, maskPhone } from '@/lib/utils/formats';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 20;

  const columns: DataTableColumn<User>[] = [
    {
      key: 'firstName',
      label: 'Name',
      render: (first, row) => `${first} ${row.lastName}`,
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => maskEmail(value),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value) => maskPhone(value),
    },
    {
      key: 'role',
      label: 'Role',
      render: (value) => (
        <span className="capitalize">{value.toLowerCase().replace('_', ' ')}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      render: (value) => value ? formatDate(value) : 'Never',
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value) => formatDate(value),
    },
  ];

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getUsers(role || undefined, pageSize, currentPage * pageSize);
      setUsers(res.items || []);
      setTotalCount(res.total || 0);
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
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="SAFETY_OFFICER">Safety Officer</option>
          <option value="SUPPORT">Support</option>
          <option value="FINANCE_MANAGER">Finance Manager</option>
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-48">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
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
