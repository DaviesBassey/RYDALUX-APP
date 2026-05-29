'use client';

import { useEffect, useState } from 'react';
import { api, SosEventItem, IncidentItem } from '@/lib/api';
import { PageHeader } from '@/lib/components/PageHeader';
import { StatusBadge } from '@/lib/components/StatusBadge';
import { formatDateTime } from '@/lib/utils/formats';

export default function SafetyPage() {
  const [sosEvents, setSosEvents] = useState<SosEventItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [totals, setTotals] = useState({ sos: 0, incidents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [sosRes, incRes] = await Promise.all([
        api.getSosEvents(20, 0),
        api.getIncidents(20, 0),
      ]);
      setSosEvents(sosRes.items);
      setIncidents(incRes.items);
      setTotals({ sos: sosRes.total, incidents: incRes.total });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleResolveSos(id: string) {
    setActionLoading(`sos:${id}`);
    try {
      await api.resolveSosEvent(id, 'Resolved by admin');
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUpdateIncidentStatus(id: string, status: string) {
    setActionLoading(`incident:${id}`);
    try {
      await api.updateIncidentStatus(id, status);
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Safety"
        description="Monitor SOS events and safety incidents"
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-8">
          <button
            onClick={load}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Refresh
          </button>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">SOS Events ({totals.sos})</h2>
            {sosEvents.length === 0 ? (
              <div className="card text-gray-600">No SOS events.</div>
            ) : (
              <div className="space-y-3">
                {sosEvents.map((sos) => (
                  <div key={sos.id} className="card">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-bold text-lg">{sos.type}</div>
                      <StatusBadge status={sos.status} />
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      User: {sos.user.displayName ?? sos.user.phone ?? sos.user.id}
                    </div>
                    {sos.trip && (
                      <div className="text-sm text-gray-700 mb-2">
                        Trip: {sos.trip.reference} ({sos.trip.status})
                      </div>
                    )}
                    <div className="text-sm text-gray-600 mb-2">
                      Location: {sos.latitude.toFixed(5)}, {sos.longitude.toFixed(5)}
                    </div>
                    {sos.notes && <div className="text-sm text-gray-700 mb-2">{sos.notes}</div>}
                    <div className="text-xs text-gray-500 mb-3">
                      Triggered: {formatDateTime(sos.triggeredAt)}
                    </div>
                    {sos.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolveSos(sos.id)}
                        disabled={actionLoading === `sos:${sos.id}`}
                        className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
                      >
                        {actionLoading === `sos:${sos.id}` ? 'Resolving…' : 'Resolve'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Incidents ({totals.incidents})</h2>
            {incidents.length === 0 ? (
              <div className="card text-gray-600">No incidents reported.</div>
            ) : (
              <div className="space-y-3">
                {incidents.map((inc) => (
                  <div key={inc.id} className="card">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-bold text-lg">Severity: {inc.severity}</div>
                      <StatusBadge status={inc.status} />
                    </div>
                    <div className="text-sm text-gray-700 mb-2">
                      Reported by: {inc.reportedBy.displayName ?? inc.reportedBy.id}
                    </div>
                    {inc.trip && (
                      <div className="text-sm text-gray-700 mb-2">
                        Trip: {inc.trip.reference} ({inc.trip.status})
                      </div>
                    )}
                    <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{inc.description}</div>
                    <div className="text-xs text-gray-500 mb-3">
                      Created: {formatDateTime(inc.createdAt)}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const).map((st) =>
                        inc.status !== st ? (
                          <button
                            key={st}
                            onClick={() => handleUpdateIncidentStatus(inc.id, st)}
                            disabled={actionLoading === `incident:${inc.id}`}
                            className="btn-secondary px-3 py-1 text-xs disabled:opacity-60"
                          >
                            Mark {st}
                          </button>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
