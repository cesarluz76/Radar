import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Award, Radar, Search } from 'lucide-react';
import type { ScreenerEntry } from '../server/valuationEngine.ts';
import type { AssetSummary, MacroOverview } from '../shared/types.ts';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters.ts';
import { AssetLogo, ConsensusSeal } from '../components/BrandMark.tsx';
import type { NavSectionId } from '../components/TerminalShell.tsx';

interface DashboardViewProps {
  macro: MacroOverview | null;
  universe: ScreenerEntry[];
  loadingUniverse: boolean;
  onSelectAsset: (ticker: string) => void;
  onNavigate: (section: NavSectionId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  macro,
  universe,
  loadingUniverse,
  onSelectAsset,
  onNavigate,
}) => {
  const [centralQuery, setCentralQuery] = useState('');
  const [centralResults, setCentralResults] = useState<AssetSummary[]>([]);
  const [mostSearched, setMostSearched] = useState<AssetSummary[]>([]);

  useEffect(() => {
    fetch('/api/assets/most-searched')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: AssetSummary[] }) => setMostSearched(d.items ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const q = centralQuery.trim();
    if (q.length < 2) {
      setCentralResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/assets/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = (await res.json()) as { items?: AssetSummary[] };
          setCentralResults(data.items ?? []);
        }
      } catch {
        // ignore
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [centralQuery]);

  const gainers = [...universe]
    .sort((a, b) => b.asset.changePercent - a.asset.changePercent)
    .slice(0, 5);

  const losers = [...universe]
    .sort((a, b) => a.asset.changePercent - b.asset.changePercent)
    .slice(0, 5);

  const topDivs = [...universe]
    .filter((i) => i.dividendYield != null && i.dividendYield > 0)
    .sort((a, b) => (b.dividendYield ?? 0) - (a.dividendYield ?? 0))
    .slice(0, 5);

  const topDiscount = [...universe]
    .filter((i) => i.discountPercent != null)
    .sort((a, b) => (b.discountPercent ?? -999) - (a.discountPercent ?? -999))
    .slice(0, 5);

  const consensusAssets = universe
    .filter((i) => i.consensusCount >= 3)
    .sort((a, b) => b.consensusCount - a.consensusCount || (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
    .slice(0, 8);

  const macroCards = macro
    ? [
        macro.ibovespa,
        macro.sp500,
        macro.nasdaq,
        macro.dowJones,
        macro.usdBrl,
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Central Search */}
      <section className="terminal-glass rounded-2xl p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-slate-50 text-balance">
              Terminal de Inteligência Financeira Brasil & EUA
            </h1>
            <p className="text-sm text-slate-400">
              Cotações em tempo real, indicadores fundamentalistas calculados na origem e convergência de valuation pelo Radar Sonar.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('radar-sonar')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs transition-colors whitespace-nowrap"
            >
              <Radar className="w-4 h-4" />
              <span>Abrir Radar Sonar</span>
            </button>
          </div>
        </div>

        {/* Central Search Input */}
        <div className="mt-5 relative">
          <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={centralQuery}
            onChange={(e) => setCentralQuery(e.target.value)}
            placeholder="Pesquise qualquer ativo pelo ticker ou nome da empresa."
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#070B17] border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/70"
          />
          {centralResults.length > 0 && (
            <div className="mt-2 rounded-xl bg-[#080D1B] border border-slate-800 divide-y divide-slate-800/70 overflow-hidden">
              {centralResults.map((item) => (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => {
                    setCentralQuery('');
                    setCentralResults([]);
                    onSelectAsset(item.ticker);
                  }}
                  className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AssetLogo ticker={item.ticker} name={item.name} size={32} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-sm text-slate-100">
                          {item.ticker}
                        </span>
                        <span className="text-xs text-slate-500">
                          {item.exchange} · {item.sector}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{item.name}</p>
                    </div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <div className="text-sm font-semibold text-slate-100">
                      {formatCurrency(item.price, item.currency)}
                    </div>
                    <div
                      className={`text-xs ${
                        item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(item.changePercent)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Macro Benchmark Rates Bar */}
        {macro && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-6 text-xs text-slate-400 font-mono">
            <span>
              SELIC: <strong className="text-slate-100">{formatPercent(macro.selicAnnual, false)} a.a.</strong>
            </span>
            <span>
              CDI: <strong className="text-slate-100">{formatPercent(macro.cdiAnnual, false)} a.a.</strong>
            </span>
            <span>
              IPCA (12m): <strong className="text-amber-300">{formatPercent(macro.ipca12m, false)}</strong>
            </span>
            <span>
              Fonte Macro: Banco Central do Brasil & Yahoo Finance
            </span>
          </div>
        )}
      </section>

      {/* Macro Indices Grid with Sparklines */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {macroCards.length === 0
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="terminal-glass rounded-xl p-4 h-36 animate-pulse" />
            ))
          : macroCards.map((idx) => {
              const up = idx.changePercent >= 0;
              return (
                <div key={idx.symbol} className="terminal-glass rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-400">{idx.name}</div>
                      <div className="font-mono text-lg font-bold text-slate-50 mt-0.5">
                        {idx.unit === 'BRL'
                          ? formatCurrency(idx.value, 'BRL', 2)
                          : formatNumber(idx.value, 0)}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold ${
                        up ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {formatPercent(idx.changePercent)}
                    </span>
                  </div>
                  <div className="h-14 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={idx.history}>
                        <defs>
                          <linearGradient id={`grad-${idx.symbol}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={up ? '#10B981' : '#F43F5E'} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={up ? '#10B981' : '#F43F5E'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide />
                        <YAxis domain={['auto', 'auto']} hide />
                        <Tooltip
                          contentStyle={{
                            background: '#0B1120',
                            border: '1px solid #1E293B',
                            fontSize: '11px',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={up ? '#10B981' : '#F43F5E'}
                          strokeWidth={1.6}
                          fill={`url(#grad-${idx.symbol})`}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
      </section>

      {/* Consenso 3X, 4X e 5X Highlights */}
      <section className="terminal-glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-50">
                Oportunidades em Consenso 3X, 4X e 5X
              </h2>
              <p className="text-xs text-slate-400">
                Ativos com convergência matemática simultânea entre Bazin, Graham, P/L Alvo, DCF e Múltiplos Comparáveis.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(['consensus-3x', 'consensus-4x', 'consensus-5x'] as NavSectionId[]).map((sec, idx) => (
              <button
                key={sec}
                type="button"
                onClick={() => onNavigate(sec)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:border-emerald-500/40 font-mono text-xs text-slate-200 transition-colors whitespace-nowrap"
              >
                Ver {idx + 3}X
              </button>
            ))}
          </div>
        </div>

        {loadingUniverse && consensusAssets.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-900/60 animate-pulse" />
            ))}
          </div>
        ) : consensusAssets.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">
            Nenhum ativo atingiu Consenso 3X+ com a margem de segurança atual. Ajuste parâmetros no Radar Sonar.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {consensusAssets.map((item) => (
              <button
                key={item.asset.ticker}
                type="button"
                onClick={() => onSelectAsset(item.asset.ticker)}
                className="text-left p-4 rounded-xl bg-slate-900/65 hover:bg-slate-800/70 border border-slate-800/90 hover:border-emerald-500/40 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AssetLogo ticker={item.asset.ticker} name={item.asset.name} size={32} />
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-sm text-slate-100">
                        {item.asset.ticker}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.asset.sector}
                      </div>
                    </div>
                  </div>
                  <ConsensusSeal level={item.consensusLabel} />
                </div>
                <div className="flex items-baseline justify-between font-mono text-xs pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block">Cotação</span>
                    <strong className="text-slate-100 text-sm">
                      {formatCurrency(item.asset.price, item.asset.currency)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Justo Médio</span>
                    <strong className="text-amber-300 text-sm">
                      {formatCurrency(item.averageFairValue, item.asset.currency)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Desconto</span>
                    <strong className="text-emerald-400 text-sm">
                      {formatPercent(item.discountPercent)}
                    </strong>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 4 Market Movers & Intelligence Columns */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MoverListCard
          title="Maiores Altas do Dia"
          items={gainers}
          metricLabel={(i) => formatPercent(i.asset.changePercent)}
          metricColor={() => 'text-emerald-400'}
          onSelectAsset={onSelectAsset}
        />
        <MoverListCard
          title="Maiores Quedas do Dia"
          items={losers}
          metricLabel={(i) => formatPercent(i.asset.changePercent)}
          metricColor={() => 'text-rose-400'}
          onSelectAsset={onSelectAsset}
        />
        <MoverListCard
          title="Maiores Dividend Yields"
          items={topDivs}
          metricLabel={(i) => formatPercent(i.dividendYield, false)}
          metricColor={() => 'text-amber-300'}
          onSelectAsset={onSelectAsset}
        />
        <MoverListCard
          title="Maior Desconto Calculado"
          items={topDiscount}
          metricLabel={(i) => formatPercent(i.discountPercent)}
          metricColor={(i) =>
            (i.discountPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-slate-400'
          }
          onSelectAsset={onSelectAsset}
        />
      </section>

      {/* Most Searched Assets (Real user search volume) */}
      <section className="terminal-glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Empresas Mais Pesquisadas pelos Investidores
            </h2>
            <p className="text-xs text-slate-400">
              Ranking dinâmico contabilizado exclusivamente a partir das pesquisas reais efetuadas no terminal.
            </p>
          </div>
        </div>
        {mostSearched.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">
            Nenhuma pesquisa registrada nesta sessão ainda. Utilize a busca acima ou clique em qualquer ativo para iniciar o ranking em tempo real.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {mostSearched.map((item) => (
              <button
                key={item.ticker}
                type="button"
                onClick={() => onSelectAsset(item.ticker)}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AssetLogo ticker={item.ticker} name={item.name} size={28} />
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-slate-100">
                      {item.ticker}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.searchCount ?? 1} consultas
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="text-slate-100">{formatCurrency(item.price, item.currency)}</div>
                  <div className={item.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {formatPercent(item.changePercent)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const MoverListCard: React.FC<{
  title: string;
  items: ScreenerEntry[];
  metricLabel: (item: ScreenerEntry) => string;
  metricColor: (item: ScreenerEntry) => string;
  onSelectAsset: (ticker: string) => void;
}> = ({ title, items, metricLabel, metricColor, onSelectAsset }) => (
  <div className="terminal-glass rounded-xl p-4 space-y-3">
    <h3 className="font-display text-sm font-semibold text-slate-100">{title}</h3>
    <div className="divide-y divide-slate-800/70">
      {items.length === 0 ? (
        <p className="text-xs text-slate-500 py-4">Carregando ativos...</p>
      ) : (
        items.map((item) => (
          <button
            key={item.asset.ticker}
            type="button"
            onClick={() => onSelectAsset(item.asset.ticker)}
            className="w-full py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/40 px-1 rounded transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <AssetLogo ticker={item.asset.ticker} name={item.asset.name} size={26} />
              <div className="min-w-0">
                <div className="font-mono text-xs font-semibold text-slate-100">
                  {item.asset.ticker}
                </div>
                <div className="text-[11px] text-slate-400 truncate">{item.asset.name}</div>
              </div>
            </div>
            <div className="text-right font-mono shrink-0">
              <div className="text-xs text-slate-200">
                {formatCurrency(item.asset.price, item.asset.currency)}
              </div>
              <div className={`text-[11px] font-semibold ${metricColor(item)}`}>
                {metricLabel(item)}
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  </div>
);
