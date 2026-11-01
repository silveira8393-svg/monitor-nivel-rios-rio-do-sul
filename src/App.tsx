import React, { useCallback, useMemo, useState } from 'react';
import { Info, Waves, Shield, ExternalLink, TrendingUp, Bell, ChartNoAxesColumnIncreasing, CircleCheck, TriangleAlert, Siren } from 'lucide-react';
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
import { formatDateTime, formatMeters } from './lib/hydrology';
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
    <div className="dashboard-top">
      <img className="hero-city-photo" src="/images/rio-do-sul-noite.jpg" alt="Vista aérea noturna de Rio do Sul, com a igreja e as avenidas iluminadas" width="720" height="450" fetchPriority="high" />
      <Header isLoading={isLoading} onRefresh={refresh} onOpenSupabaseModal={() => setIsModalOpen(true)} connection={connection} />
      <DashboardIndicators stations={stations} now={now} lastQuery={lastQuery} isLoading={isLoading} />
    </div>
    <main id="conteudo" className="dashboard-container dashboard-main">
      <section id="estacoes" aria-labelledby="stations-title" className="stations-section">
        <div className="section-heading"><Waves size={31} /><div><h2 id="stations-title" className="section-title">Estações de Monitoramento</h2><p>Níveis medidos dos rios de Rio do Sul, com tendência e variação registradas pela fonte.</p></div></div>
        <div id="monitoring-stations-grid" className="stations-grid">{stations.map((station, index) => <StationCard key={station.station.id} data={station} now={now}
          history={histories[station.station.id] ?? emptyHistory} series={series[index]} />)}</div>
      </section>
      <div className="dashboard-detail-grid">
        <section aria-labelledby="overview-title" className="dashboard-panel panorama-panel">
          <div className="panel-heading"><ChartNoAxesColumnIncreasing size={23} /><div><h2 id="overview-title" className="section-title">Panorama das últimas 24 horas</h2><p>Evolução do nível dos rios nas três estações · metros · 1 h</p></div></div>
          <p className="period-caption">{formatDateTime(new Date(start).toISOString())} — {formatDateTime(new Date(now).toISOString())} · São Paulo</p>
          <div className="panorama-body">
            {visibleSeries.some(item => item.buckets.some(bucket => bucket.reading)) ? <RiverTimeline series={visibleSeries} start={start} end={now} />
              : <p role="status" className="chart-message">{stations.some(item => !histories[item.station.id] || histories[item.station.id].isLoading) ? 'Consultando panorama…' : stations.some(item => histories[item.station.id]?.error) ? 'Panorama indisponível ou incompleto. Tente atualizar o painel.' : 'Sem medições nas últimas 24 horas.'}</p>}
            <ul aria-label="Legenda das estações e disponibilidade" className="chart-legend">{series.map(item => {
              const history = histories[item.id];
              const count = item.buckets.filter(bucket => bucket.reading).length;
              const last = [...item.buckets].reverse().find(bucket => bucket.reading)?.reading;
              return <li key={item.id}><span className="legend-line" style={{ borderColor: item.color, borderTopStyle: item.dash ? 'dashed' : 'solid' }} aria-hidden="true" /><div><span className="legend-name" title={item.name}>{item.name.split(' – ')[0].replace(/^Ponte /, '')}</span>
                <span className="legend-value">{history && !history.isLoading && !history.error && last ? formatMeters(last.levelMeters) : '—'}</span>
                <span className="legend-status">{!history || history.isLoading ? 'Consultando histórico…' : history.error ? 'Histórico indisponível' : count ? `${count} faixas com medição · ${item.buckets.length - count} sem medição` : 'Sem medições em 24 horas'}</span></div></li>;
            })}</ul>
          </div>
          <p className="panel-footnote">Horários reais; lacunas interrompem as linhas. Consulte os valores no histórico. Cada estação tem sua própria referência: comparar alturas <strong>não equivale a comparar riscos de enchente</strong>.</p>
        </section>
        <HydrologySummary stations={stations} histories={histories} series={series} now={now} />
        <section id="entenda" aria-labelledby="guide-title" className="dashboard-panel guidance-panel">
          <div className="panel-heading"><Info size={24} /><h2 id="guide-title" className="section-title">Entenda os níveis</h2></div>
          <p className="guidance-intro">O nível indica a altura da água em relação à referência de cada estação. A situação exibida é a classificação registrada pela fonte; o painel não calcula novos alertas.</p>
          <div className="guidance-list">
            <article><TrendingUp /><div><h3>Acompanhe a evolução</h3><p>Observe a tendência e a variação. Diferenças entre extremos não garantem movimento contínuo nem previsão.</p></div></article>
            <article><Bell /><div><h3>Fique atento aos horários</h3><p>A consulta indica a tentativa de obter dados; a medição indica quando o nível foi registrado. Após {monitoringConfig.staleAfterMinutes} minutos, a leitura é sinalizada como desatualizada.</p></div></article>
            <article><Shield /><div><h3>Priorize os avisos oficiais</h3><p>Ferramenta independente da Silveira Lab. Siga as orientações da Defesa Civil pelos canais oficiais.</p></div></article>
          </div>
          <a className="guidance-link" href="https://defesacivil.riodosul.sc.gov.br/" target="_blank" rel="noopener noreferrer">Avisos da Defesa Civil <ExternalLink size={13} /></a>
        </section>
      </div>
      <section aria-labelledby="classification-title" className="dashboard-panel classification-panel">
        <div className="panel-heading"><Shield size={24} /><h2 id="classification-title" className="section-title">Classificação das situações registradas pela fonte</h2></div>
        <div className="classification-grid">{[
          { label: 'Normal', key: 'normal', Icon: CircleCheck, text: 'Classificação Normal no registro da fonte.' },
          { label: 'Atenção', key: 'atencao', Icon: TriangleAlert, text: 'Classificação Atenção no registro da fonte.' },
          { label: 'Alerta', key: 'alerta', Icon: Info, text: 'Classificação Alerta no registro da fonte.' },
          { label: 'Emergência', key: 'emergencia', Icon: Siren, text: 'Classificação Emergência no registro da fonte.' },
        ].map(({ label, key, Icon, text }) => <article key={key} className={`classification-item classification-${key}`}><Icon size={27} /><div><h3>{label}</h3><p>{text}</p></div></article>)}</div>
        <p className="panel-footnote">Confira sempre a data da medição. Leituras antigas ou falhas de consulta não confirmam a condição atual do rio. A indicação de desatualização é independente da classificação de risco.</p>
      </section>
    </main>
    {isModalOpen && <SupabaseInfoModal isOpen onClose={closeModal} />}
    <Footer />
  </div>;
}
