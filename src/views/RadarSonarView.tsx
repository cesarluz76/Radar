import React, { useMemo, useState } from 'react';
import { Lock, Radar, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { ScreenerEntry } from '../server/valuationEngine.ts';
import type { Market } from '../shared/types.ts';
import { formatCurrency, formatPercent } from '../utils/formatters.ts';
import { AssetLogo, ConsensusSeal } from '../components/BrandMark.tsx';
import { RadarSonarCanvas } from '../components/RadarSonarCanvas.tsx';
import type { NavSectionId } from '../components/TerminalShell.tsx';

interface RadarSonarViewProps {
  mode: 'SONAR' | '3X' | '4X' | '5X';
  universe: ScreenerEntry[];
  loading: boolean;
  onRefreshWithParams: (params: {
    bazinRate: number;
    targetPE: number;
    minMoS: number;
  }) => Promise<void>;
  onSelectAsset: (ticker: string) => void;
  onNavigate: (section: NavSectionId) => void;
}

export const RadarSonarView: React.FC<RadarSonarViewProps> = ({
  mode,
  universe,
  loading,
  onRefreshWithParams,
  onSelectAsset,
  onNavigate,
}) => {
  const { effectivePlan } = useAuth();
  const [marketFilter, setMarketFilter] = useState<'ALL' | Market>('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [consensusFilter, setConsensusFilter] = useState<'ALL' | '3X' | '4X' | '5X'>(
    mode === 'SONAR' ? 'ALL' : mode
  );

  const [bazinRatePct, setBazinRatePct] = useState('8.5');
  const [targetPE, setTargetPE] = useState('15');
  const [minMoS, setMinMoS] = useState('10');
  const [recomputing, setRecomputing] = useState(false);

  // Sync mode when switching sidebar tabs (3X/4X/5X)
  React.useEffect(() => {
    setConsensusFilter(mode === 'SONAR' ? 'ALL' : mode);
  }, [mode]);

  const sectors = useMemo(
    () => Array.from(new Set(universe.map((u) => u.asset.sector))).sort(),
    [universe]
  );

  const filtered = useMemo(() => {
    return universe
      .filter((item) => {
        if (marketFilter !== 'ALL' && item.asset.market !== marketFilter) return false;
        if (sectorFilter !== 'ALL' && item.asset.sector !== sectorFilter) return false;
        if (consensusFilter === '3X' && item.consensusCount < 3) return false;
        if (consensusFilter === '4X' && item.consensusCount < 4) return false;
        if (consensusFilter === '5X' && item.consensusCount < 5) return false;
        return true;
      })
      .sort(
        (a, b) =>
          b.consensusCount - a.consensusCount ||
          (b.discountPercent ?? -999) - (a.discountPercent ?? -999)
      );
  }, [universe, marketFilter, sectorFilter, consensusFilter]);

  const isLocked =
    (mode === 'SONAR' && effectivePlan === 'FREE') ||
    ((mode === '4X' || mode === '5X') && effectivePlan !== 'PREMIUM') ||
    (mode === '3X' && effectivePlan === 'FREE');

  const handleRecalculate = async () => {
    setRecomputing(true);
    try {
      await onRefreshWithParams({
        bazinRate: Math.max(0.01, Number(bazinRatePct) / 100),
        targetPE: Math.max(1, Number(targetPE)),
        minMoS: Math.max(0, Number(minMoS)),
      });
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50 flex items-center gap-2.5">
            <Radar className="w-6 h-6 text-emerald-400" />
            <span>
              {mode === 'SONAR'
                ? 'Radar Sonar — Inteligência em Valuation'
                : `Selo Consenso ${mode}`}
            </span>
          </h1>
          <p className="text-sm text-slate-400">
            Convergência matemática entre Teto Bazin, Preço Justo Graham, P/L Alvo, Fluxo de Caixa Descontado (DCF) e Múltiplos Comparáveis.
          </p>
        </div>

        {/* Plan Gating Banner for FREE/PRO */}
        {isLocked && (
          <button
            type="button"
            onClick={() => onNavigate('subscription')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-colors whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>
              {mode === '4X' || mode === '5X'
                ? `Desbloquear Consenso ${mode} no Plano PREMIUM`
                : 'Desbloquear Radar Sonar completo no Plano PRO'}
            </span>
          </button>
        )}
      </div>

      {/* Controls & Parameters */}
      <div className="terminal-glass rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-end">
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Mercado</label>
          <select
            value={marketFilter}
            onChange={(e) => setMarketFilter(e.target.value as 'ALL' | Market)}
            className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100"
          >
            <option value="ALL">Brasil & EUA</option>
            <option value="BR">Brasil (B3)</option>
            <option value="US">Estados Unidos</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Setor</label>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100"
          >
            <option value="ALL">Todos os setores</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Selo Consenso</label>
          <select
            value={consensusFilter}
            onChange={(e) =>
              setConsensusFilter(e.target.value as 'ALL' | '3X' | '4X' | '5X')
            }
            className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-xs text-slate-100"
          >
            <option value="ALL">Todos os ativos</option>
            <option value="3X">Consenso 3X ou superior</option>
            <option value="4X">Consenso 4X ou superior</option>
            <option value="5X">Consenso 5X máximo</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Taxa Bazin (%)</label>
          <input
            type="number"
            step="0.5"
            value={bazinRatePct}
            onChange={(e) => setBazinRatePct(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-xs font-mono text-slate-100"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Margem Seg. Mín (%)</label>
          <input
            type="number"
            step="1"
            value={minMoS}
            onChange={(e) => setMinMoS(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-xs font-mono text-slate-100"
          />
        </div>
        <button
          type="button"
          disabled={recomputing || loading}
          onClick={handleRecalculate}
          className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#060913] font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin' : ''}`} />
          <span>Recalcular Radar</span>
        </button>
      </div>

      {/* Interactive Radar + Summary Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-5 terminal-glass rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Varredura Polar de Desconto
            </h2>
            <span className="font-mono text-xs text-slate-400">
              {filtered.length} ativos mapeados
            </span>
          </div>
          <RadarSonarCanvas items={filtered} onSelectAsset={onSelectAsset} />
        </div>

        <div className="xl:col-span-7 terminal-glass rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-100">
                Matriz de Convergência e Qualidade
              </h2>
              <p className="text-xs text-slate-400">
                Desconto = (Valor Justo Médio / Cotação - 1) × 100 · Margem mínima exigida: {minMoS}%.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-900/50">
                  <th className="py-2.5 px-4">Ativo</th>
                  <th className="py-2.5 px-3 text-right">Cotação</th>
                  <th className="py-2.5 px-3 text-right">Valor Justo</th>
                  <th className="py-2.5 px-3 text-right">Desconto</th>
                  <th className="py-2.5 px-3 text-right">Qualidade</th>
                  <th className="py-2.5 px-4 text-right">Consenso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      {loading
                        ? 'Calculando modelos de valuation em tempo real...'
                        : 'Nenhum ativo atingiu este nível de consenso com os parâmetros atuais.'}
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, isLocked ? 5 : 40).map((item) => (
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
                            <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                              {item.asset.sector}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-100">
                        {formatCurrency(item.asset.price, item.asset.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                        {formatCurrency(item.averageFairValue, item.asset.currency)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-semibold ${
                          (item.discountPercent ?? -1) >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {formatPercent(item.discountPercent)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {item.overallQuality}/100
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

          {isLocked && filtered.length > 5 && (
            <div className="p-4 border-t border-amber-500/20 bg-amber-500/5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-300">
                Exibindo amostra inicial ({filtered.length} oportunidades detectadas no total). Faça upgrade para visualizar toda a lista e simulações completas.
              </span>
              <button
                type="button"
                onClick={() => onNavigate('subscription')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-[#060913] font-semibold hover:bg-amber-400 transition-colors"
              >
                Ver Planos PRO & PREMIUM
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Nota metodológica: Os selos Consenso 3X, 4X e 5X representam exclusivamente convergência matemática entre metodologias independentes de valuation. Nenhum selo 5X é atribuído quando qualquer um dos 5 métodos não puder ser calculado por ausência de dados ou lucro negativo.
      </p>
    </div>
  );
};
