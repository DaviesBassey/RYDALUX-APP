'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/lib/components/PageHeader';

interface Summary {
  kyc: number;
  driverDocs: number;
  vehicleDocs: number;
  vehicles: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [safetyCounts, setSafetyCounts] = useState<{ sos: number; incidents: number } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [kyc, docs, vehicles] = await Promise.all([
          api.getPendingKyc(1, 0),
          api.getPendingDriverDocuments(1, 0),
          api.getPendingVehicles(1, 0),
        ]);
        setSummary({
          kyc: kyc.total,
          driverDocs: docs.driverDocuments.total,
          vehicleDocs: docs.vehicleDocuments.total,
          vehicles: vehicles.total,
        });
        try {
          const [sos, incidents] = await Promise.all([
            api.getSosEvents(1, 0),
            api.getIncidents(1, 0),
          ]);
          setSafetyCounts({ sos: sos.total, incidents: incidents.total });
        } catch {
          setSafetyCounts(null);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const cards: { label: string; value: number; href: string }[] = summary
    ? [
        { label: 'Pending KYC', value: summary.kyc, href: '/dashboard/kyc' },
        { label: 'Driver Documents', value: summary.driverDocs, href: '/dashboard/drivers' },
        { label: 'Vehicle Documents', value: summary.vehicleDocs, href: '/dashboard/drivers' },
        { label: 'Pending Vehicles', value: summary.vehicles, href: '/dashboard/vehicles' },
        ...(safetyCounts ? [
          { label: 'SOS Events', value: safetyCounts.sos, href: '/dashboard/safety' },
          { label: 'Incidents', value: safetyCounts.incidents, href: '/dashboard/safety' },
        ] : []),
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Operations overview and pending items"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link key={card.label} href={card.href}>
              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-3xl font-bold text-gray-900">{card.value}</div>
                <div className="text-sm text-gray-600 mt-2">{card.label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
