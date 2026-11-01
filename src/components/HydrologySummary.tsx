import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Activity } from 'lucide-react';
import { summarizeEvolution, summarizeStations } from '../lib/dashboard';
import { formatDateTime, formatMeters } from '../lib/hydrology';
import type { StationData } from '../types/river';
import type { DashboardHistory } from '../hooks/useDashboardHistory';
import type { TimelineSeries } from './RiverTimeline';

export function HydrologySummary({ stations, histories, series, now }: { stations: StationData[]; histories: Record<string, DashboardHistory>; series: TimelineSeries[]; now: number }) {
  const summary = summarizeStations(stations, now);
  return <section aria-labelledby="summary-title" className="dashboard-panel h-full">
    <div className="section-eyebrow"><Activity size={15} /> Leitura do período</div>
    <h2 id="summary-title" className="section-title mt-2">Resumo hidrológico</h2>
    <p className="text-xs text-slate-500 mt-2">Extremos entre as últimas leituras recentes e confirmadas.</p>
    <dl className="grid grid-cols-2 gap-4 my-5 pb-5 border-b border-slate-100">
      {[{ label: 'Maior leitura', item: summary.highest }, { label: 'Menor leitura', item: summary.lowest }].map(({ label, item }) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-xl font-extrabold text-sky-950">{item ? formatMeters(item.latestReading!.levelMeters) : '—'}<span className="block mt-1 text-xs font-medium text-slate-500 leading-relaxed">{item?.station.name ?? 'Sem dados recentes'}</span></dd></div>)}
    </dl>
    <ul className="space-y-5">{series.map(item => {
      const history = histories[item.id];
      const evolution = history && !history.isLoading && !history.error ? summarizeEvolution(item.buckets) : null;
      const Icon = evolution ? evolution.delta > 0 ? ArrowUpRight : evolution.delta < 0 ? ArrowDownRight : Minus : Minus;
      return <li key={item.id} className="text-xs"><div className="flex gap-2 items-start"><Icon size={18} className="shrink-0 text-sky-700" /><div>
        <h3 className="font-bold text-slate-800 leading-relaxed">{item.name}</h3>
        {evolution ? <><p className="mt-1 text-slate-700">{evolution.trend} · <strong>{formatMeters(evolution.delta, true)}</strong></p>
          <p className="mt-1 text-slate-500 leading-relaxed">De {formatDateTime(evolution.first.readAt)} a {formatDateTime(evolution.last.readAt)}.{evolution.gaps ? ' Há lacunas no período.' : ''}</p></>
          : <p className="mt-1 text-slate-500">{history?.isLoading || !history ? 'Consultando evolução…' : history.error ? 'Evolução indisponível.' : 'Dados insuficientes para comparar.'}</p>}
      </div></div></li>;
    })}</ul>
    <p className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">Evolução = diferença entre a primeira e a última medição horária disponíveis na janela de 24 horas. Não indica movimento contínuo nem previsão.</p>
  </section>;
}
