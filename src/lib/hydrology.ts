import type { RiverReading, StationData } from '../types/river';

export const TIME_ZONE = 'America/Sao_Paulo';
export const STALE_AFTER_MINUTES = 120;
export const MAX_HISTORY_DAYS = 366;
export const INTERVALS = [15, 30, 60, 120, 360] as const;
export type HistoryInterval = typeof INTERVALS[number];
export type HistoryPeriod = '24h' | '7d' | '30d' | 'custom';
export interface HistoryRange { start: string; end: string }
export interface HistoryReading { id: string; stationId: string; levelMeters: number | null; readAt: string | null }
export interface HistoryBucket { start: string; end: string; reading: HistoryReading | null; variationMeters: number | null }

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
function wallParts(time: number) {
  return Object.fromEntries(partsFormatter.formatToParts(time).map(part => [part.type, part.value]));
}
export function toLocalInput(iso: string): string {
  const p = wallParts(Date.parse(iso));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function offsetAt(time: number): number {
  const p = wallParts(time);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(time / 1000) * 1000;
}
// Resolve wall-clock input independently of the visitor's computer time zone.
export function fromLocalInput(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Informe data e horário válidos.');
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) throw new Error('Informe data e horário válidos.');
  const offsets = [...new Set([-36, -12, 0, 12, 36].map(hours => offsetAt(wall + hours * 3600000)))];
  const matches = offsets.map(offset => wall - offset)
    .filter(time => toLocalInput(new Date(time).toISOString()) === value).sort((a, b) => a - b);
  if (!matches.length) throw new Error('Data ou horário inexistente no fuso de São Paulo.');
  return new Date(matches[0]).toISOString();
}
export function getHistoryRange(period: Exclude<HistoryPeriod, 'custom'>, now = new Date()): HistoryRange {
  const days = { '24h': 1, '7d': 7, '30d': 30 }[period];
  return { start: new Date(now.getTime() - days * 86400000).toISOString(), end: now.toISOString() };
}
export function validateRange(range: HistoryRange): void {
  const start = Date.parse(range.start), end = Date.parse(range.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error('O início deve ser anterior ao fim do período.');
  if (end - start > MAX_HISTORY_DAYS * 86400000) throw new Error(`Consulte até ${MAX_HISTORY_DAYS} dias por vez.`);
}
function floorBucket(time: number, minutes: HistoryInterval): number {
  const p = wallParts(time);
  const remainder = (+p.hour * 60 + +p.minute) % minutes;
  const approximate = time - remainder * 60000 - +p.second * 1000 - ((time % 1000 + 1000) % 1000);
  const corrected = approximate + offsetAt(time) - offsetAt(approximate);
  return corrected <= time ? corrected : approximate;
}
export function createBuckets(range: HistoryRange, interval: HistoryInterval): HistoryBucket[] {
  validateRange(range);
  if (!INTERVALS.includes(interval)) throw new Error('Intervalo de exibição inválido.');
  const result: HistoryBucket[] = [];
  const end = Date.parse(range.end);
  let cursor = floorBucket(Date.parse(range.start), interval);
  while (cursor <= end) {
    let next = floorBucket(cursor + interval * 60000, interval);
    // A repeated local hour can leave the estimate in the same six-hour bucket.
    for (let hour = 1; next <= cursor && hour <= 3; hour++) {
      next = floorBucket(cursor + interval * 60000 + hour * 3600000, interval);
    }
    if (next <= cursor) throw new Error('Não foi possível resolver o intervalo no fuso de São Paulo.');
    result.push({ start: new Date(cursor).toISOString(), end: new Date(next).toISOString(), reading: null, variationMeters: null });
    cursor = next;
  }
  return result;
}
export function isValidReading(reading: HistoryReading): boolean {
  return typeof reading.levelMeters === 'number' && Number.isFinite(reading.levelMeters)
    && Boolean(reading.readAt) && Number.isFinite(Date.parse(reading.readAt!));
}
export function addReadingsToBuckets(buckets: HistoryBucket[], readings: HistoryReading[], range: HistoryRange): void {
  const start = Date.parse(range.start), end = Date.parse(range.end);
  for (const reading of readings) {
    if (!isValidReading(reading)) continue;
    const time = Date.parse(reading.readAt!);
    if (time < start || time > end) continue;
    let low = 0, high = buckets.length - 1;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      const bucket = buckets[middle];
      if (time < Date.parse(bucket.start)) high = middle - 1;
      else if (time >= Date.parse(bucket.end)) low = middle + 1;
      else {
        if (!bucket.reading || time > Date.parse(bucket.reading.readAt!)) bucket.reading = reading;
        break;
      }
    }
  }
}
export function calculateDisplayedVariations(buckets: HistoryBucket[]): HistoryBucket[] {
  let previous: number | null = null;
  return buckets.map(bucket => {
    const level = bucket.reading?.levelMeters ?? null;
    const variationMeters = level !== null && previous !== null ? Number((level - previous).toFixed(2)) : null;
    if (level !== null) previous = level;
    return { ...bucket, variationMeters };
  });
}
export function readingIsNewer(current: RiverReading | null, incoming: RiverReading): boolean {
  return isValidReading(incoming) && (!current || !isValidReading(current)
    || Date.parse(incoming.readAt!) > Date.parse(current.readAt!));
}
export function applyRealtimeReading(stations: StationData[], incoming: RiverReading): StationData[] {
  return stations.map(item => item.station.id === incoming.stationId && readingIsNewer(item.latestReading, incoming)
    ? { ...item, latestReading: incoming, isLoading: false, error: null } : item);
}
export function getFreshness(readAt: string | null, now: number, staleAfter = STALE_AFTER_MINUTES) {
  const time = readAt ? Date.parse(readAt) : NaN;
  const ageMinutes = Number.isFinite(time) ? Math.max(0, Math.floor((now - time) / 60000)) : null;
  return { ageMinutes, stale: ageMinutes === null || ageMinutes >= staleAfter };
}
export function formatDateTime(iso: string | null): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return 'Sem medição';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE, dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}
export function formatMeters(value: number | null, signed = false): string {
  if (value === null) return '—';
  return `${signed && value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
}
