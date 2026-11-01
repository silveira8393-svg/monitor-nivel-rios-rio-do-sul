import { useEffect, useRef, useState } from 'react';
import { riverService } from '../services/supabase';
import { getHistoryRange, type HistoryBucket, type HistoryRange } from '../lib/hydrology';
import { monitoringConfig } from '../config/monitoring';
import type { StationData } from '../types/river';

export interface DashboardHistory { buckets: HistoryBucket[]; range: HistoryRange | null; isLoading: boolean; error: string | null }
export const emptyHistory: DashboardHistory = { buckets: [], range: null, isLoading: true, error: null };

// A single per-station request feeds the card, comparison and summary. The modal keeps its own filters.
export function useDashboardHistory(stations: StationData[], lastQuery: Date | null) {
  const [histories, setHistories] = useState<Record<string, DashboardHistory>>({});
  const active = useRef(new Map<string, { key: string; controller: AbortController }>());
  const completed = useRef(new Map<string, string>());
  const signature = JSON.stringify(stations.map(item => [item.station.id, item.latestReading?.readAt ?? '', !item.isLoading]));
  const queriedAt = lastQuery?.getTime() ?? 0;
  useEffect(() => {
    const requests: [string, string, boolean][] = JSON.parse(signature);
    const range = getHistoryRange('24h');
    const windowKey = Math.floor(Date.parse(range.end) / monitoringConfig.reconciliationMs);
    for (const [id, readAt, ready] of requests) {
      if (!ready) continue;
      const key = `${readAt}:${windowKey}`;
      if (completed.current.get(id) === key || active.current.get(id)?.key === key) continue;
      active.current.get(id)?.controller.abort();
      const controller = new AbortController();
      active.current.set(id, { key, controller });
      setHistories(previous => ({ ...previous, [id]: { ...(previous[id] ?? emptyHistory), isLoading: true, error: null } }));
      void riverService.getStationHistory(id, range, 60, controller.signal).then(buckets => {
        if (controller.signal.aborted) return;
        completed.current.set(id, key);
        setHistories(previous => ({ ...previous, [id]: { buckets, range, isLoading: false, error: null } }));
      }).catch(() => {
        if (!controller.signal.aborted) setHistories(previous => ({ ...previous, [id]: {
          ...(previous[id] ?? emptyHistory), isLoading: false, error: 'Histórico de 24 horas indisponível. Tente atualizar o painel.',
        } }));
      }).finally(() => {
        if (active.current.get(id)?.controller === controller) active.current.delete(id);
      });
    }
  }, [signature, queriedAt]);
  useEffect(() => () => {
    for (const request of active.current.values()) request.controller.abort();
    active.current.clear();
  }, []);
  return histories;
}
