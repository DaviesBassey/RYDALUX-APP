'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

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
      <h1 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 700 }}>Overview</h1>
      {error && <div style={{ marginBottom: 16, padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 8 }}>{error}</div>}
      {loading ? (
        <div style={{ color: '#6b7280' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {cards.map((card) => (
            <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'transform 0.1s',
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 700, color: '#111827' }}>{card.value}</div>
                <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{card.label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
