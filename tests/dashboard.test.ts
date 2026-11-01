import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucketsInWindow, summarizeEvolution, summarizeStations } from '../src/lib/dashboard';
import { addReadingsToBuckets, calculateDisplayedVariations, createBuckets } from '../src/lib/hydrology';
import { MONITORED_STATIONS, type StationData } from '../src/types/river';

const now = Date.parse('2026-11-01T15:00:00Z');
function stations(): StationData[] {
  return MONITORED_STATIONS.map((station, index) => ({ station, isLoading: false, error: null, latestReading: {
    id: station.id, stationId: station.id, levelMeters: 10 - index * 3, readAt: '2026-11-01T14:30:00Z',
    situation: index === 2 ? 'alerta' : 'normal', trend: 'estavel', variationMeters: 0, createdAt: '2026-11-01T14:30:00Z',
  } }));
}

test('indicators rank source situations independently of absolute levels and identify both recent extremes', () => {
  const result = summarizeStations(stations(), now);
  assert.equal(result.available, 3);
  assert.equal(result.recent, 3);
  assert.equal(result.highest?.station.id, MONITORED_STATIONS[0].id);
  assert.equal(result.lowest?.station.id, MONITORED_STATIONS[2].id);
  assert.equal(result.critical, 'alerta');
  assert.equal(result.incomplete, false);
});

test('stale, absent, invalid, future, pending and failed readings cannot confirm the general situation', () => {
  for (const condition of ['stale', 'absent', 'invalid', 'future', 'pending', 'failed', 'unknown']) {
    const data = stations();
    const item = data[0];
    item.latestReading!.situation = 'emergencia'; // Unconfirmed emergencies must not override confirmed situations.
    if (condition === 'stale') item.latestReading!.readAt = '2026-11-01T13:00:00Z';
    if (condition === 'absent') item.latestReading = null;
    if (condition === 'invalid') item.latestReading!.levelMeters = NaN;
    if (condition === 'future') item.latestReading!.readAt = '2026-11-02T14:30:00Z';
    if (condition === 'pending') item.isLoading = true;
    if (condition === 'failed') item.error = 'Sem conexão';
    if (condition === 'unknown') item.latestReading!.situation = 'aguardando';
    const result = summarizeStations(data, now);
    assert.equal(result.incomplete, true, condition);
    assert.equal(result.critical, 'alerta', condition);
    if (condition !== 'unknown') assert.equal(result.highest?.station.id, MONITORED_STATIONS[1].id, condition);
  }
  const data = stations().map(item => ({ ...item, latestReading: null }));
  const result = summarizeStations(data, now);
  assert.equal(result.highest, null); assert.equal(result.lowest, null); assert.equal(result.critical, null);
  assert.equal(result.available, 0); assert.equal(result.incomplete, true);
});

test('24h window excludes readings outside its limits without inventing values or removing hourly gaps', () => {
  const range = { start: '2026-10-31T15:00:00Z', end: '2026-11-01T15:00:00Z' };
  const buckets = createBuckets(range, 60);
  addReadingsToBuckets(buckets, [
    { id: 'first', stationId: 'fixture', readAt: '2026-10-31T15:07:00Z', levelMeters: 3 },
    { id: 'last', stationId: 'fixture', readAt: '2026-11-01T14:43:00Z', levelMeters: 3.5 },
  ], range);
  const window = bucketsInWindow(calculateDisplayedVariations(buckets), Date.parse('2026-10-31T15:10:00Z'), now);
  assert.equal(window[0].reading, null);
  assert.equal(window.at(-2)?.reading?.readAt, '2026-11-01T14:43:00Z');
  assert.ok(window.some(bucket => !bucket.reading));
  assert.equal(buckets[0].reading?.levelMeters, 3); // No mutation of shared aggregation.
});

test('evolution uses actual endpoints, documents gaps and requires two distinct measurements', () => {
  const range = { start: '2026-11-01T10:00:00Z', end: '2026-11-01T15:00:00Z' };
  const buckets = createBuckets(range, 60);
  assert.equal(summarizeEvolution(buckets), null);
  addReadingsToBuckets(buckets, [{ id: 'a', stationId: 'fixture', readAt: '2026-11-01T10:23:00Z', levelMeters: 3 }], range);
  assert.equal(summarizeEvolution(buckets), null);
  addReadingsToBuckets(buckets, [{ id: 'b', stationId: 'fixture', readAt: '2026-11-01T14:43:00Z', levelMeters: 3.5 }], range);
  assert.deepEqual(summarizeEvolution(buckets)?.delta, 0.5);
  assert.equal(summarizeEvolution(buckets)?.trend, 'Subida no período');
  assert.equal(summarizeEvolution(buckets)?.gaps, true);
  buckets.at(-2)!.reading!.levelMeters = 2;
  assert.equal(summarizeEvolution(buckets)?.trend, 'Descida no período');
  buckets.at(-2)!.reading!.levelMeters = 3;
  assert.equal(summarizeEvolution(buckets)?.trend, 'Sem alteração entre extremos');
});
