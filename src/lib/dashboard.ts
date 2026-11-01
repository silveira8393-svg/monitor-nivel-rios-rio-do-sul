import { getFreshness, isValidReading, type HistoryBucket } from './hydrology';
import { monitoringConfig } from '../config/monitoring';
import type { StationData, SituationType } from '../types/river';

export const situationLabels: Record<SituationType, string> = { normal: 'Normal', atencao: 'Atenção', alerta: 'Alerta', emergencia: 'Emergência', aguardando: 'Não informada' };
const severity: Record<SituationType, number> = { aguardando: -1, normal: 0, atencao: 1, alerta: 2, emergencia: 3 };

export function hasRecentReading(item: StationData, now: number) {
  const reading = item.latestReading;
  return Boolean(reading && isValidReading(reading) && Date.parse(reading.readAt!) <= now
    && !getFreshness(reading.readAt, now, monitoringConfig.stationStaleAfterMinutes[item.station.id] ?? monitoringConfig.staleAfterMinutes).stale);
}

export function summarizeStations(stations: StationData[], now: number) {
  const available = stations.filter(item => item.latestReading && isValidReading(item.latestReading));
  const recent = stations.filter(item => hasRecentReading(item, now) && !item.error && !item.isLoading);
  const ranked = [...recent].sort((a, b) => b.latestReading!.levelMeters! - a.latestReading!.levelMeters!);
  const classified = recent.filter(item => item.latestReading!.situation !== 'aguardando');
  const critical = [...classified].sort((a, b) => severity[b.latestReading!.situation] - severity[a.latestReading!.situation])[0];
  return {
    available: available.length, recent: recent.length,
    highest: ranked[0] ?? null, lowest: ranked.at(-1) ?? null,
    critical: critical?.latestReading?.situation ?? null,
    incomplete: !stations.length || classified.length !== stations.length,
  };
}

// Keep actual timestamps; hourly gaps remain explicit. Never extend a line over a gap.
export function bucketsInWindow(buckets: HistoryBucket[], start: number, end: number): HistoryBucket[] {
  return buckets.filter(bucket => Date.parse(bucket.end) > start && Date.parse(bucket.start) <= end).map(bucket => {
    const time = Date.parse(bucket.reading?.readAt ?? '');
    return bucket.reading && (!isValidReading(bucket.reading) || time < start || time > end) ? { ...bucket, reading: null, variationMeters: null } : bucket;
  });
}

export function summarizeEvolution(buckets: HistoryBucket[]) {
  const readings = buckets.flatMap(bucket => bucket.reading && isValidReading(bucket.reading) ? [bucket.reading] : []);
  if (readings.length < 2 || Date.parse(readings.at(-1)!.readAt!) <= Date.parse(readings[0].readAt!)) return null;
  const first = readings[0], last = readings.at(-1)!;
  const delta = Number((last.levelMeters! - first.levelMeters!).toFixed(2));
  return { first, last, delta, trend: delta > 0 ? 'Subida no período' : delta < 0 ? 'Descida no período' : 'Sem alteração entre extremos',
    gaps: buckets.some(bucket => !bucket.reading) };
}
