import React, { useCallback, useMemo, useState } from 'react';
import { Info, MapPin, Waves, Shield, ExternalLink, BookOpen, Clock3, TrendingUp } from 'lucide-react';
import { Header } from './components/Header';
import { StationCard } from './components/StationCard';
import { SupabaseInfoModal } from './components/SupabaseInfoModal';
import { Footer } from './components/Footer';
import { DashboardIndicators } from './components/DashboardIndicators';
import { RiverTimeline, stationStyles, type TimelineSeries } from './components/RiverTimeline';
import { HydrologySummary } from './components/HydrologySummary';
import { useRiverReadings } from './hooks/useRiverReadings';
import { emptyHistory, useDashboardHistory } from './hooks/useDashboardHistory';
import { bucketsInWindow } from './lib/dashboard';
import { formatDateTime } from './lib/hydrology';
import { monitoringConfig } from './config/monitoring';

export default function App() {
  const { stations, isLoading, lastQuery, connection, refresh, now } = useRiverReadings();
  const histories = useDashboardHistory(stations, lastQuery);
  const start = now - 86400000;
  const series = useMemo<TimelineSeries[]>(() => stations.map((item, index) => ({
    id: item.station.id, name: item.station.name, ...stationStyles[index % stationStyles.length],
    buckets: bucketsInWindow(histories[item.station.id]?.buckets ?? [], start, now),
  })), [stations, histories, start, now]);
  const visibleSeries = series.map(item => ({ ...item, buckets: histories[item.id]?.isLoading || histories[item.id]?.error ? [] : item.buckets }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  return <div className="dashboard-shell min-h-screen flex flex-col text-slate-800 font-sans antialiased selection:bg-sky-200">
    <a href="#conteudo" className="skip-link">Ir para o conteúdo</a>
    <Header isLoading={isLoading} onRefresh={refresh} onOpenSupabaseModal={() => setIsModalOpen(true)} connection={connection} />
    <main id="conteudo" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-8 space-y-7">
      <section className="dashboard-intro flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div><p className="section-eyebrow"><MapPin size={14} /> Rio do Sul · Santa Catarina</p>
          <h1 id="main-app-title" className="text-3xl sm:text-4xl font-extrabold tracking-tight text-sky-950 mt-3">Monitoramento dos rios</h1>
          <p className="text-sm text-slate-600 mt-3 max-w-2xl leading-relaxed">Acompanhe os níveis medidos e a evolução dos rios da cidade.<br className="hidden sm:block" /> Informação clara para observar o que muda, a cada leitura.</p></div>
        <a href="https://defesacivil.riodosul.sc.gov.br/" target="_blank" rel="noopener noreferrer" className="official-link"><Shield size={17} /> Avisos da Defesa Civil <ExternalLink size={13} /></a>
      </section>
      <DashboardIndicators stations={stations} now={now} lastQuery={lastQuery} isLoading={isLoading} />
      <div className="information-strip"><Info size={18} className="shrink-0 mt-0.5" /><p>Confira sempre a data da medição. Leituras antigas e falhas de consulta não confirmam a condição atual do rio. Este é um painel independente da <strong>Silveira Lab</strong>.</p></div>
      <section id="estacoes" aria-labelledby="stations-title" className="space-y-4 scroll-mt-5">
        <div className="flex flex-wrap justify-between items-end gap-3"><div><p className="section-eyebrow">Pontos de acompanhamento</p><h2 id="stations-title" className="section-title mt-1">Estações de monitoramento</h2></div><p className="text-xs text-slate-500">Medições da fonte · horários de São Paulo</p></div>
        <div id="monitoring-stations-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{stations.map((station, index) => <StationCard key={station.station.id} data={station} now={now}
          history={histories[station.station.id] ?? emptyHistory} series={series[index]} />)}</div>
      </section>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)] gap-5 items-start">
        <section aria-labelledby="overview-title" className="dashboard-panel min-w-0">
          <div className="flex flex-wrap gap-3 items-start justify-between"><div><p className="section-eyebrow"><Waves size={15} /> Evolução dos níveis</p><h2 id="overview-title" className="section-title mt-2">Panorama das últimas 24 horas</h2></div><span className="neutral-pill">Intervalo de 1 hora</span></div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">{formatDateTime(new Date(start).toISOString())} — {formatDateTime(new Date(now).toISOString())} · metros · São Paulo</p>
          <ul aria-label="Legenda das estações e disponibilidade" className="chart-legend">{series.map(item => {
            const history = histories[item.id];
            const count = item.buckets.filter(bucket => bucket.reading).length;
            return <li key={item.id}><span className="legend-line" style={{ borderColor: item.color, borderTopStyle: item.dash ? 'dashed' : 'solid' }} aria-hidden="true" /><div><span className="font-semibold text-slate-700">{item.name}</span><span className="block text-slate-500 mt-1">{!history || history.isLoading ? 'Consultando histórico…' : history.error ? 'Histórico indisponível' : count ? `${count} faixas com medição · ${item.buckets.length - count} sem medição` : 'Sem medições em 24 horas'}</span></div></li>;
          })}</ul>
          {visibleSeries.some(item => item.buckets.some(bucket => bucket.reading)) ? <RiverTimeline series={visibleSeries} start={start} end={now} />
            : <p role="status" className="chart-message">{stations.some(item => !histories[item.station.id] || histories[item.station.id].isLoading) ? 'Consultando panorama…' : stations.some(item => histories[item.station.id]?.error) ? 'Panorama indisponível ou incompleto. Tente atualizar o painel.' : 'Sem medições nas últimas 24 horas.'}</p>}
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">Última medição válida por hora, no horário real. Lacunas interrompem as linhas. <span className="sm:hidden">Deslize o gráfico para ver todos os horários. </span>Consulte os valores no histórico de cada estação.</p>
          <div className="mt-5 rounded-xl bg-sky-50 p-3 text-xs text-sky-900 leading-relaxed flex gap-2"><Info size={16} className="shrink-0 mt-0.5" /><p>Cada estação tem sua própria referência de nível. Comparar alturas absolutas <strong>não equivale a comparar riscos de enchente</strong>.</p></div>
        </section>
        <HydrologySummary stations={stations} histories={histories} series={series} now={now} />
      </div>
      <section id="entenda" aria-labelledby="guide-title" className="dashboard-panel scroll-mt-5">
        <p className="section-eyebrow"><BookOpen size={15} /> Informação para acompanhar melhor</p><h2 id="guide-title" className="section-title mt-2">Entenda os dados, acompanhe com cuidado.</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
          {[
            { Icon: Waves, title: 'O que o nível representa?', text: 'É a altura da água em relação à referência da estação. Níveis de pontos diferentes não representam o mesmo risco.' },
            { Icon: TrendingUp, title: 'Observe a evolução', text: 'Leituras sucessivas ajudam a reconhecer mudanças. A diferença entre extremos não garante uma tendência contínua nem prevê o que acontecerá.' },
            { Icon: Clock3, title: 'Dois horários diferentes', text: 'A consulta indica quando o painel tentou obter os dados. A medição indica quando o nível foi registrado pela fonte.' },
            { Icon: Shield, title: 'Priorize os avisos oficiais', text: 'Este painel independente não substitui os comunicados e as orientações da Defesa Civil. Consulte sempre a fonte oficial.' },
          ].map(({ Icon, title, text }) => <article key={title}><Icon size={20} className="text-sky-700 mb-3" /><h3 className="font-bold text-sm">{title}</h3><p className="text-xs text-slate-600 leading-relaxed mt-2">{text}</p></article>)}
        </div>
        <div className="border-t border-slate-100 mt-6 pt-5"><h3 className="text-xs font-bold text-slate-700 mb-3">Legenda das situações registradas pela fonte</h3><div className="flex flex-wrap gap-3 text-xs font-semibold">
          <span className="situation-key bg-emerald-50 text-emerald-800">Normal</span><span className="situation-key bg-amber-50 text-amber-800">Atenção</span><span className="situation-key bg-orange-50 text-orange-800">Alerta</span><span className="situation-key bg-rose-50 text-rose-800">Emergência</span>
        </div><p className="text-xs text-slate-500 mt-3 leading-relaxed">O painel não calcula novos alertas nem limites de risco. A sinalização de leitura desatualizada ocorre após {monitoringConfig.staleAfterMinutes} minutos sem nova medição e é independente dessa classificação.</p></div>
      </section>
    </main>
    {isModalOpen && <SupabaseInfoModal isOpen onClose={closeModal} />}
    <Footer />
  </div>;
}
