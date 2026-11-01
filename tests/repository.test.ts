import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createRiverRepository, mapReading } from '../src/services/riverRepository';

const range = { start: '2026-10-01T03:00:00Z', end: '2026-10-31T03:00:00Z' };
function repository(fetcher: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  return createRiverRepository(createClient('https://fixtures.invalid', 'fixture-public-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, init) => fetcher(new URL(String(url)), init) },
  }));
}
test('history pages through server caps, aggregates incrementally and does not truncate after a short page', async () => {
  const source = Array.from({ length: 2880 }, (_, index) => ({ id: String(index), station_id: 'ponte-dom-tito-buss', level_meters: index / 1000, read_at: new Date(Date.parse(range.start) + index * 900000).toISOString() }));
  let requests = 0;
  const service = repository(url => {
    requests++;
    assert.equal(url.searchParams.get('station_id'), 'eq.ponte-dom-tito-buss');
    assert.equal(url.searchParams.get('limit'), '500');
    const filters = url.searchParams.getAll('read_at');
    assert.ok(filters.includes(`gte.${range.start}`)); assert.ok(filters.includes(`lte.${range.end}`));
    const after = filters.find(value => value.startsWith('gt.'))?.slice(3);
    return new Response(JSON.stringify(source.filter(row => !after || row.read_at > after).slice(0, 317)), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const buckets = await service.getStationHistory('ponte-dom-tito-buss', range, 60);
  assert.ok(requests > 8);
  const valid = buckets.filter(bucket => bucket.reading);
  assert.equal(valid.length, 720);
  assert.equal(valid[0].reading?.id, '3');
  assert.equal(valid.at(-1)?.reading?.id, '2879');
});
test('history errors reject and are distinguishable from a successful empty period', async () => {
  const failed = repository(() => new Response(JSON.stringify({ message: 'fixture failure' }), { status: 403 }));
  await assert.rejects(failed.getStationHistory('ponte-dom-tito-buss', range, 60), /Erro de comunicação/);
  const empty = repository(() => new Response('[]', { status: 200 }));
  assert.ok((await empty.getStationHistory('ponte-dom-tito-buss', range, 60)).every(bucket => bucket.reading === null));
  await assert.rejects(createRiverRepository(null).getStationHistory('station', range, 60), /não configurada/);
});
test('failure halfway through history does not return a misleading partial series', async () => {
  let requests = 0;
  const service = repository(() => ++requests === 1 ? new Response(JSON.stringify([{ id: '1', station_id: 'station', level_meters: 2, read_at: range.start }])) : new Response('{}', { status: 403 }));
  await assert.rejects(service.getStationHistory('station', range, 60));
});
test('latest readings preserve independent per-station errors and missing official classification stays unknown', async () => {
  const service = repository(url => url.searchParams.get('station_id')?.includes('dom-tito')
    ? new Response(JSON.stringify([{ id: '1', station_id: 'ponte-dom-tito-buss', level_meters: 2, read_at: range.start }]))
    : new Response('{}', { status: 403 }));
  const result = await service.getLatestReadings();
  assert.equal(result['ponte-dom-tito-buss'].reading?.levelMeters, 2);
  assert.equal(result['ponte-dom-tito-buss'].reading?.situation, 'aguardando');
  assert.ok(result['ponte-br-470'].error);
  assert.equal(mapReading({ level_meters: '' }).levelMeters, null);
});
test('cancelled history stops before requesting another page', async () => {
  const controller = new AbortController();
  controller.abort();
  let requests = 0;
  const service = repository(() => { requests++; return new Response('[]'); });
  await assert.rejects(service.getStationHistory('station', range, 60, controller.signal));
  assert.equal(requests, 0);
});
