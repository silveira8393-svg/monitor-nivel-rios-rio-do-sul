import React, { useId } from 'react';
import { X, Database } from 'lucide-react';
import { riverService } from '../services/supabase';
import { useDialog } from '../hooks/useDialog';

export function SupabaseInfoModal({ onClose }: { isOpen: boolean; onClose: () => void }) {
  const ref = useDialog(onClose);
  const titleId = useId();
  const config = riverService.getConfigInfo();
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60" onClick={onClose}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 outline-none" onClick={event => event.stopPropagation()}>
      <div className="flex justify-between items-center gap-3"><h2 id={titleId} className="text-lg font-bold flex gap-2 items-center"><Database size={20} />Detalhes da conexão</h2><button className="history-button" onClick={onClose} aria-label="Fechar detalhes"><X size={18} /></button></div>
      <p className="text-sm">{config.isConfigured ? 'Configuração de acesso aos dados presente.' : 'Configuração de acesso aos dados ausente.'}</p>
      <p className="text-xs text-slate-500">A presença da configuração não comprova conectividade. Falhas nas consultas e no canal de atualização são sinalizadas no painel.</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">As medições são coletadas pela rotina existente, armazenadas no Supabase e consultadas pelo painel. A atualização automática recebe novas inserções; consultas de recuperação também são feitas após reconexão e retorno à aba.</p>
      <p className="text-xs text-slate-500">Atualizar o painel consulta os registros armazenados; não aciona o coletor externo.</p>
      <button className="history-button" onClick={onClose}>Entendido</button>
    </div>
  </div>;
}
