import React, { useEffect, useId, useMemo, useState } from 'react';
import { X, LoaderCircle, TriangleAlert } from 'lucide-react';
import { riverService } from '../services/supabase';
import { useDialog } from '../hooks/useDialog';
import { getHistorySegment, HistoryChart } from './HistoryChart';
import { formatDateTime, formatMeters, fromLocalInput, getHistoryRange, INTERVALS, MAX_HISTORY_DAYS, toLocalInput, validateRange, type HistoryBucket, type HistoryInterval, type HistoryPeriod, type HistoryRange } from '../lib/hydrology';

interface Props { stationId: string; stationName: string; latestReadAt: string | null; onClose: () => void }
const PAGE_SIZE = 25;
const periods = [{ value: '24h', label: 'Últimas 24 horas' }, { value: '7d', label: 'Últimos 7 dias' }, { value: '30d', label: 'Últimos 30 dias' }, { value: 'custom', label: 'Personalizado' }];
const intervalLabels = ['15 minutos', '30 minutos', '1 hora', '2 horas', '6 horas'];
export function StationHistoryModal({ stationId, stationName, latestReadAt, onClose }: Props) {
  const titleId = useId();
  const ref = useDialog(onClose);
  const [period, setPeriod] = useState<HistoryPeriod>('24h');
  const [query, setQuery] = useState<{ range: HistoryRange; interval: HistoryInterval }>(() => ({ range: getHistoryRange('24h'), interval: 60 }));
  const [customStart, setCustomStart] = useState(() => toLocalInput(query.range.start));
  const [customEnd, setCustomEnd] = useState(() => toLocalInput(query.range.end));
  const [validation, setValidation] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<HistoryBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(0);
  const [chartPage, setChartPage] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setBuckets([]);
    setPage(0);
    setChartPage(0);
    riverService.getStationHistory(stationId, query.range, query.interval, controller.signal)
      .then(result => { if (!controller.signal.aborted) setBuckets(result); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Erro ao consultar o histórico.'); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [stationId, query, retry]);
  const rows = useMemo(() => getHistorySegment(buckets, chartPage).reverse(), [buckets, chartPage]);
  const validCount = buckets.filter(bucket => bucket.reading !== null).length;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const latestInPeriod = [...buckets].reverse().find(bucket => bucket.reading)?.reading?.readAt ?? null;
  const latestAvailable = [latestReadAt, latestInPeriod].filter((value): value is string => Boolean(value) && Number.isFinite(Date.parse(value!)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  const selectPeriod = (value: HistoryPeriod) => {
    setPeriod(value);
    setValidation(null);
    if (value !== 'custom') {
      const range = getHistoryRange(value);
      setQuery(previous => ({ ...previous, range }));
      setCustomStart(toLocalInput(range.start));
      setCustomEnd(toLocalInput(range.end));
    }
  };
  const changeInterval = (interval: HistoryInterval) => {
    setQuery(previous => ({ ...previous, interval }));
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-2 sm:p-6" onClick={onClose}>
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-6xl max-h-[95dvh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl outline-none" onClick={event => event.stopPropagation()}>
      <header className="flex justify-between gap-4 border-b border-slate-200 dark:border-slate-800 p-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest font-bold text-sky-700 dark:text-sky-400">Histórico hidrológico</p>
          <h2 id={titleId} className="font-bold text-lg sm:text-xl mt-1">{stationName}</h2>
          <p className="text-xs text-slate-500 mt-2">Período consultado: {formatDateTime(query.range.start)} — {formatDateTime(query.range.end)}</p>
          <p className="text-xs text-slate-500 mt-1">Última medição disponível: {formatDateTime(latestAvailable)} · Horários de São Paulo</p>
        </div>
        <button type="button" onClick={onClose} className="history-button self-start" aria-label="Fechar histórico"><X size={20} /></button>
      </header>
      <div className="overflow-y-auto p-4 sm:p-6 space-y-6" aria-busy={isLoading}>
        <form className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 space-y-4"
          onSubmit={event => {
            event.preventDefault();
            try {
              const range = { start: fromLocalInput(customStart), end: fromLocalInput(customEnd) };
              validateRange(range);
              setValidation(null);
              setQuery(previous => ({ ...previous, range }));
            } catch (reason) { setValidation(reason instanceof Error ? reason.message : 'Período inválido.'); }
          }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-xs font-semibold space-y-1 block">Período
              <select className="history-input" value={period} onChange={event => selectPeriod(event.target.value as HistoryPeriod)}>
                {periods.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold space-y-1 block">Intervalo de exibição
              <select className="history-input" value={query.interval} onChange={event => changeInterval(Number(event.target.value) as HistoryInterval)}>
                {INTERVALS.map((interval, index) => <option key={interval} value={interval}>{intervalLabels[index]}</option>)}
              </select>
            </label>
          </div>
          {period === 'custom' && <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <label className="text-xs font-semibold block">Início (São Paulo)<input className="history-input mt-1" type="datetime-local" required value={customStart} onChange={event => setCustomStart(event.target.value)} /></label>
            <label className="text-xs font-semibold block">Fim (São Paulo)<input className="history-input mt-1" type="datetime-local" required value={customEnd} onChange={event => setCustomEnd(event.target.value)} /></label>
            <button type="submit" className="history-button bg-sky-700! text-white! border-sky-700!">Aplicar período</button>
            <p className="text-xs text-slate-500 sm:col-span-3">Até {MAX_HISTORY_DAYS} dias por consulta. Aplique as datas para atualizar os resultados.</p>
          </div>}
          {validation && <p role="alert" className="text-sm text-amber-800 dark:text-amber-300">{validation}</p>}
          <p className="text-xs text-slate-500">Última medição válida de cada faixa. O intervalo altera apenas a exibição; a coleta permanece igual.</p>
        </form>
        {isLoading ? <div className="py-16 flex flex-col items-center gap-3 text-slate-500" role="status"><LoaderCircle className="animate-spin" /><span>Consultando medições do período…</span></div>
          : error ? <div role="alert" className="p-6 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex flex-col items-start gap-3"><TriangleAlert /><p>{error}</p><button className="history-button" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div>
          : <>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500" role="status"><span><strong className="text-slate-900 dark:text-white">{validCount}</strong> faixas com medição</span><span><strong>{buckets.length - validCount}</strong> faixas sem medição</span></div>
            {validCount === 0 && <p className="rounded-xl p-4 bg-slate-100 dark:bg-slate-800 text-sm">Sem medições disponíveis neste período. Selecione outro período para consultar.</p>}
            <HistoryChart key={`${query.range.start}-${query.range.end}-${query.interval}`} buckets={buckets} range={query.range} page={chartPage}
              onPageChange={nextPage => { setChartPage(nextPage); setPage(0); }} />
            <section aria-label="Tabela histórica" className="space-y-3">
              <h3 className="font-bold text-sm">Registros por intervalo</h3>
              <p className="text-xs text-slate-500">Mais recentes primeiro. Variação entre medições exibidas, em ordem cronológica; quando há lacunas, a comparação usa a medição exibida anterior disponível. A primeira medição do período não tem comparação.</p>
              <div className="overflow-x-auto border rounded-xl border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800"><tr><th scope="col" className="px-4 py-3">Data</th><th scope="col" className="px-4 py-3">Horário</th><th scope="col" className="px-4 py-3">Nível do rio</th><th scope="col" className="px-4 py-3">Variação</th></tr></thead>
                  <tbody>{visibleRows.map(bucket => {
                    const label = formatDateTime(bucket.reading?.readAt ?? bucket.start);
                    const [date, time] = label.split(', ');
                    return <tr key={bucket.start} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-4 py-3 whitespace-nowrap">{date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{time}{!bucket.reading && <span className="block text-[11px] text-slate-500">até {formatDateTime(bucket.end)}</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{bucket.reading ? formatMeters(bucket.reading.levelMeters) : <span className="text-amber-800 dark:text-amber-300">Sem medição</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatMeters(bucket.variationMeters, true)}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-3 text-xs">
                <span className="text-slate-500">Página {page + 1} de {pages} · {rows.length} faixas · até {PAGE_SIZE} por página</span>
                <div className="flex gap-2"><button className="history-button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Anterior</button><button className="history-button" disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)}>Próxima</button></div>
              </div>
            </section>
          </>}
      </div>
    </div>
  </div>;
}
