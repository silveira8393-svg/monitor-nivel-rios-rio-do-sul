import React, { useCallback, useState } from 'react';
import type { StationData } from '../types/river';
import { SituationBadge } from './SituationBadge';
import { TrendBadge } from './TrendBadge';
import { StationHistoryModal } from './StationHistoryModal';
import { Waves, Clock, ExternalLink, History, TriangleAlert } from 'lucide-react';
import { formatDateTime, formatMeters, getFreshness } from '../lib/hydrology';
import { monitoringConfig } from '../config/monitoring';

export function StationCard({ data, now }: { data: StationData; now: number }) {
  const { station, latestReading, isLoading, error } = data;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const closeHistory = useCallback(() => setIsHistoryOpen(false), []);
  const hasData = latestReading !== null && latestReading.levelMeters !== null;
  const freshness = getFreshness(latestReading?.readAt ?? null, now, monitoringConfig.stationStaleAfterMinutes[station.id] ?? monitoringConfig.staleAfterMinutes);
  const uncertain = freshness.stale || Boolean(error);
  const age = freshness.ageMinutes;
  const ageLabel = age === null ? '' : age < 1 ? 'há menos de 1 minuto' : age < 60 ? `há ${age} min` : `há ${Math.floor(age / 60)} h${age % 60 ? ` e ${age % 60} min` : ''}`;
  return <>
    <article id={`station-card-${station.id}`} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      <header className="p-5 border-b border-slate-100 dark:border-slate-800 flex gap-3 items-start">
        <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 shrink-0"><Waves size={20} /></span>
        <h3 className="text-base font-bold leading-snug">{station.name}</h3>
      </header>
      <div className="p-5 flex-1 space-y-4">
        {isLoading && !hasData ? <div role="status" className="py-8 text-sm text-slate-500 flex items-center gap-2"><Clock className="animate-pulse" size={18} />Consultando leituras…</div>
          : hasData ? <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{uncertain ? 'Último nível disponível' : 'Nível medido'}</span>
              <span className={`text-[11px] rounded-full px-2 py-1 font-semibold ${uncertain ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>{freshness.stale ? 'Medição desatualizada' : error ? 'Consulta indisponível' : 'Dados recentes'}</span>
            </div>
            <div className="text-4xl font-extrabold tracking-tight tabular-nums">{formatMeters(latestReading.levelMeters)}</div>
            <div className="flex flex-wrap gap-2 items-center"><span className="text-xs text-slate-500">Situação na medição</span><SituationBadge situation={latestReading.situation} /></div>
            <div className="text-xs text-slate-600 dark:text-slate-300 flex gap-2 items-start"><Clock size={15} className="shrink-0 mt-0.5" /><div><strong>{formatDateTime(latestReading.readAt)}</strong><span className="block text-slate-500 mt-1">{ageLabel} · São Paulo</span></div></div>
            {uncertain && <p className="text-xs text-amber-800 dark:text-amber-300">{freshness.stale ? 'Esta medição não confirma a condição atual do rio.' : 'Última leitura preservada; a consulta mais recente falhou.'}</p>}
          </> : <div className="py-5 text-sm text-slate-500"><p className="font-semibold">{error ? 'Consulta indisponível' : 'Sem medições disponíveis'}</p><p className="mt-2 text-xs">{error ? 'Tente atualizar o painel para consultar novamente.' : 'Ainda não há registros disponíveis para esta estação.'}</p></div>}
        {error && <p role="alert" className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200 flex gap-2"><TriangleAlert size={16} className="shrink-0" />{error}</p>}
      </div>
      {hasData && <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap gap-2 justify-between items-center text-xs"><span className="text-slate-500">Tendência da medição</span><TrendBadge trend={latestReading.trend} /></div>
        <div className="flex justify-between gap-2 text-xs"><span className="text-slate-500">Variação registrada</span><strong>{formatMeters(latestReading.variationMeters, true)}</strong></div>
      </div>}
      <footer className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-3">
        <button className="history-button text-sky-800! dark:text-sky-300! font-semibold" onClick={() => setIsHistoryOpen(true)}><History size={16} />Ver histórico</button>
        <a className="text-xs text-slate-500 hover:text-sky-700 inline-flex items-center gap-1" href={station.referenceUrl} target="_blank" rel="noopener noreferrer">Fonte oficial<ExternalLink size={12} /></a>
      </footer>
    </article>
    {isHistoryOpen && <StationHistoryModal stationId={station.id} stationName={station.name} latestReadAt={latestReading?.readAt ?? null} onClose={closeHistory} />}
  </>;
}
