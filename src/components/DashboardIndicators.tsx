import React from 'react';
import { Clock3, RadioTower, Waves, ShieldCheck } from 'lucide-react';
import { formatDateTime, formatMeters } from '../lib/hydrology';
import { summarizeStations, situationLabels } from '../lib/dashboard';
import type { StationData } from '../types/river';

export function DashboardIndicators({ stations, now, lastQuery, isLoading }: { stations: StationData[]; now: number; lastQuery: Date | null; isLoading: boolean }) {
  const summary = summarizeStations(stations, now);
  return <section aria-label="Indicadores do monitoramento" className="dashboard-indicators dashboard-container">
    <article className="metric-card"><span className="metric-icon"><Clock3 /></span><div className="metric-content"><h2 className="metric-label">Última consulta ao sistema</h2>
      <p id="last-query-time" className="metric-value metric-date">{lastQuery ? formatDateTime(lastQuery.toISOString()) : 'Ainda não realizada'}</p>
      <p className="metric-note">{isLoading ? 'Consultando o sistema…' : 'Última tentativa · São Paulo'} · Não é o horário da medição.</p></div></article>
    <article className="metric-card"><span className="metric-icon"><RadioTower /></span><div className="metric-content"><h2 className="metric-label">Estações monitoradas</h2>
      <p className="metric-value">{stations.length} <span className="metric-unit">cadastradas</span></p>
      <p className="metric-note">{summary.recent} recentes confirmadas · {stations.length - summary.available} sem dados · {summary.available - summary.recent} antigas ou não confirmadas</p></div></article>
    <article className="metric-card"><span className="metric-icon"><Waves /></span><div className="metric-content"><h2 className="metric-label">Maior nível medido</h2>
      <p className="metric-value metric-level">{summary.highest ? formatMeters(summary.highest.latestReading!.levelMeters) : '—'}</p>
      <p className="metric-note">{summary.highest?.station.name ?? 'Sem leitura recente confirmada'}. Alturas não classificam risco entre estações.</p></div></article>
    <article className={`metric-card ${summary.incomplete ? '' : `metric-situation metric-situation-${summary.critical}`}`}><span className="metric-icon"><ShieldCheck /></span><div className="metric-content"><h2 className="metric-label">Resumo das situações</h2>
      <p className={`metric-value metric-situation-value ${summary.incomplete ? '' : `situation-${summary.critical}`}`}>{summary.incomplete ? 'Resumo incompleto' : situationLabels[summary.critical!]}</p>
      <p className="metric-note">{summary.incomplete ? summary.critical ? `Mais crítica confirmada: ${situationLabels[summary.critical]}. Há dados antigos, ausentes ou não confirmados.` : 'Sem classificação recente confirmada. Há dados antigos, ausentes ou não confirmados.' : 'Classificação registrada pela fonte.'}</p></div></article>
  </section>;
}
