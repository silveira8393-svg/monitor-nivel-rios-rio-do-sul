import React, { useState } from 'react';
import { X, Database, Server, CheckCircle2, Copy, Check, Code, ShieldCheck, ArrowRight } from 'lucide-react';
import { riverService } from '../services/supabase';

interface SupabaseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseInfoModal: React.FC<SupabaseInfoModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const config = riverService.getConfigInfo();

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const schemaSnippet = `-- Tabelas criadas em /supabase/schema.sql
CREATE TABLE public.monitoring_stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  reference_url TEXT DEFAULT 'https://defesacivil.riodosul.sc.gov.br/',
  attention_threshold NUMERIC(4, 2),
  alert_threshold NUMERIC(4, 2),
  emergency_threshold NUMERIC(4, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.river_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT REFERENCES public.monitoring_stations(id) ON DELETE CASCADE,
  level_meters NUMERIC(5, 2) NOT NULL,
  situation TEXT NOT NULL DEFAULT 'normal',
  read_at TIMESTAMP WITH TIME ZONE NOT NULL,
  trend TEXT NOT NULL DEFAULT 'estavel',
  variation_meters NUMERIC(5, 2),
  source_url TEXT DEFAULT 'https://defesacivil.riodosul.sc.gov.br/',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`;

  return (
    <div
      id="supabase-info-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="supabase-info-modal-content"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Integração Supabase & Backend
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Estrutura preparada para coleta automática a cada 15 minutos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Connection Status Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Status da Conexão
              </span>
              {config.isConfigured ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Supabase Configurado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Aguardando Credenciais
                </span>
              )}
            </div>

            <div className="mt-3 text-xs space-y-1.5 text-slate-600 dark:text-slate-300 font-mono">
              <p>URL: <span className="font-semibold text-slate-900 dark:text-white">{config.url}</span></p>
              <p>Anon Key: <span className="font-semibold text-slate-900 dark:text-white">{config.hasKey ? 'Definida (.env)' : 'Não configurada (.env)'}</span></p>
            </div>
          </div>

          {/* Architecture Pipeline */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-600" />
              Arquitetura de Coleta Backend
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                  1. Defesa Civil SC
                </span>
                <p className="text-slate-500 dark:text-slate-400">
                  Site oficial publica níveis dos rios atualizados.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                  2. Edge Function (15 min)
                </span>
                <p className="text-slate-500 dark:text-slate-400">
                  Executada periodicamente no servidor via cron/webhook.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">
                  3. Painel Web
                </span>
                <p className="text-slate-500 dark:text-slate-400">
                  Consulta e recebe atualizações em tempo real do Supabase.
                </p>
              </div>
            </div>
          </div>

          {/* Prepared Files */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-600" />
              Arquivos de Infraestrutura Preparados
            </h3>
            <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 dark:text-white">/supabase/schema.sql</strong>:
                  <p className="text-slate-500 dark:text-slate-400">Tabelas <code className="font-mono text-slate-700 dark:text-slate-300">monitoring_stations</code> e <code className="font-mono text-slate-700 dark:text-slate-300">river_readings</code> com RLS e índices.</p>
                </div>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 dark:text-white">/supabase/functions/sync-defesa-civil/index.ts</strong>:
                  <p className="text-slate-500 dark:text-slate-400">Template da Edge Function em Deno/TypeScript para coleta no site da Defesa Civil.</p>
                </div>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-slate-900 dark:text-white">/src/services/supabase.ts</strong>:
                  <p className="text-slate-500 dark:text-slate-400">Serviço com métodos de consulta, tipagem e canais de Realtime.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Schema Snippet */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Estrutura do Banco (SQL Preview)
              </span>
              <button
                onClick={() => copyToClipboard(schemaSnippet, 'schema')}
                className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 font-medium"
              >
                {copiedSection === 'schema' ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copiar SQL
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto border border-slate-800">
              {schemaSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
