import React, { useState } from 'react';
import { StationData } from '../types/river';
import { riverService, StationHistoryRow } from '../services/supabase';
import { SituationBadge } from './SituationBadge';
import { TrendBadge } from './TrendBadge';
import { StationHistoryModal } from './StationHistoryModal';
import { Waves, Clock, ExternalLink, Activity, Info, History } from 'lucide-react';

interface StationCardProps {
  data: StationData;
}

export const StationCard: React.FC<StationCardProps> = ({ data }) => {
  const { station, latestReading, isLoading } = data;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<StationHistoryRow[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const hasData = latestReading !== null && latestReading.levelMeters !== null;

  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const rows = await riverService.getStationHistory(station.id);
      setHistoryRows(rows);
      if (rows.length === 0) {
        setHistoryError('Sem histórico disponível para esta estação.');
      }
    } catch {
      setHistoryError('Erro ao consultar o histórico desta estação.');
      setHistoryRows([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  return (
    <>
      <div
        id={`station-card-${station.id}`}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
      >
      {/* Card Header */}
      <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex-shrink-0">
              <Waves className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {station.name}
            </h2>
          </div>

          <SituationBadge situation={hasData ? latestReading.situation : 'aguardando'} />
        </div>
      </div>

      {/* Main Metric / Level Display */}
      <div className="p-5 flex-1 flex flex-col justify-center min-h-[130px]">
        {isLoading ? (
          <div className="py-6 flex flex-col items-center justify-center text-slate-400">
            <div className="w-7 h-7 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs">Consultando leituras...</span>
          </div>
        ) : hasData ? (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Nível Atual
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                    {latestReading.levelMeters?.toFixed(2)}
                  </span>
                  <span className="text-lg font-semibold text-slate-500 dark:text-slate-400">
                    m
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Awaiting Data State */
          <div className="py-5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700/80 text-center">
            <div className="inline-flex p-2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-400 mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Aguardando dados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[240px] mx-auto">
              Pronto para receber registros via Supabase a cada 15 min.
            </p>
          </div>
        )}
      </div>

      {/* Grid of Details: Horário, Tendência, Variação */}
      <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Horário da leitura:
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {hasData && latestReading.readAt
              ? new Date(latestReading.readAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo',
                })
              : 'Aguardando dados'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            Tendência:
          </span>
          <TrendBadge
            trend={hasData ? latestReading.trend : 'indeterminado'}
            variationMeters={hasData ? latestReading.variationMeters : null}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Variação do nível:
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {hasData && latestReading.variationMeters !== null
              ? `${latestReading.variationMeters > 0 ? '+' : ''}${latestReading.variationMeters.toFixed(2)} m`
              : 'Aguardando dados'}
          </span>
        </div>
      </div>

      {/* Card Footer Reference */}
      <div className="px-5 py-2.5 bg-slate-100/50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 gap-3">
        <span>Fonte: Defesa Civil de Rio do Sul</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenHistory}
            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline"
          >
            <History className="w-3 h-3" />
            <span>Ver histórico</span>
          </button>
          <a
            href={station.referenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline"
          >
            <span>Acessar portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>

      <StationHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        stationName={station.name}
        rows={historyRows}
        isLoading={isHistoryLoading}
        error={historyError}
      />
    </>
  );
};
