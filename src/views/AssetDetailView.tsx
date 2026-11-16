import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowLeft, Bell, ExternalLink, Lock, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { FullAssetAnalysis } from '../shared/types.ts';
import {
  formatCompact,
  formatCurrency,
  formatDateTimeBr,
  formatNumber,
  formatPercent,
} from '../utils/formatters.ts';
import { AssetLogo, ConsensusSeal } from '../components/BrandMark.tsx';
import { TechnicalChart } from '../components/TechnicalChart.tsx';
import type { NavSectionId } from '../components/TerminalShell.tsx';

interface AssetDetailViewProps {
  ticker: string;
  onBack: () => void;
  onNavigate: (section: NavSectionId) => void;
  onSelectAsset: (ticker: string) => void;
}

export const AssetDetailView: React.FC<AssetDetailViewProps> = ({
  ticker,
  onBack,
  onNavigate,
  onSelectAsset,
}) => {
  const { user, apiFetch, watchlist, toggleWatchlist, addAlert } = useAuth();
  const [data, setData] = useState<(FullAssetAnalysis & { planRestricted?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'VALUATION' | 'STATEMENTS' | 'DIVIDENDS' | 'TECHNICAL'
  >('OVERVIEW');
  const [stmtPeriod, setStmtPeriod] = useState<'ANNUAL' | 'QUARTERLY'>('ANNUAL');

  // Interactive Valuation Simulation Overrides
  const [bazinRate, setBazinRate] = useState('8.5');
  const [targetPE, setTargetPE] = useState('15');
  const [minMoS, setMinMoS] = useState('10');
  const [wacc, setWacc] = useState('11');
  const [perpGrowth, setPerpGrowth] = useState('3');
  const [simulating, setSimulating] = useState(false);
  const [alertSaved, setAlertSaved] = useState<string | null>(null);

  const loadFull = async (withOverrides = false) => {
    setLoading(!withOverrides);
    setSimulating(withOverrides);
    setError(null);
    try {
      const params = withOverrides
        ? `?bazinRate=${Number(bazinRate) / 100}&targetPE=${Number(targetPE)}&minMoS=${Number(minMoS)}&wacc=${Number(wacc) / 100}&perpGrowth=${Number(perpGrowth) / 100}`
        : '';
      const res = await apiFetch<FullAssetAnalysis & { planRestricted?: boolean }>(
        `/api/assets/${encodeURIComponent(ticker)}/full${params}`
      );
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar análise da empresa.');
    } finally {
      setLoading(false);
      setSimulating(false);
    }
  };

  useEffect(() => {
    loadFull(false);
    // Track genuine search/view popularity on server
    fetch(`/api/assets/${encodeURIComponent(ticker)}/track-search`, { method: 'POST' }).catch(
      () => undefined
    );
  }, [ticker]);

  const isFavorited = watchlist.some(
    (w) => w.ticker.toUpperCase() === ticker.toUpperCase()
  );

  const handleQuickAlert = async () => {
    if (!user || !data) return;
    const target = Number((data.asset.price * 0.92).toFixed(2));
    await addAlert({
      ticker: data.asset.ticker,
      market: data.asset.market,
      alertType: 'PRICE_BELOW',
      targetValue: target,
      channels: ['PUSH'],
      frequency: 'REALTIME',
      active: true,
    });
    setAlertSaved(`Alerta criado: ${data.asset.ticker} <= ${formatCurrency(target, data.asset.currency)}`);
    setTimeout(() => setAlertSaved(null), 4000);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl terminal-glass animate-pulse" />
        <div className="h-96 rounded-2xl terminal-glass animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="terminal-glass rounded-2xl p-8 text-center space-y-4">
        <p className="text-sm text-rose-300">{error || 'Ativo não encontrado.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-100"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  const { asset, profile, fundamentals, annualStatements, quarterlyStatements, dividends, valuation, automatedSummary } = data;
  const statements = stmtPeriod === 'ANNUAL' ? annualStatements : quarterlyStatements;

  const freshnessLabel =
    asset.freshness === 'REALTIME'
      ? 'Tempo real'
      : asset.freshness === 'DELAYED'
        ? 'Atraso ~15m'
        : 'Último fechamento';

  return (
    <div className="space-y-6">
      {/* Top Action & Identification Banner */}
      <div className="terminal-glass rounded-2xl p-5 lg:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {user && (
              <>
                <button
                  type="button"
                  onClick={() => toggleWatchlist(asset.ticker, asset.market)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    isFavorited
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${isFavorited ? 'fill-amber-400' : ''}`} />
                  <span>{isFavorited ? 'Nos Favoritos' : 'Favoritar'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickAlert}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:border-emerald-500/40 text-xs text-slate-200"
                >
                  <Bell className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Criar Alerta (-8%)</span>
                </button>
              </>
            )}
            <ConsensusSeal level={valuation.consensusLabel} />
          </div>
        </div>

        {alertSaved && (
          <div className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300">
            {alertSaved}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <AssetLogo ticker={asset.ticker} name={asset.name} size={52} />
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h1 className="font-display text-2xl font-bold text-slate-50">
                  {asset.name}
                </h1>
                <span className="font-mono text-base font-bold text-emerald-400">
                  {asset.ticker}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                <span>{asset.exchange}</span>
                <span aria-hidden="true">·</span>
                <span>{profile.country}</span>
                <span aria-hidden="true">·</span>
                <span>{asset.sector}</span>
                <span aria-hidden="true">·</span>
                <span>{asset.segment}</span>
                <span aria-hidden="true">·</span>
                <span>{asset.category}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-6 font-mono">
            <div>
              <div className="text-[11px] text-slate-400">
                Cotação ({freshnessLabel})
              </div>
              <div className="text-2xl lg:text-3xl font-bold text-slate-50">
                {formatCurrency(asset.price, asset.currency)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Variação Diária</div>
              <div
                className={`text-lg font-semibold ${
                  asset.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(asset.change, asset.currency)} ({formatPercent(asset.changePercent)})
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Valor de Mercado</div>
              <div className="text-lg font-semibold text-slate-200">
                {formatCompact(asset.marketCap, asset.currency)}
              </div>
            </div>
          </div>
        </div>

        {/* Quote Day/52w Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-800/80 text-xs">
          <MetricMini label="Mín / Máx Dia" value={`${formatNumber(asset.dayLow)} – ${formatNumber(asset.dayHigh)}`} />
          <MetricMini label="Mín / Máx 52 Sem" value={`${formatNumber(asset.low52w)} – ${formatNumber(asset.high52w)}`} />
          <MetricMini label="Volume Financeiro" value={formatCompact(asset.financialVolume, asset.currency)} />
          <MetricMini label="Valor Justo Médio" value={formatCurrency(valuation.averageFairValue, asset.currency)} highlight="gold" />
          <MetricMini
            label="Desconto Valuation"
            value={formatPercent(valuation.averageDiscountPercent)}
            highlight={(valuation.averageDiscountPercent ?? -1) >= 0 ? 'emerald' : 'crimson'}
          />
          <MetricMini label="Atualização / Fonte" value={`${formatDateTimeBr(asset.updatedAt)} · ${asset.source}`} />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 w-fit">
        {(
          [
            ['OVERVIEW', 'Indicadores & Perfil'],
            ['VALUATION', 'Valuation 5 Métodos & DCF'],
            ['STATEMENTS', 'Histórico Financeiro'],
            ['DIVIDENDS', 'Dividendos'],
            ['TECHNICAL', 'Análise Técnica'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === id
                ? 'bg-emerald-500 text-[#060913] font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {data.planRestricted && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Plano FREE ativo: exibindo resumo fundamentalista, 2 métodos de valuation e 2 anos históricos. Assine PRO ou PREMIUM para liberar os 5 métodos, DCF completo e 10 anos de histórico.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('subscription')}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-[#060913] font-semibold"
          >
            Fazer Upgrade
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW & FUNDAMENTALS */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-5">
          <div className="terminal-glass rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-slate-100">
                Indicadores Fundamentalistas Calculados
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Periodicidade: {fundamentals.periodicity} · Moeda: {fundamentals.currency} · Ref: {fundamentals.referenceDate} · Fonte: {fundamentals.source}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <IndicatorBox label="P/L" value={formatNumber(fundamentals.pe)} />
              <IndicatorBox label="P/VP" value={formatNumber(fundamentals.pb)} />
              <IndicatorBox label="P/EBITDA" value={formatNumber(fundamentals.pEbitda)} />
              <IndicatorBox label="EV/EBITDA" value={formatNumber(fundamentals.evEbitda)} />
              <IndicatorBox label="P/Receita (P/S)" value={formatNumber(fundamentals.ps)} />
              <IndicatorBox label="P/Ativo" value={formatNumber(fundamentals.pAssets)} />
              <IndicatorBox label="ROE" value={formatPercent(fundamentals.roe, false)} />
              <IndicatorBox label="ROIC" value={formatPercent(fundamentals.roic, false)} />
              <IndicatorBox label="ROA" value={formatPercent(fundamentals.roa, false)} />
              <IndicatorBox label="Margem Líquida" value={formatPercent(fundamentals.netMargin, false)} />
              <IndicatorBox label="Margem EBITDA" value={formatPercent(fundamentals.ebitdaMargin, false)} />
              <IndicatorBox label="Margem EBIT" value={formatPercent(fundamentals.ebitMargin, false)} />
              <IndicatorBox label="Receita Líquida" value={formatCompact(fundamentals.revenue, fundamentals.currency)} />
              <IndicatorBox label="EBITDA" value={formatCompact(fundamentals.ebitda, fundamentals.currency)} />
              <IndicatorBox label="EBIT" value={formatCompact(fundamentals.ebit, fundamentals.currency)} />
              <IndicatorBox label="Lucro Líquido" value={formatCompact(fundamentals.netIncome, fundamentals.currency)} />
              <IndicatorBox label="Cresc. Receita" value={formatPercent(fundamentals.revenueGrowth)} />
              <IndicatorBox label="Cresc. Lucro" value={formatPercent(fundamentals.earningsGrowth)} />
              <IndicatorBox label="Dívida Líquida" value={formatCompact(fundamentals.netDebt, fundamentals.currency)} />
              <IndicatorBox label="Dív. Líq / EBITDA" value={fundamentals.netDebtToEbitda != null ? `${formatNumber(fundamentals.netDebtToEbitda)}x` : '—'} />
              <IndicatorBox label="Liquidez Corrente" value={formatNumber(fundamentals.currentRatio)} />
              <IndicatorBox label="Dividend Yield" value={formatPercent(fundamentals.dividendYield, false)} />
              <IndicatorBox label="Payout" value={formatPercent(fundamentals.payout, false)} />
              <IndicatorBox label="CAGR Rec. 5A" value={formatPercent(fundamentals.cagr5yRevenue)} />
              <IndicatorBox label="CAGR Lucro 5A" value={formatPercent(fundamentals.cagr5yEarnings)} />
              <IndicatorBox label="LPA" value={formatCurrency(fundamentals.eps, fundamentals.currency)} />
              <IndicatorBox label="VPA" value={formatCurrency(fundamentals.bvps, fundamentals.currency)} />
              <IndicatorBox label="Free Cash Flow" value={formatCompact(fundamentals.freeCashFlow, fundamentals.currency)} />
              <IndicatorBox label="FCF Yield" value={formatPercent(fundamentals.fcfYield, false)} />
              <IndicatorBox label="Earnings Yield / PEG" value={`${formatPercent(fundamentals.earningsYield, false)} / ${formatNumber(fundamentals.pegRatio)}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="terminal-glass rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-base font-semibold text-slate-100">
                Perfil Corporativo & Histórico
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                {profile.description}
              </p>
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80 flex flex-wrap gap-4">
                <span>{profile.historyNote}</span>
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                  >
                    <span>Site RI / Institucional</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="terminal-glass rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-slate-100">
                  Resumo Automatizado de Fundamentos
                </h3>
                <span className="font-mono text-xs text-emerald-400">
                  {automatedSummary.trend}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="font-semibold text-emerald-300 mb-1">Pontos Positivos</div>
                  <ul className="space-y-1 text-slate-300">
                    {automatedSummary.positives.map((p, i) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-amber-300 mb-1">Riscos & Pontos de Atenção</div>
                  <ul className="space-y-1 text-slate-300">
                    {automatedSummary.risks.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
                {automatedSummary.notableChanges.length > 0 && (
                  <div>
                    <div className="font-semibold text-slate-200 mb-1">Evolução Histórica</div>
                    <ul className="space-y-1 text-slate-400">
                      {automatedSummary.notableChanges.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VALUATION 5 METHODS & DCF SIMULATOR */}
      {activeTab === 'VALUATION' && (
        <div className="space-y-5">
          {/* Interactive Simulator Bar */}
          <div className="terminal-glass rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-100">
                  Simulador de Premissas de Valuation
                </h2>
                <p className="text-xs text-slate-400">
                  Altere taxas Bazin, P/L alvo, WACC e margem de segurança para recalcular todos os métodos em tempo real.
                </p>
              </div>
              <button
                type="button"
                disabled={simulating}
                onClick={() => loadFull(true)}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs transition-colors"
              >
                {simulating ? 'Recalculando...' : 'Aplicar Premissas'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Taxa Bazin (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={bazinRate}
                  onChange={(e) => setBazinRate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">P/L Referência</label>
                <input
                  type="number"
                  step="0.5"
                  value={targetPE}
                  onChange={(e) => setTargetPE(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Margem Seg. Mín (%)</label>
                <input
                  type="number"
                  step="1"
                  value={minMoS}
                  onChange={(e) => setMinMoS(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">WACC DCF (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={wacc}
                  onChange={(e) => setWacc(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Perpetuidade g (%)</label>
                <input
                  type="number"
                  step="0.25"
                  value={perpGrowth}
                  onChange={(e) => setPerpGrowth(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* 5 Valuation Method Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {valuation.methods.map((m) => (
              <div
                key={m.method}
                className={`rounded-2xl p-5 space-y-3 ${
                  m.approved ? 'terminal-glass-emerald' : 'terminal-glass'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-slate-100">
                    {m.label}
                  </h3>
                  <span
                    className={`font-mono text-xs font-semibold ${
                      !m.applicable
                        ? 'text-slate-500'
                        : m.approved
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                    }`}
                  >
                    {!m.applicable ? 'Inaplicável' : m.approved ? 'Aprovado' : 'Reprovado'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">{m.formulaNote}</div>
                {m.applicable ? (
                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-800/80 font-mono">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Valor Estimado</span>
                      <strong className="text-xl text-amber-300">
                        {formatCurrency(m.fairValue, asset.currency)}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Desconto</span>
                      <strong
                        className={`text-base ${
                          (m.discountPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatPercent(m.discountPercent)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    {m.reasonIfInapplicable}
                  </p>
                )}
              </div>
            ))}

            {/* Quality vs Discount Card */}
            <div className="terminal-glass-gold rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-slate-100">
                  Qualidade Empresarial
                </h3>
                <span className="font-mono text-sm font-bold text-amber-300">
                  {valuation.quality.overallQuality}/100 · {valuation.quality.classification}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <QualityRow label="Qualidade dos Fundamentos" score={valuation.quality.fundamentalsScore} />
                <QualityRow label="Saúde do Endividamento" score={valuation.quality.debtScore} />
                <QualityRow label="Crescimento" score={valuation.quality.growthScore} />
                <QualityRow label="Consistência dos Lucros" score={valuation.quality.earningsConsistencyScore} />
                <QualityRow label="Sustentabilidade de Dividendos" score={valuation.quality.dividendSustainabilityScore} />
              </div>
            </div>
          </div>

          {/* DCF Scenarios & Sensitivity Matrix */}
          {valuation.dcfScenarios.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="terminal-glass rounded-2xl p-5 space-y-3">
                <h3 className="font-display text-base font-semibold text-slate-100">
                  Cenários DCF (Conservador · Base · Otimista)
                </h3>
                <div className="divide-y divide-slate-800/80 text-xs">
                  {valuation.dcfScenarios.map((sc) => (
                    <div key={sc.name} className="py-3 flex items-center justify-between font-mono">
                      <div>
                        <div className="font-semibold text-slate-100">{sc.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Cresc: {sc.growthRate}% · WACC: {sc.wacc}% · g: {sc.perpetualGrowth}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-300 font-bold">
                          {formatCurrency(sc.fairValue, asset.currency)}
                        </div>
                        <div className={(sc.discountPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {formatPercent(sc.discountPercent)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="terminal-glass rounded-2xl p-5 space-y-3 overflow-x-auto">
                <h3 className="font-display text-base font-semibold text-slate-100">
                  Matriz de Sensibilidade DCF (WACC × Perpetuidade g)
                </h3>
                <table className="w-full text-xs font-mono text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 text-left">WACC \ g</th>
                      {valuation.dcfSensitivity.growthValues.map((g) => (
                        <th key={g} className="py-2 px-2">{g}%</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {valuation.dcfSensitivity.waccValues.map((wVal, rIdx) => (
                      <tr key={wVal}>
                        <td className="py-2 text-left text-slate-400">{wVal}%</td>
                        {valuation.dcfSensitivity.matrix[rIdx].map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-2 px-2 ${
                              val != null && val > asset.price ? 'text-emerald-300' : 'text-slate-300'
                            }`}
                          >
                            {val != null ? formatCurrency(val, asset.currency) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comparable Peers */}
          {valuation.comparablesPeers.length > 0 && (
            <div className="terminal-glass rounded-2xl p-5 space-y-3 overflow-x-auto">
              <h3 className="font-display text-base font-semibold text-slate-100">
                Pares Comparáveis do Setor ({asset.sector})
              </h3>
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 text-left">Empresa</th>
                    <th className="py-2 px-3">P/L</th>
                    <th className="py-2 px-3">EV/EBITDA</th>
                    <th className="py-2 px-3">P/VP</th>
                    <th className="py-2 px-3">P/S</th>
                    <th className="py-2 px-3">FCF Yield</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono">
                  {valuation.comparablesPeers.map((p) => (
                    <tr
                      key={p.ticker}
                      onClick={() => onSelectAsset(p.ticker)}
                      className="hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="py-2 text-left font-sans">
                        <span className="font-mono font-semibold text-slate-100">{p.ticker}</span>{' '}
                        <span className="text-slate-400">· {p.name}</span>
                      </td>
                      <td className="py-2 px-3">{formatNumber(p.pe)}</td>
                      <td className="py-2 px-3">{formatNumber(p.evEbitda)}</td>
                      <td className="py-2 px-3">{formatNumber(p.pb)}</td>
                      <td className="py-2 px-3">{formatNumber(p.ps)}</td>
                      <td className="py-2 px-3">{formatPercent(p.fcfYield, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-slate-500">{valuation.disclaimer}</p>
        </div>
      )}

      {/* TAB 3: FINANCIAL STATEMENTS HISTORY */}
      {activeTab === 'STATEMENTS' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-display text-lg font-semibold text-slate-100">
              Histórico Financeiro ({statements.length} períodos disponíveis)
            </h2>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setStmtPeriod('ANNUAL')}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  stmtPeriod === 'ANNUAL' ? 'bg-emerald-500 text-[#060913] font-semibold' : 'text-slate-400'
                }`}
              >
                Anual (5–10 anos)
              </button>
              <button
                type="button"
                onClick={() => setStmtPeriod('QUARTERLY')}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  stmtPeriod === 'QUARTERLY' ? 'bg-emerald-500 text-[#060913] font-semibold' : 'text-slate-400'
                }`}
              >
                Trimestral
              </button>
            </div>
          </div>

          {statements.length === 0 ? (
            <div className="terminal-glass rounded-2xl p-8 text-center text-xs text-slate-400">
              Demonstrações financeiras detalhadas indisponíveis para este instrumento ou restritas ao plano PRO/PREMIUM.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="terminal-glass rounded-2xl p-5">
                  <h3 className="font-display text-sm font-semibold text-slate-200 mb-3">
                    Receita Líquida, EBITDA e Lucro Líquido ({asset.currency})
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statements}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                        <XAxis dataKey="periodEnd" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => formatCompact(v)} />
                        <Tooltip
                          contentStyle={{ background: '#0B1120', border: '1px solid #1E293B', fontSize: '11px' }}
                          formatter={(v: unknown) => formatCompact(Number(v), asset.currency)}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="revenue" name="Receita" fill="#38BDF8" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="ebitda" name="EBITDA" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="netIncome" name="Lucro Líquido" fill="#10B981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="terminal-glass rounded-2xl p-5">
                  <h3 className="font-display text-sm font-semibold text-slate-200 mb-3">
                    Margens Líquida e EBITDA (%)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={statements}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                        <XAxis dataKey="periodEnd" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} unit="%" />
                        <Tooltip
                          contentStyle={{ background: '#0B1120', border: '1px solid #1E293B', fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="netMargin" name="Margem Líquida %" stroke="#10B981" strokeWidth={2} />
                        <Line type="monotone" dataKey="ebitdaMargin" name="Margem EBITDA %" stroke="#F59E0B" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Financial Evolution Table */}
              <div className="terminal-glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                        <th className="py-3 px-4 text-left">Período</th>
                        <th className="py-3 px-3">Receita</th>
                        <th className="py-3 px-3">EBITDA</th>
                        <th className="py-3 px-3">Lucro Líquido</th>
                        <th className="py-3 px-3">Margem Líq.</th>
                        <th className="py-3 px-3">Patrimônio Líq.</th>
                        <th className="py-3 px-3">Dívida Líq.</th>
                        <th className="py-3 px-4">Fluxo Caixa Livre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono">
                      {statements.map((st) => (
                        <tr key={st.periodEnd} className="hover:bg-slate-800/35">
                          <td className="py-2.5 px-4 text-left text-slate-200">{st.periodEnd}</td>
                          <td className="py-2.5 px-3">{formatCompact(st.revenue, st.currency)}</td>
                          <td className="py-2.5 px-3">{formatCompact(st.ebitda, st.currency)}</td>
                          <td className="py-2.5 px-3 text-emerald-300">{formatCompact(st.netIncome, st.currency)}</td>
                          <td className="py-2.5 px-3">{formatPercent(st.netMargin, false)}</td>
                          <td className="py-2.5 px-3">{formatCompact(st.totalEquity, st.currency)}</td>
                          <td className="py-2.5 px-3">{formatCompact(st.netDebt, st.currency)}</td>
                          <td className="py-2.5 px-4">{formatCompact(st.freeCashFlow, st.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 4: DIVIDENDS */}
      {activeTab === 'DIVIDENDS' && (
        <div className="space-y-5">
          {dividends.yieldTrapWarning && (
            <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200">
              {dividends.yieldTrapWarning}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <IndicatorBox label="DY Atual (12m)" value={formatPercent(dividends.currentYield, false)} />
            <IndicatorBox label="DY Histórico Médio" value={formatPercent(dividends.historicalAvgYield5y, false)} />
            <IndicatorBox label="Proventos/Ação (12m)" value={formatCurrency(dividends.annualDividendPerShare, asset.currency)} />
            <IndicatorBox label="Recorrente/Ação" value={formatCurrency(dividends.recurringAnnualDividendPerShare, asset.currency)} />
            <IndicatorBox label="Frequência / Consist." value={`${dividends.frequency} · ${dividends.consistencyYears} anos`} />
            <IndicatorBox label="Qualidade Proventos" value={`${dividends.qualityTier} (${dividends.sustainabilityScore}/100)`} />
          </div>

          <div className="terminal-glass rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-slate-100">
                Histórico de Proventos Pagos
              </h3>
              <span className="text-xs text-slate-400">
                Proventos extraordinários sinalizados automaticamente
              </span>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                    <th className="py-2.5 px-4">Data</th>
                    <th className="py-2.5 px-4">Tipo</th>
                    <th className="py-2.5 px-4 text-right">Valor por Ação</th>
                    <th className="py-2.5 px-4 text-right">Classificação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono">
                  {dividends.events.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-sans">
                        Sem pagamentos de dividendos registrados no horizonte consultado.
                      </td>
                    </tr>
                  ) : (
                    dividends.events.map((ev, i) => (
                      <tr key={`${ev.date}-${i}`} className="hover:bg-slate-800/35">
                        <td className="py-2 px-4 text-slate-200">{ev.date}</td>
                        <td className="py-2 px-4 text-slate-400">{ev.type}</td>
                        <td className="py-2 px-4 text-right text-emerald-300">
                          {formatCurrency(ev.amount, ev.currency, 4)}
                        </td>
                        <td className="py-2 px-4 text-right">
                          <span className={ev.isExtraordinary ? 'text-amber-400' : 'text-slate-400'}>
                            {ev.isExtraordinary ? 'Extraordinário' : 'Recorrente'}
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
      )}

      {/* TAB 5: TECHNICAL */}
      {activeTab === 'TECHNICAL' && (
        <TechnicalChart ticker={asset.ticker} currency={asset.currency} />
      )}
    </div>
  );
};

const MetricMini: React.FC<{
  label: string;
  value: string;
  highlight?: 'emerald' | 'gold' | 'crimson';
}> = ({ label, value, highlight }) => (
  <div>
    <div className="text-[11px] text-slate-500">{label}</div>
    <div
      className={`font-mono text-xs font-semibold mt-0.5 truncate ${
        highlight === 'emerald'
          ? 'text-emerald-400'
          : highlight === 'gold'
            ? 'text-amber-300'
            : highlight === 'crimson'
              ? 'text-rose-400'
              : 'text-slate-200'
      }`}
    >
      {value}
    </div>
  </div>
);

const IndicatorBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
    <div className="text-[11px] text-slate-400 truncate">{label}</div>
    <div className="font-mono text-sm font-semibold text-slate-100 mt-1">{value}</div>
  </div>
);

const QualityRow: React.FC<{ label: string; score: number }> = ({ label, score }) => (
  <div className="space-y-1">
    <div className="flex justify-between">
      <span className="text-slate-300">{label}</span>
      <span className="font-mono text-slate-100">{score}/100</span>
    </div>
    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
      <div
        className={`h-full rounded-full ${
          score >= 70 ? 'bg-emerald-500' : score >= 45 ? 'bg-amber-400' : 'bg-rose-500'
        }`}
        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
      />
    </div>
  </div>
);
