import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Droplet } from 'lucide-react';
import { summarizeEvolution, summarizeStations } from '../lib/dashboard';
import { formatDateTime, formatMeters } from '../lib/hydrology';
import type { StationData } from '../types/river';
import type { DashboardHistory } from '../hooks/useDashboardHistory';
import type { TimelineSeries } from './RiverTimeline';

export function HydrologySummary({ stations, histories, series, now }: { stations: StationData[]; histories: Record<string, DashboardHistory>; series: TimelineSeries[]; now: number }) {
  const summary = summarizeStations(stations, now);
  return <section aria-labelledby="summary-title" className="dashboard-panel summary-panel">
    <div className="panel-heading"><Droplet size={23} /><h2 id="summary-title" className="section-title">Resumo hidrológico</h2></div>
    <p className="period-caption">Últimas leituras recentes e confirmadas.</p>
    <dl className="summary-extremes">
      {[{ label: 'Maior leitura', item: summary.highest, Icon: ArrowUpRight }, { label: 'Menor leitura', item: summary.lowest, Icon: ArrowDownRight }].map(({ label, item, Icon }) => <div key={label} className="summary-extreme"><Icon size={22} /><div><dt>{label}</dt><span>{item?.station.name ?? 'Sem dados recentes'}</span></div><dd>{item ? formatMeters(item.latestReading!.levelMeters) : '—'}</dd></div>)}
    </dl>
    <details className="summary-evolution-details"><summary className="summary-evolution-title">Evolução nas últimas 24 horas por estação</summary>
    <ul className="summary-evolution">{series.map(item => {
      const history = histories[item.id];
      const evolution = history && !history.isLoading && !history.error ? summarizeEvolution(item.buckets) : null;
      const Icon = evolution ? evolution.delta > 0 ? ArrowUpRight : evolution.delta < 0 ? ArrowDownRight : Minus : Minus;
      return <li key={item.id}><div className="flex gap-2 items-start"><Icon size={18} className="shrink-0 text-sky-700" /><div>
        <h4 className="font-bold text-slate-800 leading-relaxed">{item.name}</h4>
        {evolution ? <><p className="mt-1 text-slate-700">{evolution.trend} · <strong>{formatMeters(evolution.delta, true)}</strong></p>
          <p className="mt-1 text-slate-500 leading-relaxed">De {formatDateTime(evolution.first.readAt)} a {formatDateTime(evolution.last.readAt)}.{evolution.gaps ? ' Há lacunas no período.' : ''}</p></>
          : <p className="mt-1 text-slate-500">{history?.isLoading || !history ? 'Consultando evolução…' : history.error ? 'Evolução indisponível.' : 'Dados insuficientes para comparar.'}</p>}
      </div></div></li>;
    })}</ul></details>
    <p className="panel-footnote">Diferença entre a primeira e a última medição horária disponíveis. Não indica movimento contínuo nem previsão.</p>
  </section>;
}
