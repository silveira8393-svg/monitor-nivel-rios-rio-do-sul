import React from 'react';
import { Clock3, RadioTower, Waves, ShieldCheck } from 'lucide-react';
import { formatDateTime, formatMeters } from '../lib/hydrology';
import { summarizeStations, situationLabels } from '../lib/dashboard';
import type { StationData } from '../types/river';

export function DashboardIndicators({ stations, now, lastQuery, isLoading }: { stations: StationData[]; now: number; lastQuery: Date | null; isLoading: boolean }) {
  const summary = summarizeStations(stations, now);
  return <section aria-label="Indicadores do monitoramento" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <article className="metric-card"><div className="metric-label"><span>Última consulta ao sistema</span><Clock3 size={18} /></div>
      <p id="last-query-time" className="metric-value text-lg!">{lastQuery ? formatDateTime(lastQuery.toISOString()) : 'Ainda não realizada'}</p>
      <p className="metric-note">{isLoading ? 'Consultando o sistema…' : 'Última tentativa · horário de São Paulo'}</p><p className="metric-note">Não é o horário da medição.</p></article>
    <article className="metric-card"><div className="metric-label"><span>Estações monitoradas</span><RadioTower size={18} /></div>
      <p className="metric-value">{stations.length.toString().padStart(2, '0')} <span className="text-sm font-medium text-slate-500">cadastradas</span></p>
      <p className="metric-note">{summary.recent} com leitura recente confirmada</p><p className="metric-note">{stations.length - summary.available} sem dados · {summary.available - summary.recent} antigas ou não confirmadas</p></article>
    <article className="metric-card"><div className="metric-label"><span>Maior nível medido</span><Waves size={18} /></div>
      <p className="metric-value">{summary.highest ? formatMeters(summary.highest.latestReading!.levelMeters) : '—'}</p>
      <p className="metric-note">{summary.highest?.station.name ?? 'Sem leitura recente confirmada'}</p><p className="metric-note">Alturas não classificam o risco entre estações.</p></article>
    <article className="metric-card"><div className="metric-label"><span>Resumo das situações</span><ShieldCheck size={18} /></div>
      <p className={`metric-value text-xl! ${summary.incomplete ? 'text-slate-700' : `situation-${summary.critical}`}`}>{summary.incomplete ? 'Resumo incompleto' : situationLabels[summary.critical!]}</p>
      <p className="metric-note">{summary.critical ? `Mais crítica entre as confirmadas: ${situationLabels[summary.critical]}.` : 'Sem classificação recente confirmada.'}</p>
      <p className="metric-note">{summary.incomplete ? 'Há dados antigos, ausentes ou não confirmados.' : 'Classificação registrada pela fonte.'}</p></article>
  </section>;
}
