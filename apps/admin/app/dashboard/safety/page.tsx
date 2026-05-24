'use client';

import { useEffect, useState } from 'react';
import { api, SosEventItem, IncidentItem } from '@/lib/api';

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

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      TRIGGERED: '#dc2626',
      ACKNOWLEDGED: '#f59e0b',
      RESOLVED: '#16a34a',
      OPEN: '#dc2626',
      INVESTIGATING: '#2563eb',
      CLOSED: '#6b7280',
    };
    const color = colors[status] ?? '#333';
    return (
      <span style={{ padding: '2px 8px', borderRadius: 12, background: `${color}18`, color, fontSize: 12, fontWeight: 600 }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 700 }}>Safety</h1>
      {error && <div style={{ marginBottom: 16, padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 8 }}>{error}</div>}
      {loading ? (
        <div style={{ color: '#6b7280' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <button
            onClick={load}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#111827',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
          {/* SOS Events */}
          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px' }}>SOS Events ({totals.sos})</h2>
            {sosEvents.length === 0 ? (
              <div style={{ padding: 24, background: '#fff', borderRadius: 12, color: '#6b7280' }}>No SOS events.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sosEvents.map((sos) => (
                  <div key={sos.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{sos.type}</div>
                      {statusBadge(sos.status)}
                    </div>
                    <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>
                      User: {sos.user.displayName ?? sos.user.phone ?? sos.user.id}
                    </div>
                    {sos.trip && (
                      <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>
                        Trip: {sos.trip.reference} ({sos.trip.status})
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                      Location: {sos.latitude.toFixed(5)}, {sos.longitude.toFixed(5)}
                    </div>
                    {sos.notes && <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>{sos.notes}</div>}
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      Triggered: {new Date(sos.triggeredAt).toLocaleString()}
                    </div>
                    {sos.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleResolveSos(sos.id)}
                        disabled={actionLoading === `sos:${sos.id}`}
                        style={{
                          marginTop: 12,
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#16a34a',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          opacity: actionLoading === `sos:${sos.id}` ? 0.6 : 1,
                        }}
                      >
                        {actionLoading === `sos:${sos.id}` ? 'Resolving…' : 'Resolve'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Incidents */}
          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 16px' }}>Incidents ({totals.incidents})</h2>
            {incidents.length === 0 ? (
              <div style={{ padding: 24, background: '#fff', borderRadius: 12, color: '#6b7280' }}>No incidents reported.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {incidents.map((inc) => (
                  <div key={inc.id} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>Severity: {inc.severity}</div>
                      {statusBadge(inc.status)}
                    </div>
                    <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>
                      Reported by: {inc.reportedBy.displayName ?? inc.reportedBy.id}
                    </div>
                    {inc.trip && (
                      <div style={{ fontSize: 13, color: '#4b5563', marginBottom: 4 }}>
                        Trip: {inc.trip.reference} ({inc.trip.status})
                      </div>
                    )}
                    <div style={{ fontSize: 13, color: '#374151', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{inc.description}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                      Created: {new Date(inc.createdAt).toLocaleString()}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const).map((st) =>
                        inc.status !== st ? (
                          <button
                            key={st}
                            onClick={() => handleUpdateIncidentStatus(inc.id, st)}
                            disabled={actionLoading === `incident:${inc.id}`}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1px solid #e5e7eb',
                              background: '#fff',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              opacity: actionLoading === `incident:${inc.id}` ? 0.6 : 1,
                            }}
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
