import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, GitCompare, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { FullAssetAnalysis, TechnicalSnapshot } from '../shared/types.ts';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters.ts';
import { AssetLogo, ConsensusSeal } from '../components/BrandMark.tsx';
import { TechnicalChart } from '../components/TechnicalChart.tsx';

interface ComparatorAndTechnicalViewProps {
  mode: 'COMPARATOR' | 'TECHNICAL';
  initialTicker?: string;
  onSelectAsset: (ticker: string) => void;
}

const COMP_COLORS = ['#10B981', '#F59E0B', '#38BDF8', '#A78BFA', '#FB7185'];

export const ComparatorAndTechnicalView: React.FC<ComparatorAndTechnicalViewProps> = ({
  mode,
  initialTicker = 'PETR4',
  onSelectAsset,
}) => {
  const { apiFetch, effectivePlan } = useAuth();
  const [techTicker, setTechTicker] = useState(initialTicker);
  const [techInput, setTechInput] = useState(initialTicker);

  // Comparator state
  const [tickers, setTickers] = useState<string[]>(['PETR4', 'VALE3', 'ITUB4']);
  const [newTicker, setNewTicker] = useState('');
  const [range, setRange] = useState('1y');
  const [compItems, setCompItems] = useState<FullAssetAnalysis[]>([]);
  const [compCharts, setCompCharts] = useState<TechnicalSnapshot[]>([]);
  const [loadingComp, setLoadingComp] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);

  const maxAllowed = effectivePlan === 'FREE' ? 2 : 5;

  useEffect(() => {
    if (mode !== 'COMPARATOR' || tickers.length === 0) return;
    setLoadingComp(true);
    setCompError(null);
    apiFetch<{
      items: FullAssetAnalysis[];
      charts: TechnicalSnapshot[];
    }>(`/api/compare?tickers=${encodeURIComponent(tickers.join(','))}&range=${range}`)
      .then((res) => {
        setCompItems(res.items ?? []);
        setCompCharts(res.charts ?? []);
      })
      .catch((err) => {
        setCompError(err instanceof Error ? err.message : 'Erro ao comparar ativos');
      })
      .finally(() => setLoadingComp(false));
  }, [mode, tickers, range, apiFetch]);

  // Normalized % return series aligned by date
  const normalizedSeries = useMemo(() => {
    if (compCharts.length === 0) return [];
    const dateSet = new Set<string>();
    const mapByTicker = new Map<string, Map<string, number>>();

    for (const ch of compCharts) {
      if (ch.bars.length === 0) continue;
      const base = ch.bars[0].close;
      const m = new Map<string, number>();
      for (const b of ch.bars) {
        const d = b.time.slice(0, 10);
        dateSet.add(d);
        m.set(d, Number((((b.close / base) - 1) * 100).toFixed(2)));
      }
      mapByTicker.set(ch.ticker, m);
    }

    const dates = Array.from(dateSet).sort();
    return dates.map((d) => {
      const row: Record<string, string | number> = { date: d };
      for (const [tk, m] of mapByTicker.entries()) {
        const val = m.get(d);
        if (val != null) row[tk] = val;
      }
      return row;
    });
  }, [compCharts]);

  const handleAddCompTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTicker.trim().toUpperCase();
    if (!clean || tickers.includes(clean)) return;
    if (tickers.length >= maxAllowed) {
      setCompError(`Seu plano atual (${effectivePlan}) permite comparar até ${maxAllowed} ativos simultaneamente.`);
      return;
    }
    setTickers([...tickers, clean]);
    setNewTicker('');
  };

  if (mode === 'TECHNICAL') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-50 flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-emerald-400" />
              <span>Análise Técnica Profissional</span>
            </h1>
            <p className="text-sm text-slate-400">
              Gráficos de candles e linhas, médias móveis SMA/EMA, Bandas de Bollinger, RSI, MACD, VWAP, suportes, resistências e retração de Fibonacci.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (techInput.trim()) setTechTicker(techInput.trim().toUpperCase());
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value.toUpperCase())}
              placeholder="Ticker (ex: PETR4, AAPL)"
              className="h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-xs font-mono text-slate-100"
            />
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs"
            >
              Carregar Gráfico
            </button>
          </form>
        </div>

        <TechnicalChart ticker={techTicker} currency={techTicker.match(/\d$/) ? 'BRL' : 'USD'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50 flex items-center gap-2.5">
            <GitCompare className="w-6 h-6 text-emerald-400" />
            <span>Comparador Avançado de Empresas & Índices</span>
          </h1>
          <p className="text-sm text-slate-400">
            Compare múltiplos, rentabilidade, dividendos, valuation e desempenho percentual normalizado (até {maxAllowed} ativos no plano {effectivePlan}).
          </p>
        </div>
      </div>

      {/* Selector Bar */}
      <div className="terminal-glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {tickers.map((tk, i) => (
            <div
              key={tk}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COMP_COLORS[i % COMP_COLORS.length] }}
              />
              <span className="text-slate-100 font-semibold">{tk}</span>
              <button
                type="button"
                onClick={() => setTickers(tickers.filter((t) => t !== tk))}
                aria-label={`Remover ${tk}`}
                className="text-slate-500 hover:text-rose-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <form onSubmit={handleAddCompTicker} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              placeholder="Adicionar ticker (^BVSP, SPY, WEGE3...)"
              className="h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-xs font-mono text-slate-100 w-56"
            />
            <button
              type="submit"
              className="h-9 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar</span>
            </button>
          </form>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
          {(['3mo', '6mo', '1y', '5y'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded text-xs font-mono ${
                range === r ? 'bg-emerald-500 text-[#060913] font-semibold' : 'text-slate-400'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {compError && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200">
          {compError}
        </div>
      )}

      {/* Normalized Price Performance Chart */}
      <div className="terminal-glass rounded-2xl p-5">
        <h2 className="font-display text-base font-semibold text-slate-100 mb-3">
          Desempenho Percentual Normalizado (Base 0% na data inicial)
        </h2>
        {loadingComp ? (
          <div className="h-72 rounded-xl bg-slate-900/50 animate-pulse" />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={normalizedSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ background: '#0B1120', border: '1px solid #1E293B', fontSize: '11px' }}
                  formatter={(v: unknown) => `${Number(v).toFixed(2)}%`}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {compCharts.map((ch, i) => (
                  <Line
                    key={ch.ticker}
                    type="monotone"
                    dataKey={ch.ticker}
                    stroke={COMP_COLORS[i % COMP_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Side-by-side Fundamental Matrix */}
      <div className="terminal-glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                <th className="py-3 px-4 text-left">Indicador</th>
                {compItems.map((item) => (
                  <th key={item.asset.ticker} className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onSelectAsset(item.asset.ticker)}
                      className="inline-flex items-center gap-2 hover:text-emerald-300"
                    >
                      <AssetLogo ticker={item.asset.ticker} size={22} />
                      <span className="font-mono font-bold text-slate-100">
                        {item.asset.ticker}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono">
              <CompRow label="Cotação" items={compItems} render={(a) => formatCurrency(a.asset.price, a.asset.currency)} />
              <CompRow label="P/L" items={compItems} render={(a) => formatNumber(a.fundamentals.pe)} />
              <CompRow label="P/VP" items={compItems} render={(a) => formatNumber(a.fundamentals.pb)} />
              <CompRow label="EV/EBITDA" items={compItems} render={(a) => formatNumber(a.fundamentals.evEbitda)} />
              <CompRow label="ROE" items={compItems} render={(a) => formatPercent(a.fundamentals.roe, false)} />
              <CompRow label="ROIC" items={compItems} render={(a) => formatPercent(a.fundamentals.roic, false)} />
              <CompRow label="Margem Líquida" items={compItems} render={(a) => formatPercent(a.fundamentals.netMargin, false)} />
              <CompRow label="Margem EBITDA" items={compItems} render={(a) => formatPercent(a.fundamentals.ebitdaMargin, false)} />
              <CompRow label="Dividend Yield" items={compItems} render={(a) => formatPercent(a.fundamentals.dividendYield, false)} />
              <CompRow label="Payout" items={compItems} render={(a) => formatPercent(a.fundamentals.payout, false)} />
              <CompRow label="Dív. Líq / EBITDA" items={compItems} render={(a) => a.fundamentals.netDebtToEbitda != null ? `${formatNumber(a.fundamentals.netDebtToEbitda)}x` : '—'} />
              <CompRow label="Valor Justo Médio" items={compItems} render={(a) => formatCurrency(a.valuation.averageFairValue, a.asset.currency)} />
              <CompRow label="Desconto Valuation" items={compItems} render={(a) => formatPercent(a.valuation.averageDiscountPercent)} />
              <tr>
                <td className="py-3 px-4 text-left font-sans text-slate-400">Consenso</td>
                {compItems.map((a) => (
                  <td key={a.asset.ticker} className="py-3 px-4">
                    <ConsensusSeal level={a.valuation.consensusLabel} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const CompRow: React.FC<{
  label: string;
  items: FullAssetAnalysis[];
  render: (a: FullAssetAnalysis) => string;
}> = ({ label, items, render }) => (
  <tr className="hover:bg-slate-800/35">
    <td className="py-2.5 px-4 text-left font-sans text-slate-400">{label}</td>
    {items.map((a) => (
      <td key={a.asset.ticker} className="py-2.5 px-4 text-slate-100">
        {render(a)}
      </td>
    ))}
  </tr>
);
