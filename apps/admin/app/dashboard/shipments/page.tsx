'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

interface ShipmentItem {
  id: string;
  tripId: string;
  reference: string;
  status: string;
  tripStatus: string;
  senderName: string;
  recipientName: string;
  recipientPhone: string;
  packageSizeClass: string;
  totalFare: number | null;
  paymentStatus: string | null;
  proofCount: number;
  driverName: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

interface ShipmentsResponse {
  items: ShipmentItem[];
  total: number;
  limit: number;
  offset: number;
}

const STATUS_OPTIONS = ['', 'REQUESTED', 'DRIVER_EN_ROUTE', 'AT_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED'];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DELIVERED: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c' },
  FAILED: { bg: '#fee2e2', text: '#b91c1c' },
  REQUESTED: { bg: '#f3f4f6', text: '#374151' },
  DRIVER_EN_ROUTE: { bg: '#fef3c7', text: '#92400e' },
  AT_PICKUP: { bg: '#fef3c7', text: '#92400e' },
  IN_TRANSIT: { bg: '#dbeafe', text: '#1e40af' },
};

function statusBadge(status: string) {
  const colors = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        background: colors.bg,
        color: colors.text,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status}
    </span>
  );
}

export default function ShipmentsPage() {
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res: ShipmentsResponse = await api.getShipments(statusFilter || undefined, 50, 0);
      setItems(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [statusFilter]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (s) =>
        s.reference.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.tripId.toLowerCase().includes(q) ||
        s.recipientName.toLowerCase().includes(q) ||
        s.senderName.toLowerCase().includes(q) ||
        s.recipientPhone.includes(q),
    );
  }, [items, search]);

  async function toggleDetail(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const d = await api.getShipment(id);
      setDetail(d);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }

  async function resolveShipment(id: string, resolution: string, notes?: string) {
    setActionId(id);
    setActionMessage('');
    setError('');
    try {
      await api.resolveShipment(id, resolution, notes);
      setActionMessage(`Shipment ${id} resolved as ${resolution}.`);
      await load();
      if (expandedId === id) {
        await toggleDetail(id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  }

  async function forceStatus(id: string, status: 'CANCELLED' | 'FAILED', reason?: string) {
    setActionId(id);
    setActionMessage('');
    setError('');
    try {
      await api.forceShipmentStatus(id, status, reason);
      setActionMessage(`Shipment ${id} marked as ${status}.`);
      await load();
      if (expandedId === id) {
        await toggleDetail(id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: 28, fontWeight: 700 }}>Shipments</h1>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: '#fee2e2', color: '#b91c1c', borderRadius: 8 }}>
          {error}
        </div>
      )}
      {actionMessage && (
        <div style={{ marginBottom: 16, padding: 12, background: '#dcfce7', color: '#166534', borderRadius: 8 }}>
          {actionMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#fff',
            fontSize: 14,
            minWidth: 180,
          }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s || 'All statuses'}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ref, recipient, phone…"
          style={{
            flex: 1,
            minWidth: 220,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#fff',
            fontSize: 14,
          }}
        />
        <button
          onClick={load}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: '#111827',
            color: '#f9d36a',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      <div style={cardStyle}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#6b7280' }}>
          Showing {filteredItems.length} of {total}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No shipments found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Ref</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Sender</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Recipient</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Driver</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Package</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Fare</th>
                <th style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Proofs</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Created</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <>
                  <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => toggleDetail(item.id)}>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{item.reference}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{item.id.slice(0, 8)}…</div>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                      {statusBadge(item.status)}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 500 }}>{item.senderName}</div>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 500 }}>{item.recipientName}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{item.recipientPhone}</div>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                      {item.driverName ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>
                      {item.packageSizeClass}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>
                      {item.totalFare !== null ? `₦${Number(item.totalFare).toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: item.proofCount > 0 ? '#dcfce7' : '#f3f4f6',
                          color: item.proofCount > 0 ? '#166534' : '#374151',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {item.proofCount}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {item.status !== 'DELIVERED' && item.status !== 'CANCELLED' && item.status !== 'FAILED' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                resolveShipment(item.id, 'Admin resolved');
                              }}
                              disabled={actionId === item.id}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: 'none',
                                background: '#111827',
                                color: '#f9d36a',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                opacity: actionId === item.id ? 0.6 : 1,
                              }}
                            >
                              Resolve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                forceStatus(item.id, 'CANCELLED', 'Admin cancelled');
                              }}
                              disabled={actionId === item.id}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid #d1d5db',
                                background: '#fff',
                                color: '#374151',
                                fontSize: 12,
                                cursor: 'pointer',
                                opacity: actionId === item.id ? 0.6 : 1,
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {item.status === 'FAILED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              resolveShipment(item.id, 'Admin retry');
                            }}
                            disabled={actionId === item.id}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: 'none',
                              background: '#111827',
                              color: '#f9d36a',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              opacity: actionId === item.id ? 0.6 : 1,
                            }}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedId === item.id && (
                    <tr>
                      <td colSpan={10} style={{ padding: 0, borderBottom: '1px solid #e5e7eb', background: '#fafaf9' }}>
                        {detailLoading ? (
                          <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>Loading details…</div>
                        ) : detail ? (
                          <div style={{ padding: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Trip ID</div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{detail.tripId}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Trip Status</div>
                                <div style={{ fontSize: 14 }}>{statusBadge(detail.tripStatus)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Payment Status</div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{detail.payment?.status ?? '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Package Size</div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{detail.packageSizeClass}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Driver</div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{detail.driver?.name ?? '—'}</div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>{detail.driver?.phone}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Rider</div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{detail.rider?.name ?? '—'}</div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>{detail.rider?.phone}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Pickup</div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{detail.pickup?.address}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Dropoff</div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{detail.dropoff?.address}</div>
                              </div>
                              {detail.specialInstructions && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Special Instructions</div>
                                  <div style={{ fontSize: 14 }}>{detail.specialInstructions}</div>
                                </div>
                              )}
                            </div>

                            {detail.proofs && detail.proofs.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Delivery Proofs</div>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                  {detail.proofs.map((proof: any) => (
                                    <div
                                      key={proof.id}
                                      style={{
                                        padding: 12,
                                        background: '#fff',
                                        borderRadius: 8,
                                        border: '1px solid #e5e7eb',
                                        minWidth: 200,
                                      }}
                                    >
                                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{proof.proofType}</div>
                                      <a
                                        href={proof.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ fontSize: 13, color: '#1e40af', wordBreak: 'break-all' }}
                                      >
                                        {proof.url}
                                      </a>
                                      {proof.notes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{proof.notes}</div>}
                                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                                        {new Date(proof.submittedAt).toLocaleString()}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {detail.status !== 'DELIVERED' && detail.status !== 'CANCELLED' && detail.status !== 'FAILED' && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                <button
                                  onClick={() => resolveShipment(detail.id, 'Admin resolved')}
                                  disabled={actionId === detail.id}
                                  style={{
                                    padding: '8px 14px',
                                    borderRadius: 6,
                                    border: 'none',
                                    background: '#111827',
                                    color: '#f9d36a',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    opacity: actionId === detail.id ? 0.6 : 1,
                                  }}
                                >
                                  Resolve as Delivered
                                </button>
                                <button
                                  onClick={() => forceStatus(detail.id, 'FAILED', 'Admin marked failed')}
                                  disabled={actionId === detail.id}
                                  style={{
                                    padding: '8px 14px',
                                    borderRadius: 6,
                                    border: '1px solid #b91c1c',
                                    color: '#b91c1c',
                                    background: '#fff',
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    opacity: actionId === detail.id ? 0.6 : 1,
                                  }}
                                >
                                  Mark Failed
                                </button>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
