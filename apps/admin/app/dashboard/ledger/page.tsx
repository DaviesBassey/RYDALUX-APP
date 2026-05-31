'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DataTable, DataTableColumn } from '@/lib/components/DataTable';
import { PageHeader } from '@/lib/components/PageHeader';
import { formatCurrency, formatDateTime } from '@/lib/utils/formats';

interface LedgerTransaction {
  id: string;
  reference: string;
  accountCode: string;
  amount: number | string;
  type: string;
  createdAt: string;
  description?: string;
}

interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  accountType: string;
  balance: number | string;
  currency: string;
}

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 25;

  const accountColumns: DataTableColumn<LedgerAccount>[] = [
    { key: 'code', label: 'Account Code', render: (val) => val || '—' },
    { key: 'name', label: 'Account Name', render: (val) => val || '—' },
    {
      key: 'accountType',
      label: 'Type',
      render: (value) => (value || 'UNKNOWN').split('_').join(' ').toUpperCase(),
    },
    {
      key: 'balance',
      label: 'Balance',
      render: (balance, row) => formatCurrency(balance || 0, (row as any).currency || 'NGN'),
    },
  ];

  const transactionColumns: DataTableColumn<LedgerTransaction>[] = [
    { key: 'reference', label: 'Reference', render: (val) => val || '—' },
    { key: 'accountCode', label: 'Account', render: (val) => val || '—' },
    {
      key: 'type',
      label: 'Type',
      render: (value) => {
        const displayVal = value || 'UNKNOWN';
        return (
          <span className={displayVal === 'DEBIT' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
            {displayVal}
          </span>
        );
      },
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (amount) => formatCurrency(amount || 0),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (value) => value ? formatDateTime(value) : '—',
    },
  ];

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [accRes, transRes] = await Promise.all([
        api.getLedgerAccounts(),
        api.getLedgerTransactions(pageSize, currentPage * pageSize),
      ]);
      const accountList = Array.isArray(accRes) ? accRes : (accRes?.items || []);
      setAccounts(accountList);
      setTransactions(transRes?.items || []);
      setTotalCount(transRes?.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [currentPage]);

  return (
    <div>
      <PageHeader
        title="Ledger"
        description="View double-entry ledger accounts and transactions (read-only)"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Ledger Accounts</h2>
        <DataTable columns={accountColumns} data={accounts} isLoading={loading} error={error} />
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Transactions</h2>
        <DataTable
          columns={transactionColumns}
          data={transactions}
          isLoading={loading}
          error={error}
          pageSize={pageSize}
          totalCount={totalCount}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
