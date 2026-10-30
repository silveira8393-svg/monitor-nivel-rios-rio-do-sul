import React, { useCallback, useState } from 'react';
import { Header } from './components/Header';
import { StationCard } from './components/StationCard';
import { SupabaseInfoModal } from './components/SupabaseInfoModal';
import { Footer } from './components/Footer';
import { Info, Shield } from 'lucide-react';
import { useRiverReadings } from './hooks/useRiverReadings';
import { monitoringConfig } from './config/monitoring';

export default function App() {
  const { stations, isLoading, lastQuery, connection, refresh, now } = useRiverReadings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  return <div className="min-h-screen flex flex-col bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-sky-500 selection:text-white">
    <Header lastQuery={lastQuery} isLoading={isLoading} onRefresh={refresh} onOpenSupabaseModal={() => setIsModalOpen(true)} connection={connection} />
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/80 dark:bg-sky-950/40 p-4 flex gap-3">
        <Info size={20} className="text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
        <div><h2 className="text-sm font-bold text-sky-900 dark:text-sky-100">Acompanhe a evolução dos rios</h2><p className="text-xs text-sky-900/80 dark:text-sky-200/80 mt-1 leading-relaxed">Consulte o histórico de cada estação para comparar medições reais. Confira sempre a data e a idade da leitura: a frequência de atualização depende da fonte.</p></div>
      </div>
      <div><h2 className="text-lg sm:text-xl font-extrabold tracking-tight">Estações de monitoramento</h2><p className="text-xs text-slate-500 mt-1">Três pontos de Rio do Sul · Medições e horários informados pela fonte</p></div>
      <div id="monitoring-stations-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{stations.map(station => <StationCard key={station.station.id} data={station} now={now} />)}</div>
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold flex gap-2 items-center"><Shield size={17} className="text-sky-700 dark:text-sky-400" />Como interpretar o painel</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">A situação e a tendência exibidas acompanham o registro armazenado. O painel não calcula novos alertas de enchente. Uma leitura marcada como desatualizada não confirma a condição atual do rio.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold">
          <span className="rounded-lg p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">Normal</span>
          <span className="rounded-lg p-3 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">Atenção</span>
          <span className="rounded-lg p-3 bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300">Alerta</span>
          <span className="rounded-lg p-3 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300">Emergência</span>
        </div>
        <p className="text-xs text-slate-500">Regra visual de atualização: a partir de {monitoringConfig.staleAfterMinutes} minutos sem nova medição, a leitura é sinalizada como desatualizada. Essa regra é independente da classificação de risco.</p>
      </section>
    </main>
    {isModalOpen && <SupabaseInfoModal isOpen onClose={closeModal} />}
    <Footer />
  </div>;
}
