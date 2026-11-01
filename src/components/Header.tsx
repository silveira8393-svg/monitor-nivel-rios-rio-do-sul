import React from 'react';
import { Waves, RefreshCw, Database, Radio, MapPin, ExternalLink } from 'lucide-react';
import type { ConnectionStatus } from '../services/riverRepository';

interface Props { isLoading: boolean; onRefresh: () => void; onOpenSupabaseModal: () => void; connection: ConnectionStatus }
export function Header({ isLoading, onRefresh, onOpenSupabaseModal, connection }: Props) {
  const labels: Record<ConnectionStatus, string> = { connected: 'Atualização automática conectada', connecting: 'Conectando atualizações', disconnected: 'Atualização automática desconectada', unconfigured: 'Conexão de dados não configurada' };
  return <header className="dashboard-header dashboard-container">
    <div className="header-identity"><span className="brand-mark"><Waves size={32} /></span><div>
      <div className="header-title-row"><h1 id="main-app-title">Monitor de Nível dos Rios – Rio do Sul</h1><span className="location-chip"><MapPin size={14} /> SC</span></div>
      <p className="header-description">Painel independente da <strong>Silveira Lab</strong> · Dados da <a href="https://defesacivil.riodosul.sc.gov.br/" target="_blank" rel="noopener noreferrer">Defesa Civil de Rio do Sul <ExternalLink size={12} /></a></p>
    </div></div>
    <div className="header-actions"><div className="header-buttons">
      <button id="btn-refresh-readings" className="refresh-button" disabled={isLoading} onClick={onRefresh}><RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />{isLoading ? 'Consultando…' : 'Atualizar agora'}</button>
      <button id="btn-open-supabase-modal" className="technical-button" onClick={onOpenSupabaseModal}><Database size={17} />Ver detalhes técnicos</button>
    </div><p className="connection-label"><Radio size={12} />{labels[connection]}</p></div>
  </header>;
}
