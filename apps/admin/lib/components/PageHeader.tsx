'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  };
  loading?: boolean;
  children?: ReactNode;
}

export function PageHeader({ title, description, action, loading, children }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          {description && <p className="text-gray-600">{description}</p>}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            disabled={loading}
            className={`${
              action.variant === 'danger'
                ? 'btn-danger'
                : action.variant === 'secondary'
                  ? 'btn-secondary'
                  : 'btn-primary'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Loading...' : action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
