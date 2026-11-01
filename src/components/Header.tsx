import React from 'react';
import { Waves, RefreshCw, Database, Radio } from 'lucide-react';
import type { ConnectionStatus } from '../services/riverRepository';

interface Props { isLoading: boolean; onRefresh: () => void; onOpenSupabaseModal: () => void; connection: ConnectionStatus }
export function Header({ isLoading, onRefresh, onOpenSupabaseModal, connection }: Props) {
  const labels: Record<ConnectionStatus, string> = { connected: 'Atualização automática conectada', connecting: 'Conectando atualizações', disconnected: 'Atualização automática desconectada', unconfigured: 'Conexão de dados não configurada' };
  return <header className="dashboard-header">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-4 items-center justify-between">
      <a href="#conteudo" className="flex items-center gap-3" aria-label="Silveira Lab — Monitoramento dos rios"><span className="brand-mark"><Waves size={26} /></span><div><p className="text-sm font-extrabold tracking-[0.14em] text-sky-950">SILVEIRA <span className="text-sky-600">LAB</span></p><p className="text-[11px] text-slate-500 mt-1">Monitoramento dos rios</p></div></a>
      <nav aria-label="Navegação principal" className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-500"><a href="#estacoes" className="text-sky-800">Painel de monitoramento</a><a href="#entenda" className="hover:text-sky-700">Entenda os dados</a></nav>
      <div className="flex flex-wrap gap-2 items-center"><span className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500 mr-2"><Radio size={14} />{labels[connection]}</span>
        <button id="btn-refresh-readings" className="refresh-button" disabled={isLoading} onClick={onRefresh}><RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />{isLoading ? 'Consultando…' : 'Atualizar'}</button>
        <button id="btn-open-supabase-modal" className="history-button" title="Detalhes da conexão" onClick={onOpenSupabaseModal}><Database size={15} /><span className="sr-only">Detalhes da conexão</span></button>
      </div>
      <p className="md:hidden w-full text-[11px] text-slate-500 flex items-center gap-1.5"><Radio size={13} />{labels[connection]}</p>
    </div>
  </header>;
}
