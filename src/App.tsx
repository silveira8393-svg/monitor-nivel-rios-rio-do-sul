import React, { useState, useEffect, useCallback } from 'react';
import { MONITORED_STATIONS, RiverReading, StationData } from './types/river';
import { riverService } from './services/supabase';
import { Header } from './components/Header';
import { StationCard } from './components/StationCard';
import { SupabaseInfoModal } from './components/SupabaseInfoModal';
import { Footer } from './components/Footer';
import { Info, Database, Bell, CheckCircle2, Shield } from 'lucide-react';

export default function App() {
  const [stationsData, setStationsData] = useState<StationData[]>(() =>
    MONITORED_STATIONS.map((station) => ({
      station,
      latestReading: null,
      isLoading: true,
      error: null,
    }))
  );

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Fetch readings from Supabase
  const loadReadings = useCallback(async () => {
    setIsLoading(true);

    try {
      const latestMap = await riverService.getLatestReadings();
      let hasAnyReading = false;

      setStationsData((prev) =>
        prev.map((item) => {
          const reading = latestMap[item.station.id] || null;
          if (reading) hasAnyReading = true;
          return {
            ...item,
            latestReading: reading,
            isLoading: false,
            error: null,
          };
        })
      );

      if (hasAnyReading) {
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Erro ao carregar leituras:', err);
      setStationsData((prev) =>
        prev.map((item) => ({
          ...item,
          isLoading: false,
          error: 'Falha ao buscar leitura',
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and Realtime setup
  useEffect(() => {
    loadReadings();

    // Subscribe to new readings via Supabase Realtime if configured
    const unsubscribe = riverService.subscribeToNewReadings((newReading: RiverReading) => {
      setStationsData((prev) =>
        prev.map((item) => {
          if (item.station.id === newReading.stationId) {
            return {
              ...item,
              latestReading: newReading,
            };
          }
          return item;
        })
      );
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribe();
    };
  }, [loadReadings]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-sky-500 selection:text-white">
      {/* Header */}
      <Header
        lastUpdate={lastUpdate}
        isLoading={isLoading}
        onRefresh={loadReadings}
        onOpenSupabaseModal={() => setIsModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Status Notice / Supabase Architecture Banner */}
        <div
          id="banner-status-info"
          className="bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-sky-600/10 dark:bg-sky-400/10 text-sky-700 dark:text-sky-300 rounded-lg flex-shrink-0 mt-0.5 sm:mt-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-sky-900 dark:text-sky-100">
                Estrutura Inicial Pronta para Coleta Automática (Supabase)
              </h2>
              <p className="text-xs text-sky-800/80 dark:text-sky-300/80 mt-0.5">
                Os 3 pontos de medição oficiais de Rio do Sul estão configurados. Os cards exibirão as atualizações assim que a rotina periódica no Supabase for conectada.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-shrink-0 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100/70 hover:bg-sky-200/80 dark:bg-sky-900/50 dark:hover:bg-sky-800/60 transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Ver detalhes técnicos</span>
          </button>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Pontos de Monitoramento em Rio do Sul
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhamento dos três pontos de monitoramento oficiais da Defesa Civil de Rio do Sul.
            </p>
          </div>
        </div>

        {/* 3 Sensor / Station Cards Grid */}
        <div
          id="monitoring-stations-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {stationsData.map((stationData) => (
            <StationCard key={stationData.station.id} data={stationData} />
          ))}
        </div>

        {/* Legend / Status Explanations */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Classificação das Situações da Defesa Civil
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-1">
                Normal
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Nível dentro dos padrões de normalidade hidrológica.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
              <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                Atenção
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Elevação do nível sob acompanhamento contínuo da Defesa Civil.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40">
              <span className="font-bold text-orange-800 dark:text-orange-300 block mb-1">
                Alerta
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Nível crítico com risco de ocorrências no município.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
              <span className="font-bold text-rose-800 dark:text-rose-300 block mb-1">
                Emergência
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Nível severo com ações de proteção e resposta comunitária.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Supabase Technical Modal */}
      <SupabaseInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
