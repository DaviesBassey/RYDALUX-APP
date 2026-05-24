import { api } from './client';

export type SosType = 'PANIC' | 'SAFETY_CHECK' | 'MEDICAL';

export type SosEvent = {
  id: string;
  tripId: string | null;
  type: SosType;
  status: 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED';
  latitude: number;
  longitude: number;
  notes: string | null;
  triggeredAt: string;
  resolvedAt: string | null;
};

export async function triggerSos(payload: {
  type: SosType;
  latitude: number;
  longitude: number;
  notes?: string;
}): Promise<SosEvent> {
  const { data } = await api.post<SosEvent>('/sos/trigger', payload);
  return data;
}

export async function getSosStatus(): Promise<{ sos: SosEvent | null }> {
  const { data } = await api.get<{ sos: SosEvent | null }>('/sos/status');
  return data;
}
