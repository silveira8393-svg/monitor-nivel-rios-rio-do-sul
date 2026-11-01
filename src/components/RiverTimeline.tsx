import React, { useId } from 'react';
import { formatDateTime, formatMeters, type HistoryBucket } from '../lib/hydrology';

export const stationStyles = [
  { color: '#0085f8', dash: undefined },
  { color: '#079447', dash: '7 3' },
  { color: '#15349e', dash: '2 4' },
];
export interface TimelineSeries { id: string; name: string; color: string; dash?: string; buckets: HistoryBucket[] }

export function RiverTimeline({ series, start, end, compact = false }: { series: TimelineSeries[]; start: number; end: number; compact?: boolean }) {
  const id = useId();
  const width = compact ? 320 : 560, height = compact ? 150 : 250;
  const left = compact ? 48 : 55, right = 14, top = 14, bottom = compact ? 117 : 210;
  const values = series.flatMap(item => item.buckets.flatMap(bucket => bucket.reading ? [bucket.reading.levelMeters!] : []));
  if (!values.length) return <p className="chart-message">Sem medições nas últimas 24 horas.</p>;
  const min = Math.min(...values), max = Math.max(...values), padding = Math.max((max - min) * 0.15, 0.1);
  const low = min - padding, high = max + padding;
  const x = (time: number) => left + (time - start) / Math.max(1, end - start) * (width - left - right);
  const y = (level: number) => bottom - (level - low) / Math.max(0.1, high - low) * (bottom - top);
  return <div className={compact ? 'mini-chart' : 'timeline-scroll'} tabIndex={compact ? undefined : 0} aria-label={compact ? undefined : 'Panorama: deslize horizontalmente em telas pequenas'}>
    <svg viewBox={`0 0 ${width} ${height}`} className={compact ? 'mini-chart-svg' : 'timeline-svg'} role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{compact ? `${series[0].name}: últimas 24 horas` : 'Evolução comparativa das estações nas últimas 24 horas'}</title>
      <desc id={`${id}-description`}>Níveis em metros, horários de São Paulo. Última medição válida por hora; cada ponto mantém seu horário real. Lacunas interrompem as linhas. {series.map(item => `${item.name}: ${item.buckets.filter(bucket => bucket.reading).length} faixas com medição`).join('. ')}.</desc>
      <defs><linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0085f8" stopOpacity="0.22" /><stop offset="100%" stopColor="#0085f8" stopOpacity="0.025" /></linearGradient></defs>
      {(compact ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map(tick => {
        const level = low + (high - low) * tick;
        return <g key={tick}><line x1={left} x2={width - right} y1={y(level)} y2={y(level)} stroke="#e2e8f0" strokeDasharray="3 5" />
          <text x={left - 7} y={y(level) + 4} textAnchor="end" fontSize={compact ? 13 : 14} fill="#526480">{level.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m</text></g>;
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
          {compact && segments.map((segment, index) => {
            const points = segment.match(/-?\d+\.\d+,-?\d+\.\d+/g) ?? [];
            return points.length > 1 ? <polygon key={index} points={`${points[0].split(',')[0]},${bottom} ${points.join(' ')} ${points.at(-1)!.split(',')[0]},${bottom}`} fill={`url(#${id}-area)`} /> : null;
          })}
          {segments.map((segment, index) => <path key={index} d={segment} fill="none" stroke={compact ? '#0085f8' : item.color} strokeWidth="2.5" strokeDasharray={compact ? undefined : item.dash} strokeLinecap="round" strokeLinejoin="round" />)}
          {item.buckets.map(bucket => bucket.reading ? <circle key={bucket.start} cx={x(Date.parse(bucket.reading.readAt!))} cy={y(bucket.reading.levelMeters!)} r={compact ? 2 : 3} fill={compact ? '#0085f8' : item.color}>
            <title>{item.name} · {formatDateTime(bucket.reading.readAt)} · {formatMeters(bucket.reading.levelMeters)}</title>
          </circle> : null)}
        </g>;
      })}
      {(compact ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1]).map(fraction => <text key={fraction} x={left + fraction * (width - left - right)} y={compact ? 140 : 237} textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'} fontSize={compact ? 13 : 14} fill="#526480">{compact ? fraction === 1 ? 'Agora' : fraction === 0 ? '−24 h' : '−12 h' : formatDateTime(new Date(start + fraction * (end - start)).toISOString()).split(', ')[1]}</text>)}
    </svg>
  </div>;
}
