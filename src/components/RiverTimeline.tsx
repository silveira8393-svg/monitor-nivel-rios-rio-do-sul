import React, { useId } from 'react';
import { formatDateTime, formatMeters, type HistoryBucket } from '../lib/hydrology';

export const stationStyles = [
  { color: '#0369a1', dash: undefined },
  { color: '#0f766e', dash: '7 3' },
  { color: '#7c3aed', dash: '2 4' },
];
export interface TimelineSeries { id: string; name: string; color: string; dash?: string; buckets: HistoryBucket[] }

export function RiverTimeline({ series, start, end, compact = false }: { series: TimelineSeries[]; start: number; end: number; compact?: boolean }) {
  const id = useId();
  const width = compact ? 320 : 760, height = compact ? 88 : 280;
  const left = compact ? 6 : 58, right = compact ? 6 : 24, top = 18, bottom = compact ? 78 : 230;
  const values = series.flatMap(item => item.buckets.flatMap(bucket => bucket.reading ? [bucket.reading.levelMeters!] : []));
  if (!values.length) return <p className="chart-message">Sem medições nas últimas 24 horas.</p>;
  const min = Math.min(...values), max = Math.max(...values), padding = Math.max((max - min) * 0.15, 0.1);
  const low = min - padding, high = max + padding;
  const x = (time: number) => left + (time - start) / Math.max(1, end - start) * (width - left - right);
  const y = (level: number) => bottom - (level - low) / Math.max(0.1, high - low) * (bottom - top);
  return <div className={compact ? 'mini-chart' : 'timeline-scroll'} tabIndex={compact ? undefined : 0} aria-label={compact ? undefined : 'Panorama: deslize horizontalmente em telas pequenas'}>
    <svg viewBox={`0 0 ${width} ${height}`} className={compact ? 'w-full h-24' : 'timeline-svg'} role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{compact ? `${series[0].name}: últimas 24 horas` : 'Evolução comparativa das estações nas últimas 24 horas'}</title>
      <desc id={`${id}-description`}>Níveis em metros, horários de São Paulo. Última medição válida por hora; cada ponto mantém seu horário real. Lacunas interrompem as linhas. {series.map(item => `${item.name}: ${item.buckets.filter(bucket => bucket.reading).length} faixas com medição`).join('. ')}.</desc>
      {!compact && [0, 1, 2, 3, 4].map(tick => {
        const level = low + (high - low) * tick / 4;
        return <g key={tick}><line x1={left} x2={width - right} y1={y(level)} y2={y(level)} stroke="#e2e8f0" strokeDasharray="3 5" />
          <text x={left - 10} y={y(level) + 4} textAnchor="end" fontSize="12" fill="#64748b">{level.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</text></g>;
      })}
      {series.map(item => {
        const segments: string[] = [];
        let path = '';
        for (const bucket of item.buckets) {
          if (!bucket.reading) { if (path) segments.push(path); path = ''; continue; }
          path += `${path ? ' L' : 'M'}${x(Date.parse(bucket.reading.readAt!)).toFixed(2)},${y(bucket.reading.levelMeters!).toFixed(2)}`;
        }
        if (path) segments.push(path);
        return <g key={item.id} data-series={item.id}>
          {segments.map((segment, index) => <path key={index} d={segment} fill="none" stroke={item.color} strokeWidth={compact ? 2 : 2.5} strokeDasharray={item.dash} strokeLinecap="round" strokeLinejoin="round" />)}
          {item.buckets.map(bucket => bucket.reading ? <circle key={bucket.start} cx={x(Date.parse(bucket.reading.readAt!))} cy={y(bucket.reading.levelMeters!)} r={compact ? 2 : 3} fill={item.color}>
            <title>{item.name} · {formatDateTime(bucket.reading.readAt)} · {formatMeters(bucket.reading.levelMeters)}</title>
          </circle> : null)}
        </g>;
      })}
      {!compact && [0, 0.25, 0.5, 0.75, 1].map(fraction => <text key={fraction} x={left + fraction * (width - left - right)} y={264} textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'} fontSize="12" fill="#64748b">{formatDateTime(new Date(start + fraction * (end - start)).toISOString())}</text>)}
    </svg>
  </div>;
}
