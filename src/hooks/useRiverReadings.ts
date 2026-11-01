import { useCallback, useEffect, useRef, useState } from 'react';
import { MONITORED_STATIONS, type StationData } from '../types/river';
import { applyRealtimeReading, readingIsNewer } from '../lib/hydrology';
import { monitoringConfig } from '../config/monitoring';
import { riverService } from '../services/supabase';
import type { ConnectionStatus } from '../services/riverRepository';

export function useRiverReadings() {
  const [stations, setStations] = useState<StationData[]>(() => MONITORED_STATIONS.map(station => ({ station, latestReading: null, isLoading: true, error: null })));
  const [isLoading, setIsLoading] = useState(true);
  const [lastQuery, setLastQuery] = useState<Date | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>('connecting');
  const [now, setNow] = useState(Date.now);
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setIsLoading(true);
    try {
      const result = await riverService.getLatestReadings(controller.signal);
      if (controller.signal.aborted) return;
      setStations(previous => previous.map(item => {
        const entry = result[item.station.id];
        const latestReading = entry?.reading && readingIsNewer(item.latestReading, entry.reading) ? entry.reading : item.latestReading;
        return { ...item, latestReading, isLoading: false, error: entry?.error ?? null };
      }));
      setLastQuery(new Date());
      setNow(Date.now());
    } catch {
      if (!controller.signal.aborted) setStations(previous => previous.map(item => ({ ...item, isLoading: false, error: 'Erro de comunicação. Última leitura preservada.' })));
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsubscribe = riverService.subscribeToNewReadings(reading => {
      setStations(previous => applyRealtimeReading(previous, reading));
      setNow(Date.now());
    }, status => {
      setConnection(status);
      // Reconcile on every successful subscription, including recovery from a disconnect.
      if (status === 'connected') void refresh();
    });
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const onOnline = () => { void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    const reconciliation = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, monitoringConfig.reconciliationMs);
    const clock = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      request.current?.abort();
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.clearInterval(reconciliation);
      window.clearInterval(clock);
    };
  }, [refresh]);
  return { stations, isLoading, lastQuery, connection, refresh, now };
}
