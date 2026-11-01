import { dom } from './dom';
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../src/App';
import { RiverTimeline } from '../src/components/RiverTimeline';
import { useDashboardHistory } from '../src/hooks/useDashboardHistory';
import { useRiverReadings } from '../src/hooks/useRiverReadings';
import { riverService } from '../src/services/supabase';
import { MONITORED_STATIONS, type RiverReading, type StationData } from '../src/types/river';
import { addReadingsToBuckets, calculateDisplayedVariations, createBuckets } from '../src/lib/hydrology';

const container = document.getElementById('root')!;
let root: Root;
const fixedNow = Date.parse('2026-11-01T15:00:00Z');
const reading = (index: number): RiverReading => ({ id: `r${index}`, stationId: MONITORED_STATIONS[index].id, levelMeters: 3 + index,
  readAt: '2026-11-01T14:45:00Z', situation: index === 1 ? 'atencao' : 'normal', trend: 'subindo', variationMeters: 0.1, createdAt: '2026-11-01T14:46:00Z' });
function fixtureHistory(id: string, range: Parameters<typeof createBuckets>[0], interval: Parameters<typeof createBuckets>[1]) {
  const buckets = createBuckets(range, interval);
  addReadingsToBuckets(buckets, [
    { id: 'a', stationId: id, readAt: new Date(Date.parse(range.start) + 7 * 60000).toISOString(), levelMeters: 2 },
    { id: 'b', stationId: id, readAt: new Date(Date.parse(range.end) - 17 * 60000).toISOString(), levelMeters: 3.5 },
  ], range);
  return calculateDisplayedVariations(buckets);
}
async function mount(element: React.ReactNode) { root = createRoot(container); await act(async () => root.render(element)); }
async function unmount() { await act(async () => root?.unmount()); }
async function click(element: Element) { await act(async () => element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))); }
after(() => dom.window.close());

test('dashboard shares one history per station across cards and overview, updates on realtime and preserves modal filters', async context => {
  context.mock.timers.enable({ apis: ['Date'], now: fixedNow });
  const original = { ...riverService };
  const calls: string[] = [];
  let changed = false;
  let onReading: (value: RiverReading) => void = () => {};
  riverService.getLatestReadings = async () => Object.fromEntries(MONITORED_STATIONS.map((station, index) => [station.id, { reading: reading(index), error: null }]));
  riverService.subscribeToNewReadings = callback => { onReading = callback; return () => {}; };
  riverService.getStationHistory = async (id, range, interval) => {
    calls.push(id);
    const buckets = fixtureHistory(id, range, interval);
    if (changed && id === MONITORED_STATIONS[0].id) [...buckets].reverse().find(bucket => bucket.reading)!.reading = {
      id: 'new', stationId: id, readAt: '2026-11-01T14:55:00Z', levelMeters: 7,
    };
    return buckets;
  };
  try {
    await mount(<StrictMode><App /></StrictMode>);
    assert.equal(calls.length, 3);
    assert.equal(container.querySelectorAll('[aria-label="Indicadores do monitoramento"] article').length, 4);
    assert.match(container.querySelector('#last-query-time')!.textContent!, /01\/11\/2026, 12:00/);
    assert.match(container.querySelector('[aria-label="Indicadores do monitoramento"]')!.textContent!, /Atenção/);
    assert.equal(container.querySelectorAll('.mini-chart svg').length, 3);
    assert.equal(container.querySelectorAll('.timeline-svg [data-series]').length, 3);
    for (const station of MONITORED_STATIONS) {
      const card = container.querySelector(`#station-card-${station.id}`)!;
      assert.match(card.textContent!, /Medições|Nível medido/);
      assert.equal(card.querySelectorAll('.mini-chart circle').length, 2);
      assert.equal(card.querySelectorAll('.mini-chart path').length, 2); // Isolated real points across a gap.
      assert.equal(container.querySelectorAll(`.timeline-svg [data-series="${station.id}"] circle`).length, 2);
    }
    changed = true;
    await act(async () => onReading({ ...reading(0), id: 'new', levelMeters: 7, readAt: '2026-11-01T14:55:00Z' }));
    assert.equal(calls.length, 4); // Only the changed station is queried again.
    assert.equal(calls.at(-1), MONITORED_STATIONS[0].id);
    assert.match(container.querySelector(`#station-card-${MONITORED_STATIONS[0].id}`)!.textContent!, /7,00 m/);
    assert.match(container.querySelector(`#station-card-${MONITORED_STATIONS[0].id} .mini-chart`)!.textContent!, /11:55 · 7,00 m/);
    assert.match(container.querySelector(`.timeline-svg [data-series="${MONITORED_STATIONS[0].id}"]`)!.textContent!, /11:55 · 7,00 m/);
    const historyButton = [...container.querySelectorAll('button')].find(button => button.textContent === 'Ver histórico')!;
    await click(historyButton);
    const dialog = container.querySelector('[role="dialog"]')!;
    const selects = dialog.querySelectorAll('select');
    assert.equal(selects[0].value, '24h'); assert.equal(selects[1].value, '60');
    await act(async () => { selects[0].value = '7d'; selects[0].dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    await act(async () => { selects[1].value = '30'; selects[1].dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert.ok(dialog.querySelector('tbody tr'));
    assert.match(dialog.textContent!, /Página 1 de/);
    assert.equal(container.querySelectorAll('.mini-chart svg').length, 3);
  } finally { await unmount(); Object.assign(riverService, original); }
});

test('dashboard distinguishes loading, empty history and errors; failed queries cannot confirm the overall situation', async context => {
  context.mock.timers.enable({ apis: ['Date'], now: fixedNow });
  const original = { ...riverService };
  let finish: (value: Awaited<ReturnType<typeof riverService.getLatestReadings>>) => void = () => {};
  riverService.getLatestReadings = async () => new Promise(resolve => { finish = resolve; });
  riverService.subscribeToNewReadings = () => () => {};
  riverService.getStationHistory = async (id, range, interval) => {
    if (id === MONITORED_STATIONS[1].id) throw new Error('Erro simulado');
    return createBuckets(range, interval);
  };
  try {
    await mount(<App />);
    assert.match(container.textContent!, /Consultando leituras/);
    assert.match(container.textContent!, /Consultando panorama/);
    assert.equal(container.querySelectorAll('.mini-chart svg').length, 0);
    await act(async () => finish(Object.fromEntries(MONITORED_STATIONS.map((station, index) => [station.id, {
      reading: index === 0 ? { ...reading(index), readAt: '2026-10-31T12:00:00Z' } : index === 1 ? reading(index) : null,
      error: index === 1 ? 'Falha de consulta' : null,
    }]))));
    assert.match(container.textContent!, /Resumo incompleto/);
    assert.match(container.textContent!, /Medição desatualizada/);
    assert.match(container.textContent!, /Sem medições disponíveis/);
    assert.match(container.textContent!, /Histórico de 24 horas indisponível/);
    assert.match(container.textContent!, /Sem medições nas últimas 24 horas/);
    assert.match(container.textContent!, /Panorama indisponível ou incompleto/);
    assert.equal(container.querySelectorAll('.timeline-svg circle').length, 0);
  } finally { await unmount(); Object.assign(riverService, original); }
});

test('shared history cancels superseded work, ignores late responses, retries failures and deduplicates successful refreshes', async context => {
  context.mock.timers.enable({ apis: ['Date'], now: fixedNow });
  const original = riverService.getStationHistory;
  let states: ReturnType<typeof useDashboardHistory>;
  const data: StationData[] = [{ station: MONITORED_STATIONS[0], latestReading: reading(0), isLoading: false }];
  let completeOld: (value: ReturnType<typeof createBuckets>) => void = () => {};
  let calls = 0, signal: AbortSignal | undefined, fail = false;
  riverService.getStationHistory = async (id, range, interval, requestedSignal) => {
    calls++;
    if (calls === 1) { signal = requestedSignal; return new Promise(resolve => { completeOld = resolve; }); }
    if (fail) throw new Error('Erro simulado');
    return fixtureHistory(id, range, interval);
  };
  function Harness({ stations, queriedAt }: { stations: StationData[]; queriedAt: number }) { states = useDashboardHistory(stations, new Date(queriedAt)); return null; }
  try {
    await mount(<Harness stations={data} queriedAt={fixedNow} />);
    assert.equal(states![data[0].station.id].isLoading, true);
    const newer = [{ ...data[0], latestReading: { ...reading(0), readAt: '2026-11-01T14:55:00Z' } }];
    await act(async () => root.render(<Harness stations={newer} queriedAt={fixedNow + 1} />));
    assert.equal(signal?.aborted, true);
    assert.equal(calls, 2);
    const successful = states![data[0].station.id];
    await act(async () => completeOld([]));
    assert.equal(states![data[0].station.id], successful);
    await act(async () => root.render(<Harness stations={newer} queriedAt={fixedNow + 2} />));
    assert.equal(calls, 2);
    context.mock.timers.tick(5 * 60000);
    fail = true;
    await act(async () => root.render(<Harness stations={newer} queriedAt={fixedNow + 5 * 60000} />));
    assert.equal(calls, 3);
    assert.match(states![data[0].station.id].error!, /indisponível/);
    fail = false;
    await act(async () => root.render(<Harness stations={newer} queriedAt={fixedNow + 5 * 60000 + 1} />));
    assert.equal(calls, 4);
    assert.equal(states![data[0].station.id].error, null);
  } finally { await unmount(); riverService.getStationHistory = original; }
});

test('comparison renders real timestamps, separate segments and distinct line styles; never fills missing readings', async () => {
  const range = { start: '2026-11-01T10:00:00Z', end: '2026-11-01T15:00:00Z' };
  const buckets = fixtureHistory('fixture', range, 60);
  try {
    await mount(<RiverTimeline start={Date.parse(range.start)} end={Date.parse(range.end)} series={[{ id: 'fixture', name: 'Estação teste', color: '#0369a1', dash: '7 3', buckets }]} />);
    assert.equal(container.querySelectorAll('circle').length, 2);
    assert.equal(container.querySelectorAll('path').length, 2);
    assert.ok([...container.querySelectorAll('path')].every(path => !path.getAttribute('d')!.includes(' L')));
    assert.equal(container.querySelector('path')!.getAttribute('stroke-dasharray'), '7 3');
    assert.match(container.querySelector('circle title')!.textContent!, /07:07/);
    assert.match(container.querySelector('desc')!.textContent!, /Lacunas interrompem/);
  } finally { await unmount(); }
});

test('last attempted query is recorded even on a rejected request while valid station readings are retained', async context => {
  context.mock.timers.enable({ apis: ['Date'], now: fixedNow });
  const original = { ...riverService };
  let state: ReturnType<typeof useRiverReadings>;
  let fail = false;
  riverService.getLatestReadings = async () => {
    if (fail) throw new Error('Falha simulada');
    return Object.fromEntries(MONITORED_STATIONS.map((station, index) => [station.id, { reading: reading(index), error: null }]));
  };
  riverService.subscribeToNewReadings = () => () => {};
  function Harness() { state = useRiverReadings(); return null; }
  try {
    await mount(<Harness />);
    assert.equal(state!.lastQuery!.getTime(), fixedNow);
    context.mock.timers.tick(60000);
    fail = true;
    await act(async () => state!.refresh());
    assert.equal(state!.lastQuery!.getTime(), fixedNow + 60000);
    assert.equal(state!.stations[0].latestReading?.levelMeters, 3);
    assert.match(state!.stations[0].error!, /preservada/);
  } finally { await unmount(); Object.assign(riverService, original); }
});
