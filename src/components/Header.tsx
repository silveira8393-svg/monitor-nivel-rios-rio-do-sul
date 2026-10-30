import React from 'react';
import { Waves, RefreshCw, Database, ExternalLink } from 'lucide-react';
import { formatDateTime } from '../lib/hydrology';
import type { ConnectionStatus } from '../services/riverRepository';

interface Props { lastQuery: Date | null; isLoading: boolean; onRefresh: () => void; onOpenSupabaseModal: () => void; connection: ConnectionStatus }
export function Header({ lastQuery, isLoading, onRefresh, onOpenSupabaseModal, connection }: Props) {
  const labels: Record<ConnectionStatus, string> = { connected: 'Atualização automática conectada', connecting: 'Conectando atualizações', disconnected: 'Atualização automática desconectada', unconfigured: 'Conexão de dados não configurada' };
  return <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-5 justify-between">
      <div className="flex items-start gap-3"><div className="p-3 rounded-xl bg-sky-700 text-white"><Waves size={26} /></div><div>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-sky-700 dark:text-sky-400 mb-1">Silveira Lab · Acompanhamento hidrológico</p>
        <h1 id="main-app-title" className="text-xl sm:text-2xl font-extrabold tracking-tight">Monitor de Nível dos Rios — Rio do Sul</h1>
        <a href="https://defesacivil.riodosul.sc.gov.br/" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 mt-2 inline-flex gap-1 items-center">Dados da Defesa Civil de Rio do Sul<ExternalLink size={12} /></a>
      </div></div>
      <div className="flex flex-wrap gap-3 items-center lg:justify-end">
        <div className="text-xs text-slate-500"><span className="block">Última consulta ao sistema</span><strong id="last-query-time" className="block text-slate-700 dark:text-slate-200 mt-1">{lastQuery ? formatDateTime(lastQuery.toISOString()) : 'Ainda não realizada'}</strong><span className="block mt-1 max-w-64">{labels[connection]}</span></div>
        <button id="btn-refresh-readings" className="history-button" disabled={isLoading} onClick={onRefresh}><RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />Atualizar</button>
        <button id="btn-open-supabase-modal" className="history-button" title="Detalhes da conexão" onClick={onOpenSupabaseModal}><Database size={15} /><span className="sr-only">Detalhes da conexão</span></button>
      </div>
    </div>
  </header>;
}
