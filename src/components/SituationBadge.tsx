import React from 'react';
import { SituationType } from '../types/river';
import { ShieldCheck, AlertCircle, AlertTriangle, Flame, Clock } from 'lucide-react';

interface SituationBadgeProps {
  situation: SituationType;
  className?: string;
}

export const SituationBadge: React.FC<SituationBadgeProps> = ({ situation, className = '' }) => {
  switch (situation) {
    case 'normal':
      return (
        <span
          id="badge-situation-normal"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 ${className}`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Normal</span>
        </span>
      );
    case 'atencao':
      return (
        <span
          id="badge-situation-atencao"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Atenção</span>
        </span>
      );
    case 'alerta':
      return (
        <span
          id="badge-situation-alerta"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60 ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Alerta</span>
        </span>
      );
    case 'emergencia':
      return (
        <span
          id="badge-situation-emergencia"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 animate-pulse ${className}`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Emergência</span>
        </span>
      );
    case 'aguardando':
    default:
      return (
        <span
          id="badge-situation-aguardando"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Aguardando dados</span>
        </span>
      );
  }
};
