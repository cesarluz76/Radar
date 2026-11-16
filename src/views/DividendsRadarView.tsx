import React, { useMemo, useState } from 'react';
import { AlertTriangle, Coins } from 'lucide-react';
import type { ScreenerEntry } from '../server/valuationEngine.ts';
import type { Market } from '../shared/types.ts';
import { formatCurrency, formatPercent } from '../utils/formatters.ts';
import { AssetLogo } from '../components/BrandMark.tsx';

interface DividendsRadarViewProps {
  universe: ScreenerEntry[];
  loading: boolean;
  onSelectAsset: (ticker: string) => void;
}

export const DividendsRadarView: React.FC<DividendsRadarViewProps> = ({
  universe,
  loading,
  onSelectAsset,
}) => {
  const [marketFilter, setMarketFilter] = useState<'ALL' | Market>('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'DY' | 'CAGR' | 'LOW_PAYOUT' | 'CONSISTENCY'>('DY');

  const sectors = useMemo(
    () => Array.from(new Set(universe.map((u) => u.asset.sector))).sort(),
    [universe]
  );

  const ranked = useMemo(() => {
    return universe
      .filter((item) => {
        if (item.dividendYield == null || item.dividendYield <= 0) return false;
        if (marketFilter !== 'ALL' && item.asset.market !== marketFilter) return false;
        if (sectorFilter !== 'ALL' && item.asset.sector !== sectorFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'CAGR') return (b.dividendCagr5y ?? -99) - (a.dividendCagr5y ?? -99);
        if (sortBy === 'LOW_PAYOUT') return (a.payout ?? 999) - (b.payout ?? 999);
        if (sortBy === 'CONSISTENCY') return b.consistencyYears - a.consistencyYears;
        return (b.dividendYield ?? 0) - (a.dividendYield ?? 0);
      });
  }, [universe, marketFilter, sectorFilter, sortBy]);

  const yieldWarnings = ranked.filter((r) => r.yieldTrapWarning);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50 flex items-center gap-2.5">
            <Coins className="w-6 h-6 text-amber-400" />
            <span>Radar de Dividendos Inteligentes</span>
          </h1>
          <p className="text-sm text-slate-400">
            Classificação por qualidade de proventos, crescimento (CAGR), sustentabilidade do payout e detecção automática de yield distorcido por queda de cotação.
          </p>
        </div>
      </div>

      {yieldWarnings.length > 0 && (
        <div className="terminal-glass-gold rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong>Alerta de Yield Distorcido:</strong>{' '}
            {yieldWarnings.slice(0, 4).map((w) => w.asset.ticker).join(', ')}{' '}
            apresentam Dividend Yield elevado em razão de queda expressiva recente ou payout acima de 100%. Analise a ficha antes de considerar renda recorrente.
          </div>
        </div>
      )}

      <div className="terminal-glass rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
          {(
            [
              ['DY', 'Maior Dividend Yield'],
              ['CAGR', 'Maior Crescimento'],
              ['LOW_PAYOUT', 'Menor Payout'],
              ['CONSISTENCY', 'Maior Consistência'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSortBy(id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                sortBy === id
                  ? 'bg-emerald-500 text-[#060913] font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value as 'ALL' | Market)}
          className="h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100"
        >
          <option value="ALL">Brasil & EUA</option>
          <option value="BR">Brasil (B3)</option>
          <option value="US">Estados Unidos</option>
        </select>

        <select
          value={sectorFilter}
          onChange={(e) => setSectorFilter(e.target.value)}
          className="h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100"
        >
          <option value="ALL">Todos os setores</option>
          {sectors.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="terminal-glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-900/50">
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-3 text-right">Cotação</th>
                <th className="py-3 px-3 text-right">DY Atual</th>
                <th className="py-3 px-3 text-right">Payout</th>
                <th className="py-3 px-3 text-right">CAGR Div. 5A</th>
                <th className="py-3 px-3 text-right">Consistência</th>
                <th className="py-3 px-4 text-right">Qualidade Provento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && ranked.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Calculando histórico de dividendos e sustentabilidade...
                  </td>
                </tr>
              ) : ranked.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Nenhuma pagadora encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                ranked.map((item) => (
                  <tr
                    key={item.asset.ticker}
                    onClick={() => onSelectAsset(item.asset.ticker)}
                    className="hover:bg-slate-800/45 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <AssetLogo ticker={item.asset.ticker} name={item.asset.name} size={28} />
                        <div className="min-w-0">
                          <div className="font-mono font-semibold text-slate-100">
                            {item.asset.ticker}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {item.asset.name} · {item.asset.sector}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-100">
                      {formatCurrency(item.asset.price, item.asset.currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                      {formatPercent(item.dividendYield, false)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {formatPercent(item.payout, false)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-300">
                      {formatPercent(item.dividendCagr5y)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {item.consistencyYears} anos
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      <span
                        className={
                          item.dividendQualityTier === 'ELITE'
                            ? 'text-emerald-400 font-semibold'
                            : item.dividendQualityTier === 'ALERTA'
                              ? 'text-rose-400 font-semibold'
                              : 'text-amber-300'
                        }
                      >
                        {item.dividendQualityTier}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
