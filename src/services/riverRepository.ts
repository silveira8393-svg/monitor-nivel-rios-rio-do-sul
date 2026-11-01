import type { SupabaseClient } from '@supabase/supabase-js';
import { MONITORED_STATIONS, type RiverReading, type SituationType, type TrendType } from '../types/river';
import { addReadingsToBuckets, calculateDisplayedVariations, createBuckets, isValidReading, type HistoryInterval, type HistoryRange } from '../lib/hydrology';

export interface LatestResult { reading: RiverReading | null; error: string | null }
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'unconfigured';
const situations: SituationType[] = ['normal', 'atencao', 'alerta', 'emergencia', 'aguardando'];
const trends: TrendType[] = ['subindo', 'estavel', 'baixando', 'indeterminado'];
function numeric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function mapReading(row: Record<string, unknown>): RiverReading {
  return {
    id: typeof row.id === 'string' ? row.id : '',
    stationId: typeof row.station_id === 'string' ? row.station_id : '',
    levelMeters: numeric(row.level_meters),
    situation: situations.includes(row.situation as SituationType) ? row.situation as SituationType : 'aguardando',
    readAt: typeof row.read_at === 'string' ? row.read_at : null,
    trend: trends.includes(row.trend as TrendType) ? row.trend as TrendType : 'indeterminado',
    variationMeters: numeric(row.variation_meters),
    sourceUrl: typeof row.source_url === 'string' ? row.source_url : undefined,
    createdAt: typeof row.created_at === 'string' ? row.created_at : '',
  };
}
export function createRiverRepository(client: SupabaseClient | null) {
  return {
    async getLatestReadings(signal?: AbortSignal): Promise<Record<string, LatestResult>> {
      const entries = await Promise.all(MONITORED_STATIONS.map(async station => {
        if (!client) return [station.id, { reading: null, error: 'Conexão de dados não configurada.' }] as const;
        try {
          let query = client.from('river_readings').select('*').eq('station_id', station.id)
            .order('read_at', { ascending: false }).limit(1);
          query = query.abortSignal(signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000));
          const { data, error } = await query.maybeSingle();
          if (error) throw error;
          const reading = data ? mapReading(data) : null;
          if (reading && !isValidReading(reading)) throw new Error('Medição inválida');
          return [station.id, { reading, error: null }] as const;
        } catch {
          return [station.id, { reading: null, error: 'Não foi possível consultar esta estação. Tente atualizar.' }] as const;
        }
      }));
      return Object.fromEntries(entries);
    },
    async getStationHistory(stationId: string, range: HistoryRange, interval: HistoryInterval, signal?: AbortSignal) {
      const buckets = createBuckets(range, interval);
      if (!client) throw new Error('Conexão de dados não configurada.');
      // Keyset pagination: aggregate one page at a time, without a raw full-series array.
      let cursor: string | null = null;
      let received = 0;
      while (true) {
        signal?.throwIfAborted();
        let query = client.from('river_readings').select('id, station_id, level_meters, read_at')
          .eq('station_id', stationId).gte('read_at', range.start).lte('read_at', range.end)
          .order('read_at', { ascending: true }).limit(500);
        if (cursor) query = query.gt('read_at', cursor);
        query = query.abortSignal(signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000));
        const { data, error } = await query;
        if (error) throw new Error('Erro de comunicação ao consultar o histórico. Tente novamente.');
        if (!data?.length) break;
        received += data.length;
        if (received > 200000) throw new Error('Volume de medições muito grande. Selecione um período menor.');
        addReadingsToBuckets(buckets, data.map(row => ({ id: row.id, stationId: row.station_id,
          levelMeters: numeric(row.level_meters), readAt: row.read_at })), range);
        const nextCursor = data[data.length - 1].read_at;
        if (!nextCursor || (cursor && Date.parse(nextCursor) <= Date.parse(cursor))) throw new Error('A consulta não avançou. Tente um período menor.');
        cursor = nextCursor;
      }
      return calculateDisplayedVariations(buckets);
    },
    subscribeToNewReadings(onReading: (reading: RiverReading) => void, onStatus: (status: ConnectionStatus) => void = () => {}) {
      if (!client) { onStatus('unconfigured'); return () => {}; }
      onStatus('connecting');
      const channel = client.channel('river-readings-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'river_readings' }, payload => {
          const reading = mapReading(payload.new);
          if (isValidReading(reading)) onReading(reading);
        }).subscribe(status => { onStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected'); });
      return () => { void client.removeChannel(channel); };
    },
  };
}
