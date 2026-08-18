import React from 'react';
import { X, CalendarClock, LoaderCircle, TriangleAlert } from 'lucide-react';
import { StationHistoryRow } from '../services/supabase';

interface StationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationName: string;
  rows: StationHistoryRow[];
  isLoading: boolean;
  error: string | null;
}

function formatDateBr(dateIso: string | null): string {
  if (!dateIso) return '—';

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTimeBr(dateIso: string | null): string {
  if (!dateIso) return '—';

  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMeters(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(2).replace('.', ',')} m`;
}

function formatVariation(value: number | null): string {
  if (value === null || value === undefined) return '—';

  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  const absolute = Math.abs(value).toFixed(2).replace('.', ',');
  return `${sign}${absolute} m`;
}

export const StationHistoryModal: React.FC<StationHistoryModalProps> = ({
  isOpen,
  onClose,
  stationName,
  rows,
  isLoading,
  error,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                Histórico — {stationName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Últimos registros da estação
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar histórico"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[75vh] overflow-auto">
          {isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <LoaderCircle className="w-6 h-6 animate-spin mb-3" />
              <span className="text-sm">Carregando histórico...</span>
            </div>
          ) : error ? (
            <div className="py-10 flex flex-col items-center justify-center text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900">
              <TriangleAlert className="w-6 h-6 mb-3" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <span className="text-sm">Sem histórico disponível para esta estação.</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Data</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Hora</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Nível do rio</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateBr(row.readAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatTimeBr(row.readAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{formatMeters(row.levelMeters)}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{formatVariation(row.variationMeters)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
