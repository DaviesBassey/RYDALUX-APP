'use client';

import React, { useState, ReactNode } from 'react';

export interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  currentPage?: number;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  isEmpty,
  error,
  onRowClick,
  pageSize = 20,
  totalCount = Array.isArray(data) ? data.length : 0,
  onPageChange,
  currentPage = 0,
}: DataTableProps<T>) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const safeData = Array.isArray(data) ? data : [];

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="card overflow-hidden">
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : isEmpty || safeData.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No data available</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={String(col.key)}
                      className="table-cell text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                      onClick={() => col.sortable && handleSort(String(col.key))}
                    >
                      <div className="flex items-center gap-2">
                        {col.label}
                        {col.sortable && sortBy === col.key && (
                          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {safeData.map((row, idx) => {
                  const rowId = (row as any)?.id || `row-idx-${idx}`;
                  return (
                    <tr
                      key={rowId}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((col) => (
                        <td key={String(col.key)} className="table-cell text-gray-700">
                          {col.render
                            ? col.render((row as any)[String(col.key)], row)
                            : String((row as any)[String(col.key)] ?? '')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {onPageChange && totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages} ({totalCount} total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
