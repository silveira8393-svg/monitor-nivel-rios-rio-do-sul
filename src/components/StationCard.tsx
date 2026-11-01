import React, { useCallback, useState } from 'react';
import type { StationData } from '../types/river';
import { SituationBadge } from './SituationBadge';
import { TrendBadge } from './TrendBadge';
import { StationHistoryModal } from './StationHistoryModal';
import { Waves, Clock, ExternalLink, History, TriangleAlert } from 'lucide-react';
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
      <header className="p-5 pb-0 flex gap-3 items-start">
        <span className="p-2 rounded-xl bg-sky-50 text-sky-700 shrink-0"><Waves size={20} /></span>
        <h3 className="text-base font-bold leading-snug">{station.name}</h3>
      </header>
      <div className="p-5 flex-1 space-y-4">
        {isLoading && !hasData ? <div role="status" className="py-8 text-sm text-slate-500 flex items-center gap-2"><Clock className="animate-pulse" size={18} />Consultando leituras…</div>
          : hasData ? <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{uncertain ? 'Último nível disponível' : 'Nível medido'}</span>
              <span className={`text-[11px] rounded-full px-2 py-1 font-semibold ${uncertain ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{future ? 'Horário não confirmado' : freshness.stale ? 'Medição desatualizada' : error ? 'Consulta indisponível' : 'Dados recentes'}</span>
            </div>
            <div className="text-5xl font-extrabold tracking-tight tabular-nums text-sky-950">{formatMeters(latestReading.levelMeters)}</div>
            <div className="flex flex-wrap gap-2 items-center"><span className="text-xs text-slate-500">Situação na medição</span><SituationBadge situation={latestReading.situation} /></div>
            <div className="text-xs text-slate-600 flex gap-2 items-start"><Clock size={15} className="shrink-0 mt-0.5" /><div><strong>{formatDateTime(latestReading.readAt)}</strong><span className="block text-slate-500 mt-1">{future ? 'Horário posterior ao relógio do painel' : ageLabel} · São Paulo</span></div></div>
            {uncertain && <p className="text-xs text-amber-800">{freshness.stale || future ? 'Esta medição não confirma a condição atual do rio.' : 'Última leitura preservada; a consulta mais recente falhou.'}</p>}
          </> : <div className="py-5 text-sm text-slate-500"><p className="font-semibold">{error ? 'Consulta indisponível' : 'Sem medições disponíveis'}</p><p className="mt-2 text-xs">{error ? 'Tente atualizar o painel para consultar novamente.' : 'Ainda não há registros disponíveis para esta estação.'}</p></div>}
        {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 flex gap-2"><TriangleAlert size={16} className="shrink-0" />{error}</p>}
      </div>
      {hasData && <div className="mx-5 px-3 py-3 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
        <div className="flex flex-wrap gap-2 justify-between items-center text-xs"><span className="text-slate-500">Tendência da medição</span><TrendBadge trend={latestReading.trend} /></div>
        <div className="flex justify-between gap-2 text-xs"><span className="text-slate-500">Variação registrada</span><strong>{formatMeters(latestReading.variationMeters, true)}</strong></div>
      </div>}
      <section aria-label={`Minigráfico de ${station.name}`} className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500"><h4 className="font-semibold">Últimas 24 horas</h4><span>Intervalo de 1 hora · m</span></div>
        {history.isLoading ? <p role="status" className="chart-message">Consultando histórico…</p>
          : history.error ? <p className="chart-message text-amber-800!">{history.error}</p>
          : series ? <RiverTimeline series={[series]} start={now - 86400000} end={now} compact /> : <p className="chart-message">Sem medições nas últimas 24 horas.</p>}
        <div className="flex justify-between gap-2 text-[10px] text-slate-500 mb-2"><span>{formatDateTime(new Date(now - 86400000).toISOString())}</span><span>{formatDateTime(new Date(now).toISOString())}</span></div>
        <p className="text-[10px] text-slate-500 leading-relaxed">Horários reais · São Paulo · lacunas sem conexão. {series && !history.error && !history.isLoading ? `${series.buckets.filter(bucket => !bucket.reading).length} faixas sem medição.` : ''}</p>
      </section>
      <footer className="px-5 py-4 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
        <button className="history-button text-sky-800! dark:text-sky-300! font-semibold" onClick={() => setIsHistoryOpen(true)}><History size={16} />Ver histórico</button>
        <a className="text-xs text-slate-500 hover:text-sky-700 inline-flex items-center gap-1" href={station.referenceUrl} target="_blank" rel="noopener noreferrer">Fonte oficial<ExternalLink size={12} /></a>
      </footer>
    </article>
    {isHistoryOpen && <StationHistoryModal stationId={station.id} stationName={station.name} latestReadAt={latestReading?.readAt ?? null} onClose={closeHistory} />}
  </>;
}
