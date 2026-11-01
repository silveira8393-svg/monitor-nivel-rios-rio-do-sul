import React, { useCallback, useState } from 'react';
import type { StationData } from '../types/river';
import { SituationBadge } from './SituationBadge';
import { TrendBadge } from './TrendBadge';
import { StationHistoryModal } from './StationHistoryModal';
import { Clock, ExternalLink, History, TriangleAlert, Activity } from 'lucide-react';
import { formatDateTime, formatMeters, getFreshness, isValidReading } from '../lib/hydrology';
import { monitoringConfig } from '../config/monitoring';
import { RiverTimeline, type TimelineSeries } from './RiverTimeline';
import { emptyHistory, type DashboardHistory } from '../hooks/useDashboardHistory';

export function StationCard({ data, now, history = emptyHistory, series }: { data: StationData; now: number; history?: DashboardHistory; series?: TimelineSeries }) {
  const { station, latestReading, isLoading, error } = data;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);
  const hasData = latestReading !== null && isValidReading(latestReading);
  const freshness = getFreshness(latestReading?.readAt ?? null, now, monitoringConfig.stationStaleAfterMinutes[station.id] ?? monitoringConfig.staleAfterMinutes);
  const future = hasData && Date.parse(latestReading.readAt!) > now;
  const uncertain = freshness.stale || future || Boolean(error);
  const age = freshness.ageMinutes;
  const ageLabel = age === null ? '' : age < 1 ? 'há menos de 1 minuto' : age < 60 ? `há ${age} min` : `há ${Math.floor(age / 60)} h${age % 60 ? ` e ${age % 60} min` : ''}`;
  return <>
    <article id={`station-card-${station.id}`} className="station-card">
      <header className="station-card-heading"><span className="station-icon"><svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 20V8h3v12M19 20V8h3v12M2 16h20M5 8h14M8 8l-2 8M10 8v8M14 8v8M16 8l2 8" /></svg></span><h3>{station.name}</h3>
        {hasData && <div className="station-situation"><span className="sr-only">Situação na medição</span><SituationBadge situation={latestReading.situation} /></div>}
      </header>
      <div className="station-visual">
        <div className="station-reading">{isLoading && !hasData ? <p role="status" className="chart-message">Consultando leituras…</p>
          : hasData ? <><p className="station-level-label">{uncertain ? 'Último nível disponível' : 'Nível medido'}</p>
            <p className="station-level">{formatMeters(latestReading.levelMeters).slice(0, -2)}<span> m</span></p>
            <span className="sr-only">Tendência da medição</span><TrendBadge trend={latestReading.trend} />
            <p className={`station-freshness ${uncertain ? 'text-amber-800' : 'text-slate-500'}`}>{future ? 'Horário não confirmado' : freshness.stale ? 'Medição desatualizada' : error ? 'Consulta indisponível' : 'Dados recentes'}</p>
          </> : <p className="chart-message">{error ? 'Consulta indisponível' : 'Sem medições disponíveis'}</p>}</div>
        <section aria-label={`Minigráfico de ${station.name}`} className="station-history-preview">
          {history.isLoading ? <p role="status" className="chart-message">Consultando histórico…</p> : history.error ? <p className="chart-message text-amber-800!">{history.error}</p>
            : series ? <RiverTimeline series={[series]} start={now - 86400000} end={now} compact /> : <p className="chart-message">Sem medições nas últimas 24 horas.</p>}
          <p className="mini-chart-caption">Últimas 24 horas · 1 h · horários reais · São Paulo</p>
          <p className="mini-chart-caption">Lacunas sem conexão.{series && !history.error && !history.isLoading ? ` ${series.buckets.filter(bucket => !bucket.reading).length} faixas sem medição.` : ''}</p>
        </section>
      </div>
      <div className="station-metadata">{hasData && <>
        <p><Clock size={14} /><span>Horário da leitura: <strong>{formatDateTime(latestReading.readAt)}</strong></span></p>
        <p className="station-age">{future ? 'Horário posterior ao relógio do painel' : ageLabel} · São Paulo</p>
        <p><Activity size={14} /><span>Variação registrada: <strong>{formatMeters(latestReading.variationMeters, true)}</strong></span></p>
        {uncertain && <p className="station-warning">{freshness.stale || future ? 'Esta medição não confirma a condição atual do rio.' : 'Última leitura preservada; a consulta mais recente falhou.'}</p>}
      </>}{error && <p role="alert" className="station-warning"><TriangleAlert size={14} />{error}</p>}</div>
      <footer className="station-card-actions"><button className="station-action" onClick={() => setIsHistoryOpen(true)}><History size={16} />Ver histórico</button>
        <a className="station-action" href={station.referenceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Fonte oficial</a></footer>
    </article>
    {isHistoryOpen && <StationHistoryModal stationId={station.id} stationName={station.name} latestReadAt={latestReading?.readAt ?? null} onClose={closeHistory} />}
  </>;
}
