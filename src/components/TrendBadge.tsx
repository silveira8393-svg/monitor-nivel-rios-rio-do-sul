import React from 'react';
import { TrendType } from '../types/river';
import { TrendingUp, TrendingDown, Minus, HelpCircle } from 'lucide-react';

interface TrendBadgeProps {
  trend: TrendType;
  variationMeters?: number | null;
  className?: string;
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({
  trend,
  variationMeters,
  className = '',
}) => {
  const formatVariation = (val: number | null | undefined) => {
    if (val === null || val === undefined) return null;
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)} m`;
  };

  const variationText = formatVariation(variationMeters);

  switch (trend) {
    case 'subindo':
      return (
        <div
          id="badge-trend-subindo"
          className={`inline-flex items-center gap-1 text-xs font-medium text-rose-700 dark:text-rose-400 ${className}`}
        >
          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200/80 dark:border-rose-800/50">
            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
            <span>Subindo</span>
            {variationText && (
              <span className="font-semibold ml-0.5 text-rose-800 dark:text-rose-300">
                ({variationText})
              </span>
            )}
          </div>
        </div>
      );
    case 'baixando':
      return (
        <div
          id="badge-trend-baixando"
          className={`inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ${className}`}
        >
          <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800/50">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
            <span>Baixando</span>
            {variationText && (
              <span className="font-semibold ml-0.5 text-emerald-800 dark:text-emerald-300">
                ({variationText})
              </span>
            )}
          </div>
        </div>
      );
    case 'estavel':
      return (
        <div
          id="badge-trend-estavel"
          className={`inline-flex items-center gap-1 text-xs font-medium text-sky-700 dark:text-sky-400 ${className}`}
        >
          <div className="flex items-center gap-1 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-sky-200/80 dark:border-sky-800/50">
            <Minus className="w-3.5 h-3.5 text-sky-600" />
            <span>Estável</span>
            {variationText && (
              <span className="font-semibold ml-0.5 text-sky-800 dark:text-sky-300">
                ({variationText})
              </span>
            )}
          </div>
        </div>
      );
    case 'indeterminado':
    default:
      return (
        <div
          id="badge-trend-indeterminado"
          className={`inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ${className}`}
        >
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span>Aguardando dados</span>
          </div>
        </div>
      );
  }
};
