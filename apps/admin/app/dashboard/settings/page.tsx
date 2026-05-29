'use client';

import { useState } from 'react';
import { PageHeader } from '@/lib/components/PageHeader';

interface AppSetting {
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  editable: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([
    {
      key: 'app.version',
      value: '1.0.0',
      description: 'Current application version',
      type: 'string',
      editable: false,
    },
    {
      key: 'app.name',
      value: 'RYDALUX',
      description: 'Application name',
      type: 'string',
      editable: true,
    },
    {
      key: 'trip.minFare',
      value: '500',
      description: 'Minimum trip fare in NGN',
      type: 'number',
      editable: true,
    },
    {
      key: 'trip.cancellationFee',
      value: '200',
      description: 'Trip cancellation fee in NGN',
      type: 'number',
      editable: true,
    },
    {
      key: 'driver.commissionsRate',
      value: '10',
      description: 'Driver commission rate in percentage',
      type: 'number',
      editable: true,
    },
    {
      key: 'kyc.requirementLevel',
      value: 'VERIFIED',
      description: 'KYC requirement level for new drivers',
      type: 'string',
      editable: true,
    },
    {
      key: 'security.twoFactorRequired',
      value: 'false',
      description: 'Require two-factor authentication for admin',
      type: 'boolean',
      editable: true,
    },
    {
      key: 'maintenance.mode',
      value: 'false',
      description: 'Enable maintenance mode',
      type: 'boolean',
      editable: true,
    },
  ]);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEdit = (key: string, value: string) => {
    setEditingKey(key);
    setEditValue(value);
  };

  const handleSave = (key: string) => {
    setSettings(settings.map(s => s.key === key ? { ...s, value: editValue } : s));
    setEditingKey(null);
  };

  const handleCancel = () => {
    setEditingKey(null);
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure application settings and parameters"
      />

      <div className="card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Setting</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Value</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.key} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-mono text-sm text-gray-900">{setting.key}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{setting.description}</td>
                <td className="py-3 px-4">
                  {editingKey === setting.key ? (
                    <input
                      type={setting.type === 'number' ? 'number' : 'text'}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="input-field w-40 text-sm"
                    />
                  ) : (
                    <span className="text-sm text-gray-900">{setting.value}</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {editingKey === setting.key ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(setting.key)}
                        className="btn-primary px-3 py-1 text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="btn-secondary px-3 py-1 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : setting.editable ? (
                    <button
                      onClick={() => handleEdit(setting.key, setting.value)}
                      className="btn-secondary px-3 py-1 text-xs"
                    >
                      Edit
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Read-only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
        <p className="font-semibold mb-2">⚠️ Settings Warning</p>
        <p>Changes to settings affect the entire application. Please ensure you understand the impact before making changes.</p>
      </div>
    </div>
  );
}
