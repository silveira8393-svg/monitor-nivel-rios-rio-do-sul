import React from 'react';
import { Waves, RefreshCw, Database, ExternalLink, ShieldAlert, Sparkles } from 'lucide-react';
import { riverService } from '../services/supabase';

interface HeaderProps {
  lastUpdate: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenSupabaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lastUpdate,
  isLoading,
  onRefresh,
  onOpenSupabaseModal,
}) => {
  const isSupabaseReady = riverService.isConfigured();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Main Title & Context */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-xs flex-shrink-0">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  id="main-app-title"
                  className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight"
                >
                  Monitor de Nível dos Rios – Rio do Sul
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <ShieldAlert className="w-3 h-3 text-sky-600" />
                  SC
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                <span>Monitoramento oficial integrado com</span>
                <a
                  href="https://defesacivil.riodosul.sc.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 underline inline-flex items-center gap-0.5"
                >
                  Defesa Civil de Rio do Sul
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          {/* Action Bar & Timestamps */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-stretch sm:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
            {/* Last update text */}
            <div className="text-left sm:text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Última atualização
              </span>
              <span
                id="last-update-time"
                className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                {lastUpdate
                  ? lastUpdate.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : 'Aguardando dados'}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              id="btn-refresh-readings"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-lg transition-colors disabled:opacity-50"
              title="Atualizar leituras"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            {/* Supabase Status / Architecture Guide Button */}
            <button
              id="btn-open-supabase-modal"
              onClick={onOpenSupabaseModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors border shadow-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 dark:text-white border-transparent"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Arquitetura Supabase</span>
              {isSupabaseReady ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
