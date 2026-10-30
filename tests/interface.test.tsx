import { dom } from './dom';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { StationHistoryModal } from '../src/components/StationHistoryModal';
import { StationCard } from '../src/components/StationCard';
import { HistoryChart } from '../src/components/HistoryChart';
import { useRiverReadings } from '../src/hooks/useRiverReadings';
import { riverService } from '../src/services/supabase';
import { MONITORED_STATIONS, type RiverReading } from '../src/types/river';
import { addReadingsToBuckets, calculateDisplayedVariations, createBuckets, formatDateTime, formatMeters, type HistoryBucket } from '../src/lib/hydrology';
import type { ConnectionStatus } from '../src/services/riverRepository';

// Fixtures exist exclusively in tests; no demo measurements enter production code.
const container = document.getElementById('root')!;
let root: Root;
async function mount(element: React.ReactNode) { root = createRoot(container); await act(async () => { root.render(element); }); }
async function unmount() { if (root) await act(async () => root.unmount()); }
async function click(element: Element) { await act(async () => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); }
async function select(element: HTMLSelectElement, value: string) { await act(async () => { element.value = value; element.dispatchEvent(new dom.window.Event('change', { bubbles: true })); }); }
async function setInput(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
}
after(() => dom.window.close());

test('table pages stay inside the selected chart segment and reset when navigating segments or filters', async () => {
  const original = riverService.getStationHistory;
  let aggregated: HistoryBucket[] = [];
  riverService.getStationHistory = async (_station, range, interval) => {
    const buckets = createBuckets(range, interval);
    // Keep gaps and real timestamps away from bucket boundaries.
    addReadingsToBuckets(buckets, buckets.flatMap((bucket, index) => {
      const time = Math.max(Date.parse(bucket.start), Date.parse(range.start)) + 60000;
      return index % 7 === 3 || time > Date.parse(range.end) ? [] : [{
        id: String(index), stationId: 'fixture', levelMeters: 2 + index / 100, readAt: new Date(time).toISOString(),
      }];
    }), range);
    aggregated = calculateDisplayedVariations(buckets);
    return aggregated;
  };
  const button = (text: string) => [...container.querySelectorAll('button')].find(item => item.textContent === text)!;
  const check = (segment: number, page = 0) => {
    const end = aggregated.length - segment * 240;
    const segmentBuckets = aggregated.slice(Math.max(0, end - 240), end);
    const expectedRows = [...segmentBuckets].reverse().slice(page * 25, (page + 1) * 25);
    assert.deepEqual([...container.querySelectorAll('tbody tr')].map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent)),
      expectedRows.map(bucket => {
        const [date, time] = formatDateTime(bucket.reading?.readAt ?? bucket.start).split(', ');
        return [date, bucket.reading ? time : `${time}até ${formatDateTime(bucket.end)}`,
          bucket.reading ? formatMeters(bucket.reading.levelMeters) : 'Sem medição', formatMeters(bucket.variationMeters, true)];
      }));
    assert.deepEqual([...container.querySelectorAll('circle title')].map(title => title.textContent),
      segmentBuckets.flatMap(bucket => bucket.reading ? [`${formatDateTime(bucket.reading.readAt)}: ${formatMeters(bucket.reading.levelMeters)}`] : []));
    assert.equal(container.querySelectorAll('svg rect').length, segmentBuckets.filter(bucket => !bucket.reading).length);
    assert.ok(container.textContent?.includes(`Página ${page + 1} de ${Math.ceil(segmentBuckets.length / 25)}`));
  };
  try {
    await mount(<StationHistoryModal stationId="fixture" stationName="Fixture" latestReadAt={null} onClose={() => {}} />);
    const selects = container.querySelectorAll('select');
    check(0);
    await select(selects[0], '7d');
    await select(selects[1], '15');
    await click(button('Próxima'));
    await click(button('← Anterior'));
    check(1); // Previously the table stayed on the latest segment's second page.
    await click(button('Próxima'));
    check(1, 1);
    // Traverse the partial oldest segment, including its last table page.
    while (!button('← Anterior').disabled) await click(button('← Anterior'));
    const oldest = Math.ceil(aggregated.length / 240) - 1;
    check(oldest);
    let page = 0;
    while (!button('Próxima').disabled) { await click(button('Próxima')); check(oldest, ++page); }
    await click(button('Seguinte →'));
    check(oldest - 1);
    for (const period of ['24h', '7d', '30d']) {
      await select(selects[0], period);
      for (const interval of ['15', '30', '60', '120', '360']) {
        await select(selects[1], interval);
        check(0);
        if (!button('Próxima').disabled) await click(button('Próxima'));
      }
    }
    await select(selects[0], 'custom');
    const inputs = container.querySelectorAll('input');
    const applied = aggregated;
    await setInput(inputs[0], '2026-10-01T00:07');
    await setInput(inputs[1], '2026-10-08T10:43');
    assert.equal(aggregated, applied); // Draft dates do not change the applied filter.
    await select(selects[1], '30');
    check(0);
    assert.equal(aggregated[0].start.slice(0, 10), applied[0].start.slice(0, 10));
    await click(button('← Anterior'));
    await click(button('Próxima'));
    await act(async () => container.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    check(0);
    assert.equal(aggregated[0].reading?.readAt, '2026-10-01T03:08:00.000Z');
    assert.ok(aggregated.every(bucket => !bucket.reading || (Date.parse(bucket.reading.readAt!) >= Date.parse('2026-10-01T03:07:00Z')
      && Date.parse(bucket.reading.readAt!) <= Date.parse('2026-10-08T13:43:00Z'))));
    await click(button('← Anterior'));
    check(1);
    await select(selects[1], '120');
    check(0);
  } finally { await unmount(); riverService.getStationHistory = original; }
});

test('history defaults to 24h / 1h; filters update chart and paginated table; custom range validates and applies', async () => {
  const original = riverService.getStationHistory;
  const calls: Array<{ range: { start: string; end: string }; interval: number }> = [];
  riverService.getStationHistory = async (_station, range, interval) => {
    calls.push({ range, interval });
    const buckets = createBuckets(range, interval);
    addReadingsToBuckets(buckets, buckets.map((bucket, index) => ({ id: String(index), stationId: 'station', levelMeters: 2 + index / 100, readAt: bucket.start })), range);
    return calculateDisplayedVariations(buckets);
  };
  try {
    document.getElementById('opener')!.focus();
    await mount(<StationHistoryModal stationId="station" stationName="Estação de teste" latestReadAt={null} onClose={() => {}} />);
    const selects = container.querySelectorAll('select');
    assert.equal(selects[0].value, '24h'); assert.equal(selects[1].value, '60');
    assert.equal(calls[0].interval, 60);
    assert.ok(container.querySelector('svg[role="img"]'));
    assert.ok(container.querySelectorAll('tbody tr').length <= 25);
    await select(selects[0], '30d');
    await select(selects[1], '15');
    assert.equal(calls.at(-1)?.interval, 15);
    assert.ok(container.textContent?.includes('Página 1 de'));
    assert.ok(container.querySelectorAll('circle').length <= 240);
    const next = [...container.querySelectorAll('button')].find(button => button.textContent === 'Próxima')!;
    const before = container.querySelector('tbody tr')?.textContent;
    await click(next);
    assert.notEqual(container.querySelector('tbody tr')?.textContent, before);
    await select(selects[0], '7d');
    assert.equal(selects[1].value, '15');
    assert.ok(container.textContent?.includes('Página 1 de'));
    await select(selects[0], 'custom');
    const inputs = container.querySelectorAll('input');
    // Native form submit reads the current controlled state. Set inputs with the native setter.
    await setInput(inputs[0], '2026-10-30T10:00');
    await setInput(inputs[1], '2026-10-29T10:00');
    await act(async () => container.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.ok(container.querySelector('[role="alert"]'));
    await setInput(inputs[1], '2026-10-31T10:00');
    await act(async () => container.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(calls.at(-1)?.range.start, '2026-10-30T13:00:00.000Z');
  } finally { await unmount(); riverService.getStationHistory = original; }
  assert.equal(document.activeElement?.id, 'opener');
  assert.equal(document.body.style.overflow, '');
});
test('history communicates errors, retries, and explicitly shows gaps without a connecting line', async () => {
  const original = riverService.getStationHistory;
  let fail = true;
  riverService.getStationHistory = async (_id, range, interval) => {
    if (fail) throw new Error('Falha simulada de comunicação');
    return createBuckets(range, interval);
  };
  try {
    await mount(<StationHistoryModal stationId="station" stationName="Estação de teste" latestReadAt={null} onClose={() => {}} />);
    assert.match(container.querySelector('[role="alert"]')!.textContent!, /Falha simulada/);
    assert.equal(container.querySelector('table'), null);
    fail = false;
    await click([...container.querySelectorAll('button')].find(button => button.textContent === 'Tentar novamente')!);
    assert.ok(container.textContent?.includes('Sem medições disponíveis neste período'));
    assert.equal(container.querySelectorAll('path[fill="none"][stroke-width="2.5"]').length, 0);
    assert.ok(container.querySelector('tbody')?.textContent?.includes('Sem medição'));
  } finally { await unmount(); riverService.getStationHistory = original; }
});
test('hook preserves valid data on query errors, ignores old realtime and reconciles after reconnect/visibility/online', async () => {
  const getLatest = riverService.getLatestReadings, subscribe = riverService.subscribeToNewReadings;
  const reading: RiverReading = { id: '1', stationId: MONITORED_STATIONS[0].id, levelMeters: 3, readAt: '2026-10-30T12:00:00Z', situation: 'normal', trend: 'estavel', variationMeters: 0, createdAt: '2026-10-30T12:00:00Z' };
  let state: ReturnType<typeof useRiverReadings>;
  let calls = 0, fail = false, removed = false;
  let incoming: (reading: RiverReading) => void, status: (status: ConnectionStatus) => void;
  riverService.getLatestReadings = async () => { calls++; return Object.fromEntries(MONITORED_STATIONS.map(station => [station.id, { reading: fail ? null : { ...reading, stationId: station.id }, error: fail ? 'Falha simulada' : null }])); };
  riverService.subscribeToNewReadings = (onReading, onStatus) => { incoming = onReading; status = onStatus!; return () => { removed = true; }; };
  function Harness() { state = useRiverReadings(); return null; }
  try {
    await mount(createElement(Harness));
    assert.equal(state!.stations[0].latestReading?.levelMeters, 3);
    await act(async () => incoming({ ...reading, readAt: '2026-10-30T11:00:00Z', levelMeters: 99 }));
    assert.equal(state!.stations[0].latestReading?.levelMeters, 3);
    fail = true;
    await act(async () => state!.refresh());
    assert.equal(state!.stations[0].latestReading?.levelMeters, 3);
    assert.equal(state!.stations[0].error, 'Falha simulada');
    fail = false;
    let before = calls;
    await act(async () => status('connected'));
    assert.ok(calls > before); assert.equal(state!.stations[0].error, null);
    before = calls;
    await act(async () => document.dispatchEvent(new dom.window.Event('visibilitychange')));
    assert.ok(calls > before);
    before = calls;
    await act(async () => window.dispatchEvent(new dom.window.Event('online')));
    assert.ok(calls > before);
    assert.ok(state!.lastQuery);
  } finally { await unmount(); riverService.getLatestReadings = getLatest; riverService.subscribeToNewReadings = subscribe; }
  assert.equal(removed, true);
});
test('station distinguishes stale measurements and preserved data during failures', async () => {
  const reading: RiverReading = { id: '1', stationId: MONITORED_STATIONS[0].id, levelMeters: 3.2, readAt: '2026-10-29T12:00:00Z', situation: 'normal', trend: 'estavel', variationMeters: 0, createdAt: '2026-10-29T12:00:00Z' };
  try {
    await mount(<StationCard data={{ station: MONITORED_STATIONS[0], latestReading: reading, isLoading: false, error: 'Falha temporária' }} now={Date.parse('2026-10-30T12:00:00Z')} />);
    assert.ok(container.textContent?.includes('Medição desatualizada'));
    assert.ok(container.textContent?.includes('29/10/2026'));
    assert.ok(container.textContent?.includes('3,20 m'));
    assert.ok(container.textContent?.includes('Situação na medição'));
    assert.ok(container.querySelector('[role="alert"]'));
  } finally { await unmount(); }
});
test('chart breaks paths over missing intervals and exposes keyboard details', async () => {
  const range = { start: '2026-10-30T03:00:00Z', end: '2026-10-30T05:30:00Z' };
  const buckets = createBuckets(range, 60);
  addReadingsToBuckets(buckets, [{ id: 'a', stationId: 'fixture', levelMeters: 2, readAt: '2026-10-30T03:15:00Z' }, { id: 'b', stationId: 'fixture', levelMeters: 3, readAt: '2026-10-30T05:15:00Z' }], range);
  try {
    await mount(<HistoryChart buckets={calculateDisplayedVariations(buckets)} range={range} page={0} onPageChange={() => {}} />);
    const paths = container.querySelectorAll('path[stroke-width="2.5"]');
    assert.equal(paths.length, 2);
    assert.ok([...paths].every(path => !path.getAttribute('d')?.includes(' L')));
    assert.equal(container.querySelectorAll('rect').length, 1);
    const svg = container.querySelector('svg')!;
    await act(async () => svg.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));
    assert.match(container.querySelector('[aria-live]')!.textContent!, /2,00 m/);
    await act(async () => svg.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    assert.match(container.querySelector('[aria-live]')!.textContent!, /Sem medição/);
  } finally { await unmount(); }
});
test('late response for an old filter cannot replace the new selection', async () => {
  const original = riverService.getStationHistory;
  let finishFirst: (value: ReturnType<typeof createBuckets>) => void = () => {};
  let first = true;
  riverService.getStationHistory = async (_station, range, interval) => {
    if (first) { first = false; return new Promise(resolve => { finishFirst = resolve; }); }
    return createBuckets(range, interval);
  };
  try {
    await mount(<StationHistoryModal stationId="fixture" stationName="Fixture" latestReadAt={null} onClose={() => {}} />);
    assert.ok(container.textContent?.includes('Consultando medições'));
    await select(container.querySelector('select')!, '7d');
    assert.ok(container.querySelector('table'));
    await act(async () => finishFirst([]));
    assert.ok(container.querySelector('tbody tr')); // The old empty array was ignored.
  } finally { await unmount(); riverService.getStationHistory = original; }
});
