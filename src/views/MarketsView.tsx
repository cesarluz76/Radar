import React, { useMemo, useState } from 'react';
import { BookmarkPlus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { ScreenerEntry } from '../server/valuationEngine.ts';
import type { AssetCategory, Market } from '../shared/types.ts';
import { formatCompact, formatCurrency, formatNumber, formatPercent } from '../utils/formatters.ts';
import { AssetLogo, ConsensusSeal } from '../components/BrandMark.tsx';

interface MarketsViewProps {
  market: Market;
  universe: ScreenerEntry[];
  loading: boolean;
  onSelectAsset: (ticker: string) => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({
  market,
  universe,
  loading,
  onSelectAsset,
}) => {
  const { user, savedFilters, saveScreenerFilter, deleteSavedFilter } = useAuth();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AssetCategory>('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [maxPE, setMaxPE] = useState('');
  const [minROE, setMinROE] = useState('');
  const [minDY, setMinDY] = useState('');
  const [consensusFilter, setConsensusFilter] = useState<'ALL' | '3X' | '4X' | '5X'>('ALL');
  const [filterName, setFilterName] = useState('');
  const [savingFilter, setSavingFilter] = useState(false);

  const marketItems = useMemo(
    () => universe.filter((u) => u.asset.market === market),
    [universe, market]
  );

  const sectors = useMemo(
    () => Array.from(new Set(marketItems.map((i) => i.asset.sector))).sort(),
    [marketItems]
  );

  const categories: AssetCategory[] =
    market === 'BR' ? ['STOCK', 'FII', 'ETF', 'BDR'] : ['STOCK', 'REIT', 'ETF', 'ADR'];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return marketItems.filter((item) => {
      if (categoryFilter !== 'ALL' && item.asset.category !== categoryFilter) return false;
      if (sectorFilter !== 'ALL' && item.asset.sector !== sectorFilter) return false;
      if (maxPE && (item.pe == null || item.pe > Number(maxPE) || item.pe <= 0)) return false;
      if (minROE && (item.roe == null || item.roe < Number(minROE))) return false;
      if (minDY && (item.dividendYield == null || item.dividendYield < Number(minDY))) return false;
      if (consensusFilter === '3X' && item.consensusCount < 3) return false;
      if (consensusFilter === '4X' && item.consensusCount < 4) return false;
      if (consensusFilter === '5X' && item.consensusCount < 5) return false;
      if (
        q &&
        !item.asset.ticker.toLowerCase().includes(q) &&
        !item.asset.name.toLowerCase().includes(q) &&
        !item.asset.sector.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [marketItems, query, categoryFilter, sectorFilter, maxPE, minROE, minDY, consensusFilter]);

  const handleSaveFilter = async () => {
    if (!user || !filterName.trim()) return;
    setSavingFilter(true);
    try {
      await saveScreenerFilter({
        name: filterName.trim(),
        market,
        sector: sectorFilter !== 'ALL' ? sectorFilter : undefined,
        maxPE: maxPE ? Number(maxPE) : undefined,
        minROE: minROE ? Number(minROE) : undefined,
        minDY: minDY ? Number(minDY) : undefined,
        consensusLevel: consensusFilter,
      });
      setFilterName('');
    } finally {
      setSavingFilter(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            {market === 'BR' ? 'Mercado Brasil (B3)' : 'Mercado Estados Unidos (NYSE / NASDAQ)'}
          </h1>
          <p className="text-sm text-slate-400">
            {market === 'BR'
              ? 'Ações B3, Fundos Imobiliários (FIIs), ETFs e BDRs com filtros fundamentalistas e valuation.'
              : 'Stocks, REITs, ETFs e ADRs com demonstrações financeiras e múltiplos calculados na origem.'}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              categoryFilter === 'ALL'
                ? 'bg-emerald-500 text-[#060913] font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                categoryFilter === cat
                  ? 'bg-emerald-500 text-[#060913] font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Screener Filters */}
      <div className="terminal-glass rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar por ticker, empresa ou setor..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500/60"
            />
          </div>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            aria-label="Filtrar por setor"
            className="h-10 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100"
          >
            <option value="ALL">Todos os setores</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="number"
            value={maxPE}
            onChange={(e) => setMaxPE(e.target.value)}
            placeholder="P/L máximo (ex: 12)"
            className="h-10 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100 font-mono"
          />
          <input
            type="number"
            value={minROE}
            onChange={(e) => setMinROE(e.target.value)}
            placeholder="ROE mínimo % (ex: 15)"
            className="h-10 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100 font-mono"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={minDY}
              onChange={(e) => setMinDY(e.target.value)}
              placeholder="DY mín %"
              className="w-1/2 h-10 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100 font-mono"
            />
            <select
              value={consensusFilter}
              onChange={(e) => setConsensusFilter(e.target.value as 'ALL' | '3X' | '4X' | '5X')}
              aria-label="Filtrar por Consenso"
              className="w-1/2 h-10 px-2 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100"
            >
              <option value="ALL">Consenso</option>
              <option value="3X">3X+</option>
              <option value="4X">4X+</option>
              <option value="5X">5X</option>
            </select>
          </div>
        </div>

        {/* Save Filter Row */}
        {user && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/70">
            <div className="flex flex-wrap items-center gap-2">
              {savedFilters
                .filter((f) => f.market === market || f.market === 'ALL')
                .map((f) => (
                  <div
                    key={f.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSectorFilter(f.sector || 'ALL');
                        setMaxPE(f.maxPE != null ? String(f.maxPE) : '');
                        setMinROE(f.minROE != null ? String(f.minROE) : '');
                        setMinDY(f.minDY != null ? String(f.minDY) : '');
                        setConsensusFilter(f.consensusLevel);
                      }}
                      className="text-emerald-300 hover:underline"
                    >
                      {f.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSavedFilter(f.id)}
                      aria-label="Remover filtro salvo"
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Nome para salvar filtro..."
                className="h-8 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100"
              />
              <button
                type="button"
                disabled={savingFilter || !filterName.trim()}
                onClick={handleSaveFilter}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-slate-100"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Salvar filtro</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assets Table */}
      <div className="terminal-glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-medium bg-slate-900/50">
                <th className="py-3 px-4">Ativo</th>
                <th className="py-3 px-3">Categoria / Setor</th>
                <th className="py-3 px-3 text-right">Cotação</th>
                <th className="py-3 px-3 text-right">Var. Dia</th>
                <th className="py-3 px-3 text-right">P/L</th>
                <th className="py-3 px-3 text-right">P/VP</th>
                <th className="py-3 px-3 text-right">ROE</th>
                <th className="py-3 px-3 text-right">DY</th>
                <th className="py-3 px-3 text-right">Desconto</th>
                <th className="py-3 px-4 text-right">Consenso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    Carregando cotações e fundamentos ao vivo...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    Nenhum ativo encontrado com os critérios selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.asset.ticker}
                    onClick={() => onSelectAsset(item.asset.ticker)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <AssetLogo ticker={item.asset.ticker} name={item.asset.name} size={28} />
                        <div className="min-w-0">
                          <div className="font-mono font-semibold text-slate-100">
                            {item.asset.ticker}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {item.asset.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {item.asset.category} · {item.asset.sector}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-100">
                      {formatCurrency(item.asset.price, item.asset.currency)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-medium ${
                        item.asset.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(item.asset.changePercent)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {formatNumber(item.pe, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {formatNumber(item.pb, 2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {formatPercent(item.roe, false)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                      {formatPercent(item.dividendYield, false)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-semibold ${
                        (item.discountPercent ?? -1) >= 0 ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {formatPercent(item.discountPercent)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <ConsensusSeal level={item.consensusLabel} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-slate-800/80 text-[11px] text-slate-500 flex flex-wrap justify-between gap-2">
          <span>Exibindo {filtered.length} ativos reais · Valor de mercado total filtrado: {formatCompact(filtered.reduce((a, b) => a + (b.asset.marketCap ?? 0), 0))}</span>
          <span>Clique em qualquer ativo para abrir a Ficha Completa, Valuation 5 Métodos e Análise Técnica.</span>
        </div>
      </div>
    </div>
  );
};
