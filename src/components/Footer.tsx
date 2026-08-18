import React from 'react';
import { Phone, Shield, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Info */}
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <span>Monitor de Nível dos Rios – Rio do Sul</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Painel projetado para acompanhamento contínuo dos níveis dos rios em Rio do Sul (SC), estruturado para sincronização periódica a cada 15 minutos com os dados oficiais da Defesa Civil.
            </p>
          </div>

          {/* Column 2: Official Links */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3">
              Fontes Oficiais & Defesa Civil
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://defesacivil.riodosul.sc.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1 text-sky-400 hover:underline"
                >
                  <span>Portal Oficial da Defesa Civil de Rio do Sul</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://riodosul.sc.gov.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <span>Prefeitura Municipal de Rio do Sul</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li className="text-slate-400 pt-1">
                Frequência de leitura estimada: <strong>15 minutos</strong>
              </li>
            </ul>
          </div>

          {/* Column 3: Emergency Contacts */}
          <div>
            <h3 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Contatos de Emergência
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-300">Defesa Civil</span>
                <span className="font-bold text-amber-400 font-mono">199</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-300">Corpo de Bombeiros</span>
                <span className="font-bold text-rose-400 font-mono">193</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <span className="text-slate-300">SAMU</span>
                <span className="font-bold text-sky-400 font-mono">192</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright / disclaimer */}
        <div className="pt-8 mt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            Os dados de medição são de responsabilidade da Defesa Civil de Rio do Sul (SC).
          </p>
          <p className="flex items-center gap-1">
            <span>Integração backend: Supabase + Edge Functions</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
