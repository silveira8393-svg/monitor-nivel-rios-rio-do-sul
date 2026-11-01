import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addReadingsToBuckets, applyRealtimeReading, calculateDisplayedVariations, createBuckets, formatMeters, fromLocalInput, getFreshness, getHistoryRange, toLocalInput, validateRange, type HistoryReading } from '../src/lib/hydrology';
import { MONITORED_STATIONS, type RiverReading } from '../src/types/river';

const range = { start: '2026-10-30T02:30:00Z', end: '2026-10-30T06:30:00Z' };
const row = (readAt: string, levelMeters: number | null): HistoryReading => ({ id: readAt, stationId: 'ponte-dom-tito-buss', readAt, levelMeters });
test('hourly buckets align to São Paulo midnight, not UTC midnight', () => {
  const buckets = createBuckets(range, 60);
  assert.equal(buckets[0].start, '2026-10-30T02:00:00.000Z');
  assert.equal(toLocalInput(buckets[0].start), '2026-10-29T23:00');
  assert.equal(toLocalInput(buckets[1].start), '2026-10-30T00:00');
  const sixHours = createBuckets(range, 360);
  assert.equal(toLocalInput(sixHours[0].start), '2026-10-29T18:00');
  assert.equal(toLocalInput(sixHours[1].start), '2026-10-30T00:00');
});
test('last valid real measurement wins in each interval regardless of input order', () => {
  const buckets = createBuckets(range, 60);
  addReadingsToBuckets(buckets, [row('2026-10-30T03:55:00Z', 3.2), row('2026-10-30T03:15:00Z', 3), row('2026-10-30T03:59:00Z', null), row('2026-10-30T03:58:00Z', NaN)], range);
  assert.equal(buckets[1].reading?.levelMeters, 3.2);
  assert.equal(buckets[1].reading?.readAt, '2026-10-30T03:55:00Z');
});
test('six-hour boundaries remain aligned across historical daylight-saving changes', () => {
  const fallBack = createBuckets({ start: '2019-02-16T21:00:00Z', end: '2019-02-17T10:00:00Z' }, 360);
  assert.deepEqual(fallBack.map(bucket => toLocalInput(bucket.start)), ['2019-02-16T18:00', '2019-02-17T00:00', '2019-02-17T06:00']);
  const spring = createBuckets({ start: '2018-11-03T21:00:00Z', end: '2018-11-04T10:00:00Z' }, 360);
  assert.deepEqual(spring.map(bucket => toLocalInput(bucket.start)), ['2018-11-03T18:00', '2018-11-04T01:00', '2018-11-04T06:00']);
});
test('partial boundary buckets exclude measurements outside the requested range', () => {
  const buckets = createBuckets(range, 60);
  addReadingsToBuckets(buckets, [row('2026-10-30T02:15:00Z', 99), row(range.start, 2), row(range.end, 4), row('2026-10-30T06:31:00Z', 99)], range);
  assert.equal(buckets[0].reading?.levelMeters, 2);
  assert.equal(buckets.at(-1)?.reading?.levelMeters, 4);
});
test('empty intervals remain explicit and displayed variation skips gaps without inventing readings', () => {
  const buckets = createBuckets(range, 60);
  addReadingsToBuckets(buckets, [row('2026-10-30T02:45:00Z', 2), row('2026-10-30T05:45:00Z', 2.4)], range);
  const result = calculateDisplayedVariations(buckets);
  assert.equal(result[0].variationMeters, null);
  assert.equal(result[1].reading, null);
  assert.equal(result[1].variationMeters, null);
  assert.equal(result[3].variationMeters, 0.4);
  assert.equal(result[4].reading, null);
});
test('changing display interval changes selection and computes variation from selected rows only', () => {
  const measurements = [row('2026-10-30T03:10:00Z', 2), row('2026-10-30T03:40:00Z', 3), row('2026-10-30T04:10:00Z', 4)];
  const hourly = createBuckets(range, 60), halfHourly = createBuckets(range, 30);
  addReadingsToBuckets(hourly, measurements, range); addReadingsToBuckets(halfHourly, measurements, range);
  assert.equal(hourly.filter(bucket => bucket.reading).length, 2);
  assert.equal(halfHourly.filter(bucket => bucket.reading).length, 3);
  assert.equal(calculateDisplayedVariations(hourly).filter(bucket => bucket.reading)[1].variationMeters, 1);
});
test('custom date inputs use São Paulo independently of host zone and reject invalid dates', () => {
  assert.equal(fromLocalInput('2026-10-30T00:15'), '2026-10-30T03:15:00.000Z');
  assert.throws(() => fromLocalInput('2026-02-30T10:00'));
  assert.throws(() => fromLocalInput('2018-11-04T00:30')); // Historical DST gap.
});
test('preset periods, inverted ranges and extensive periods are bounded explicitly', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  assert.equal(getHistoryRange('24h', now).start, '2026-10-29T12:00:00.000Z');
  assert.equal((Date.parse(getHistoryRange('30d', now).end) - Date.parse(getHistoryRange('30d', now).start)) / 86400000, 30);
  assert.throws(() => validateRange({ start: range.end, end: range.start }));
  assert.throws(() => validateRange({ start: '2020-01-01', end: '2026-01-01' }));
  const buckets = createBuckets({ start: '2025-01-01T03:00:00Z', end: '2026-01-01T03:00:00Z' }, 15);
  assert.equal(buckets.length, 365 * 96 + 1);
  assert.ok(buckets.every((bucket, index) => index === 0 || Date.parse(bucket.start) > Date.parse(buckets[index - 1].start)));
});
test('older, duplicate and invalid realtime measurements never replace the latest valid reading', () => {
  const current: RiverReading = { ...row('2026-10-30T06:00:00Z', 3), situation: 'normal', trend: 'estavel', variationMeters: null, createdAt: range.end };
  const stations = MONITORED_STATIONS.map(station => ({ station, latestReading: station.id === current.stationId ? current : null, isLoading: false, error: null }));
  assert.equal(applyRealtimeReading(stations, { ...current, readAt: '2026-10-30T05:00:00Z' })[0].latestReading, current);
  assert.equal(applyRealtimeReading(stations, { ...current, levelMeters: 99 })[0].latestReading, current);
  assert.equal(applyRealtimeReading(stations, { ...current, readAt: 'invalid' })[0].latestReading, current);
  assert.equal(applyRealtimeReading(stations, { ...current, readAt: '2026-10-30T07:00:00Z', levelMeters: 4 })[0].latestReading?.levelMeters, 4);
});
test('freshness has a configurable threshold and Brazilian number formatting', () => {
  const now = Date.parse('2026-10-30T06:00:00Z');
  assert.equal(getFreshness('2026-10-30T04:00:00Z', now).stale, true);
  assert.equal(getFreshness('2026-10-30T04:00:00Z', now, 180).stale, false);
  assert.equal(formatMeters(3.12, true), '+3,12 m');
});
