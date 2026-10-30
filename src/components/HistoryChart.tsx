import React, { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { formatDateTime, formatMeters, type HistoryBucket, type HistoryRange } from '../lib/hydrology';

export const CHART_PAGE_SIZE = 240;
export function HistoryChart({ buckets, range }: { buckets: HistoryBucket[]; range?: HistoryRange }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const id = useId();
  const frame = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(840);
  useEffect(() => {
    const element = frame.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const measured = entries[0]?.contentRect.width;
      if (measured) setChartWidth(Math.max(300, Math.round(measured)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const pages = Math.max(1, Math.ceil(buckets.length / CHART_PAGE_SIZE));
  const effectivePage = Math.min(page, pages - 1);
  const end = buckets.length - effectivePage * CHART_PAGE_SIZE;
  const visible = buckets.slice(Math.max(0, end - CHART_PAGE_SIZE), end);
  const levels = visible.flatMap(bucket => bucket.reading ? [bucket.reading.levelMeters!] : []);
  const minimum = levels.length ? Math.min(...levels) : 0;
  const maximum = levels.length ? Math.max(...levels) : 1;
  const padding = Math.max((maximum - minimum) * 0.15, 0.1);
  const bottom = Math.max(0, minimum - padding), top = maximum + padding;
  const width = chartWidth, height = 260, left = 62, right = 20, chartTop = 18, chartBottom = 212;
  const startTime = Math.max(Date.parse(visible[0]?.start ?? '2026-01-01'), range ? Date.parse(range.start) : -Infinity);
  const endTime = Math.min(Date.parse(visible[visible.length - 1]?.end ?? '2026-01-02'), range ? Date.parse(range.end) : Infinity);
  const x = (time: number) => left + (time - startTime) / Math.max(1, endTime - startTime) * (width - left - right);
  const y = (level: number) => chartBottom - (level - bottom) / (top - bottom) * (chartBottom - chartTop);
  const segments: string[] = [];
  let current = '';
  for (const bucket of visible) {
    if (!bucket.reading) { if (current) segments.push(current); current = ''; continue; }
    const point = `${x(Date.parse(bucket.reading.readAt!)).toFixed(2)},${y(bucket.reading.levelMeters!).toFixed(2)}`;
    current += `${current ? ' L' : 'M'}${point}`;
  }
  if (current) segments.push(current);
  const active = selected === null ? null : visible[selected];
  const choosePoint = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const local = (event.clientX - rect.left) / rect.width * width;
    const target = startTime + (local - left) / (width - left - right) * (endTime - startTime);
    let closest = 0;
    for (let i = 1; i < visible.length; i++) {
      const center = (bucket: HistoryBucket) => bucket.reading ? Date.parse(bucket.reading.readAt!) : (Date.parse(bucket.start) + Date.parse(bucket.end)) / 2;
      if (Math.abs(center(visible[i]) - target) < Math.abs(center(visible[closest]) - target)) closest = i;
    }
    setSelected(closest);
  };
  return <section aria-label="Gráfico de evolução do nível" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-bold text-sm">Evolução do nível <span className="font-normal text-slate-500">· metros</span></h3>
      {pages > 1 && <div className="flex items-center gap-2 text-xs">
        <button className="history-button" disabled={effectivePage >= pages - 1} onClick={() => { setPage(effectivePage + 1); setSelected(null); }}>← Anterior</button>
        <span>Trecho {pages - effectivePage} de {pages}</span>
        <button className="history-button" disabled={effectivePage === 0} onClick={() => { setPage(effectivePage - 1); setSelected(null); }}>Seguinte →</button>
      </div>}
    </div>
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 sm:p-4 bg-slate-50/50 dark:bg-slate-950/40">
      <div ref={frame}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[260px] touch-pan-y" role="img" aria-labelledby={id}
        tabIndex={0} onPointerMove={choosePoint} onPointerDown={choosePoint}
        onKeyDown={event => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault(); setSelected(index => Math.max(0, Math.min(visible.length - 1, (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))));
          }
        }}>
        <title id={id}>Nível em metros. Lacunas interrompem a linha. Use as setas para consultar os intervalos.</title>
        {[0, 1, 2, 3, 4].map(tick => {
          const level = bottom + (top - bottom) * tick / 4;
          return <g key={tick}><line x1={left} x2={width - right} y1={y(level)} y2={y(level)} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
            <text x={left - 8} y={y(level) + 4} textAnchor="end" fontSize="12" fill="currentColor" className="text-slate-500">{level.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</text></g>;
        })}
        {visible.map(bucket => !bucket.reading ? <rect key={bucket.start} x={x(Math.max(startTime, Date.parse(bucket.start)))} y={chartTop}
          width={Math.max(1, x(Math.min(endTime, Date.parse(bucket.end))) - x(Math.max(startTime, Date.parse(bucket.start))))} height={chartBottom - chartTop} className="fill-amber-100/60 dark:fill-amber-900/20"><title>Sem medição: {formatDateTime(bucket.start)}</title></rect> : null)}
        {segments.map((path, index) => <path key={index} d={path} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-sky-600 dark:text-sky-400" />)}
        {visible.map((bucket, index) => bucket.reading ? <circle key={bucket.start} cx={x(Date.parse(bucket.reading.readAt!))} cy={y(bucket.reading.levelMeters!)}
          r={selected === index ? 5 : 2.5} className="fill-sky-600 dark:fill-sky-400"><title>{formatDateTime(bucket.reading.readAt)}: {formatMeters(bucket.reading.levelMeters)}</title></circle> : null)}
        {[0, 0.5, 1].map(fraction => <text key={fraction} x={left + fraction * (width - left - right)} y={239} textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}
          fontSize="12" fill="currentColor" className="text-slate-500">{formatDateTime(new Date(startTime + fraction * (endTime - startTime)).toISOString())}</text>)}
      </svg>
      </div>
      <p className="min-h-10 text-xs text-slate-600 dark:text-slate-300" aria-live="polite">
        {active ? active.reading ? <>{formatDateTime(active.reading.readAt)} · <strong>{formatMeters(active.reading.levelMeters)}</strong> · Variação: {formatMeters(active.variationMeters, true)}</>
          : <>Sem medição na faixa {formatDateTime(active.start)} — {formatDateTime(active.end)}.</>
          : 'Passe o cursor, toque no gráfico ou use as setas do teclado para consultar os valores.'}
      </p>
    </div>
    <p className="text-xs text-slate-500">Faixas em âmbar: sem medições. A linha é interrompida nessas faixas. Cada ponto mantém o horário real da leitura. {pages > 1 ? 'Navegue pelos trechos para ver todo o período.' : ''}</p>
  </section>;
}
