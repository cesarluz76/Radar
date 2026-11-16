import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Briefcase, Edit3, LogIn, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { computePortfolioAnalytics } from '../shared/portfolioMath.ts';
import type {
  AssetCategory,
  AssetSummary,
  MacroOverview,
  Market,
  PortfolioTransactionRecord,
} from '../shared/types.ts';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters.ts';
import { AssetLogo } from '../components/BrandMark.tsx';

interface PortfolioAndEvolutionViewProps {
  mode: 'PORTFOLIO' | 'EVOLUTION';
  macro: MacroOverview | null;
  onSelectAsset: (ticker: string) => void;
}

const CHART_COLORS = ['#10B981', '#F59E0B', '#38BDF8', '#A78BFA', '#FB7185', '#2DD4BF'];

export const PortfolioAndEvolutionView: React.FC<PortfolioAndEvolutionViewProps> = ({
  mode,
  macro,
  onSelectAsset,
}) => {
  const {
    user,
    profile,
    signInWithGoogle,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useAuth();

  const [quotesMap, setQuotesMap] = useState<Record<string, AssetSummary>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'ALL' | '12M' | 'YTD'>('ALL');
  const [submitting, setSubmitting] = useState(false);

  // Transaction Form Fields
  const [ticker, setTicker] = useState('PETR4');
  const [market, setMarket] = useState<Market>('BR');
  const [assetType, setAssetType] = useState<AssetCategory>('STOCK');
  const [operationType, setOperationType] =
    useState<PortfolioTransactionRecord['operationType']>('BUY');
  const [quantity, setQuantity] = useState('100');
  const [unitPrice, setUnitPrice] = useState('38.50');
  const [fees, setFees] = useState('0');
  const [brokerage, setBrokerage] = useState('0');
  const [fxRate, setFxRate] = useState('1');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [splitRatio, setSplitRatio] = useState('2');
  const [notes, setNotes] = useState('');

  const currentUsdBrl = macro?.usdBrl.value || 5.75;

  // Fetch real-time quotes for all unique tickers in user's portfolio
  useEffect(() => {
    const uniqueTickers = Array.from(
      new Set(transactions.map((t) => t.ticker.toUpperCase()))
    );
    if (uniqueTickers.length === 0) return;

    Promise.all(
      uniqueTickers.map((t) =>
        fetch(`/api/assets/${encodeURIComponent(t)}/summary`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((items) => {
      const next: Record<string, AssetSummary> = {};
      for (const item of items) {
        if (item && item.ticker) next[item.ticker] = item;
      }
      setQuotesMap(next);
    });
  }, [transactions]);

  const analytics = useMemo(
    () => computePortfolioAnalytics(transactions, quotesMap, currentUsdBrl),
    [transactions, quotesMap, currentUsdBrl]
  );

  const filteredEvolution = useMemo(() => {
    if (periodFilter === 'ALL') return analytics.monthlyEvolution;
    if (periodFilter === '12M') return analytics.monthlyEvolution.slice(-12);
    const yr = new Date().toISOString().slice(0, 4);
    return analytics.monthlyEvolution.filter((m) => m.month.startsWith(yr));
  }, [analytics.monthlyEvolution, periodFilter]);

  if (!user) {
    return (
      <div className="terminal-glass rounded-2xl p-10 text-center max-w-xl mx-auto space-y-4">
        <Briefcase className="w-10 h-10 text-emerald-400 mx-auto" />
        <h1 className="font-display text-xl font-bold text-slate-50">
          {mode === 'PORTFOLIO' ? 'Minha Carteira Privada' : 'Evolução Patrimonial'}
        </h1>
        <p className="text-sm text-slate-400">
          Sua carteira e histórico de movimentações são estritamente privados e protegidos por autenticação individual. Faça login para registrar operações em ações B3, FIIs, ETFs, BDRs, Stocks e REITs.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs"
        >
          <LogIn className="w-4 h-4" />
          <span>Entrar com Google</span>
        </button>
      </div>
    );
  }

  const openNewForm = () => {
    setEditingId(null);
    setTicker('PETR4');
    setMarket('BR');
    setAssetType('STOCK');
    setOperationType('BUY');
    setQuantity('100');
    setUnitPrice('38.50');
    setFees('0');
    setBrokerage('0');
    setFxRate('1');
    setDate(new Date().toISOString().slice(0, 10));
    setSplitRatio('2');
    setNotes('');
    setShowForm(true);
  };

  const openEditForm = (tx: PortfolioTransactionRecord) => {
    setEditingId(tx.id);
    setTicker(tx.ticker);
    setMarket(tx.market);
    setAssetType(tx.assetType);
    setOperationType(tx.operationType);
    setQuantity(String(tx.quantity));
    setUnitPrice(String(tx.unitPrice));
    setFees(String(tx.fees));
    setBrokerage(String(tx.brokerage));
    setFxRate(String(tx.fxRate));
    setDate(tx.date);
    setSplitRatio(String(tx.splitRatio || 2));
    setNotes(tx.notes || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        portfolioId: 'principal',
        ticker: ticker.trim().toUpperCase(),
        market,
        assetType,
        operationType,
        quantity: Number(quantity) || 0,
        unitPrice: Number(unitPrice) || 0,
        fees: Number(fees) || 0,
        brokerage: Number(brokerage) || 0,
        fxRate: market === 'US' ? Math.max(0.1, Number(fxRate) || currentUsdBrl) : 1,
        currency: market === 'US' ? ('USD' as const) : ('BRL' as const),
        date,
        notes: notes.trim() || undefined,
        splitRatio:
          operationType === 'SPLIT' || operationType === 'REVERSE_SPLIT'
            ? Number(splitRatio) || 1
            : undefined,
      };
      if (editingId) {
        await updateTransaction(editingId, payload);
      } else {
        await addTransaction(payload);
      }
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const goalAmount = profile?.financialGoal || 500000;
  const goalPct = goalAmount > 0 ? Math.min(100, (analytics.totalMarketValueBRL / goalAmount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            {mode === 'PORTFOLIO'
              ? 'Minha Carteira de Investimentos'
              : 'Evolução Patrimonial & Rentabilidade'}
          </h1>
          <p className="text-sm text-slate-400">
            Cálculo de preço médio, eventos corporativos (splits/bonificações/amortizações), conversão cambial histórica vs atual (USD/BRL {formatCurrency(currentUsdBrl, 'BRL')}), TWR e XIRR.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Movimentação</span>
        </button>
      </div>

      {/* Portfolio KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard label="Patrimônio Atual" value={formatCurrency(analytics.totalMarketValueBRL, 'BRL')} accent="emerald" />
        <KpiCard label="Total Investido" value={formatCurrency(analytics.totalInvestedBRL, 'BRL')} />
        <KpiCard
          label="Lucro / Prejuízo"
          value={formatCurrency(analytics.totalPnlBRL, 'BRL')}
          accent={analytics.totalPnlBRL >= 0 ? 'emerald' : 'crimson'}
        />
        <KpiCard
          label="Rentab. c/ Proventos"
          value={formatPercent(analytics.totalReturnWithDividendsPctBRL)}
          accent={analytics.totalReturnWithDividendsPctBRL >= 0 ? 'emerald' : 'crimson'}
        />
        <KpiCard label="TWR (Cota)" value={formatPercent(analytics.twrPct)} accent="gold" />
        <KpiCard
          label="XIRR (TIR Anual)"
          value={analytics.xirrPct != null ? formatPercent(analytics.xirrPct) : '—'}
          accent="gold"
        />
      </div>

      {/* Add / Edit Transaction Modal Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="terminal-glass-emerald rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-100">
              {editingId ? 'Editar Movimentação' : 'Nova Movimentação / Evento Corporativo'}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Ticker</label>
              <input
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Mercado</label>
              <select
                value={market}
                onChange={(e) => {
                  const m = e.target.value as Market;
                  setMarket(m);
                  setFxRate(m === 'US' ? String(currentUsdBrl.toFixed(2)) : '1');
                }}
                className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
              >
                <option value="BR">Brasil (BRL)</option>
                <option value="US">EUA (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Classe</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetCategory)}
                className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
              >
                <option value="STOCK">Ação / Stock</option>
                <option value="FII">FII</option>
                <option value="ETF">ETF</option>
                <option value="BDR">BDR</option>
                <option value="REIT">REIT</option>
                <option value="ADR">ADR</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Operação</label>
              <select
                value={operationType}
                onChange={(e) =>
                  setOperationType(
                    e.target.value as PortfolioTransactionRecord['operationType']
                  )
                }
                className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
              >
                <option value="BUY">Compra</option>
                <option value="SELL">Venda</option>
                <option value="DIVIDEND">Provento Recebido</option>
                <option value="SPLIT">Desdobramento (Split)</option>
                <option value="REVERSE_SPLIT">Grupamento</option>
                <option value="BONUS">Bonificação</option>
                <option value="AMORTIZATION">Amortização</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                {operationType === 'SPLIT' || operationType === 'REVERSE_SPLIT'
                  ? 'Fator (ex: 2)'
                  : 'Quantidade'}
              </label>
              {operationType === 'SPLIT' || operationType === 'REVERSE_SPLIT' ? (
                <input
                  type="number"
                  step="0.01"
                  required
                  value={splitRatio}
                  onChange={(e) => setSplitRatio(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
                />
              ) : (
                <input
                  type="number"
                  step="0.0001"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
                />
              )}
            </div>
            <div>
              <label className="block text-slate-400 mb-1">
                Preço Unit. ({market === 'US' ? 'USD' : 'BRL'})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Corretagem</label>
              <input
                type="number"
                step="0.01"
                value={brokerage}
                onChange={(e) => setBrokerage(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Taxas / Emol.</label>
              <input
                type="number"
                step="0.01"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Câmbio na Data (USD/BRL)</label>
              <input
                type="number"
                step="0.01"
                disabled={market === 'BR'}
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100 disabled:opacity-50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1">Observações</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Reinvestimento de dividendos"
                className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs"
            >
              {submitting ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Adicionar Operação'}
            </button>
          </div>
        </form>
      )}

      {/* PORTFOLIO MODE: Positions + Allocations + Transactions History */}
      {mode === 'PORTFOLIO' ? (
        <>
          <div className="terminal-glass rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-100">
                Posição Consolidada em Carteira
              </h2>
              <span className="font-mono text-xs text-slate-400">
                Proventos acumulados: {formatCurrency(analytics.totalDividendsBRL, 'BRL')}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-900/50">
                    <th className="py-3 px-4 text-left">Ativo</th>
                    <th className="py-3 px-3">Qtd.</th>
                    <th className="py-3 px-3">PM Original</th>
                    <th className="py-3 px-3">Cotação Atual</th>
                    <th className="py-3 px-3">Valor Atual (BRL)</th>
                    <th className="py-3 px-3">Rentab. Orig.</th>
                    <th className="py-3 px-3">Rentab. BRL</th>
                    <th className="py-3 px-4">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {analytics.positions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 font-sans">
                        Sua carteira ainda não possui operações. Clique em &quot;Registrar Movimentação&quot; para cadastrar seus primeiros ativos.
                      </td>
                    </tr>
                  ) : (
                    analytics.positions.map((pos) => (
                      <tr
                        key={pos.ticker}
                        onClick={() => onSelectAsset(pos.ticker)}
                        className="hover:bg-slate-800/40 cursor-pointer"
                      >
                        <td className="py-2.5 px-4 text-left font-sans">
                          <div className="flex items-center gap-2.5">
                            <AssetLogo ticker={pos.ticker} size={26} />
                            <div>
                              <div className="font-mono font-semibold text-slate-100">
                                {pos.ticker}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {pos.assetType} · {pos.sector}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-200">{formatNumber(pos.quantity, 2)}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {formatCurrency(pos.avgPriceOriginal, pos.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-100">
                          {formatCurrency(pos.currentPriceOriginal, pos.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-100 font-semibold">
                          {formatCurrency(pos.marketValueBRL, 'BRL')}
                        </td>
                        <td
                          className={`py-2.5 px-3 ${
                            pos.returnPctOriginal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {formatPercent(pos.returnPctOriginal)}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-semibold ${
                            pos.returnPctBRL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {formatPercent(pos.returnPctBRL)}
                        </td>
                        <td className="py-2.5 px-4 text-amber-300">{formatPercent(pos.weightPct, false)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Allocation Charts */}
          {analytics.positions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <AllocationCard title="Alocação por Classe" data={analytics.byClass} />
              <AllocationCard title="Alocação por Setor" data={analytics.bySector} />
              <AllocationCard title="Alocação por País" data={analytics.byCountry} />
              <AllocationCard title="Exposição Cambial" data={analytics.byCurrency} />
            </div>
          )}

          {/* Transactions Log */}
          <div className="terminal-glass rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800">
              <h2 className="font-display text-base font-semibold text-slate-100">
                Histórico de Movimentações & Eventos Corporativos
              </h2>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-900/50">
                    <th className="py-2.5 px-4">Data</th>
                    <th className="py-2.5 px-3">Ticker</th>
                    <th className="py-2.5 px-3">Operação</th>
                    <th className="py-2.5 px-3 text-right">Qtd / Fator</th>
                    <th className="py-2.5 px-3 text-right">Preço</th>
                    <th className="py-2.5 px-3 text-right">Taxas</th>
                    <th className="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                        Nenhuma operação registrada.
                      </td>
                    </tr>
                  ) : (
                    [...transactions]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/35">
                          <td className="py-2 px-4 text-slate-300">{tx.date}</td>
                          <td className="py-2 px-3 font-semibold text-slate-100">{tx.ticker}</td>
                          <td className="py-2 px-3 text-slate-300">{tx.operationType}</td>
                          <td className="py-2 px-3 text-right">
                            {tx.splitRatio ? `${tx.splitRatio}x` : formatNumber(tx.quantity, 2)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {formatCurrency(tx.unitPrice, tx.currency)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400">
                            {formatCurrency((tx.fees || 0) + (tx.brokerage || 0), tx.currency)}
                          </td>
                          <td className="py-2 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditForm(tx)}
                                aria-label="Editar operação"
                                className="text-slate-400 hover:text-emerald-400"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTransaction(tx.id)}
                                aria-label="Excluir operação"
                                className="text-slate-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* EVOLUTION MODE: Wealth History, Attribution, Financial Goal, Benchmarks */
        <div className="space-y-6">
          <div className="terminal-glass rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-100">
                  Evolução Patrimonial vs Total Investido
                </h2>
                <p className="text-xs text-slate-400">
                  Separação entre aportes líquidos, valorização de ativos, proventos e efeito cambial.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                {(['ALL', '12M', 'YTD'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodFilter(p)}
                    className={`px-3 py-1 rounded text-xs font-mono ${
                      periodFilter === p
                        ? 'bg-emerald-500 text-[#060913] font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {p === 'ALL' ? 'Tudo' : p}
                  </button>
                ))}
              </div>
            </div>

            {filteredEvolution.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">
                Adicione operações em Minha Carteira para gerar o gráfico histórico patrimonial.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredEvolution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                    <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: '#0B1120', border: '1px solid #1E293B', fontSize: '11px' }}
                      formatter={(v: unknown) => formatCurrency(Number(v), 'BRL')}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="marketValueBRL" name="Valor de Mercado" stroke="#10B981" fill="rgba(16,185,129,0.18)" strokeWidth={2} />
                    <Area type="monotone" dataKey="investedBRL" name="Aportes Acumulados" stroke="#38BDF8" fill="rgba(56,189,248,0.08)" strokeWidth={1.8} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Goal Progress */}
            <div className="terminal-glass-gold rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-slate-100">
                  Meta Financeira Patrimonial
                </h3>
                <span className="font-mono text-sm font-bold text-amber-300">
                  {goalPct.toFixed(1)}% atingido
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-400"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <div className="flex justify-between font-mono text-xs text-slate-300">
                <span>Atual: {formatCurrency(analytics.totalMarketValueBRL, 'BRL')}</span>
                <span>Meta: {formatCurrency(goalAmount, 'BRL')}</span>
              </div>
            </div>

            {/* Benchmarks Comparison */}
            <div className="terminal-glass rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-base font-semibold text-slate-100">
                Comparação com Índices de Referência
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Sua Carteira (c/ Div)', retorno: analytics.totalReturnWithDividendsPctBRL },
                      { name: 'TWR Carteira', retorno: analytics.twrPct },
                      { name: 'CDI (12m)', retorno: macro?.cdiAnnual ?? 11.15 },
                      { name: 'IPCA (12m)', retorno: macro?.ipca12m ?? 4.5 },
                      { name: 'IBOV (Dia)', retorno: macro?.ibovespa.changePercent ?? 0 },
                      { name: 'S&P 500 (Dia)', retorno: macro?.sp500.changePercent ?? 0 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                    <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} unit="%" />
                    <Tooltip
                      contentStyle={{ background: '#0B1120', border: '1px solid #1E293B', fontSize: '11px' }}
                    />
                    <Bar dataKey="retorno" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-500">
                Metodologia: TWR isola distorções de aportes/retiradas; XIRR pondera fluxos de caixa reais nas datas de liquidação em BRL.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KpiCard: React.FC<{
  label: string;
  value: string;
  accent?: 'emerald' | 'gold' | 'crimson';
}> = ({ label, value, accent }) => (
  <div className="terminal-glass rounded-xl p-4">
    <div className="text-[11px] text-slate-400">{label}</div>
    <div
      className={`font-mono text-base lg:text-lg font-bold mt-1 ${
        accent === 'emerald'
          ? 'text-emerald-400'
          : accent === 'gold'
            ? 'text-amber-300'
            : accent === 'crimson'
              ? 'text-rose-400'
              : 'text-slate-100'
      }`}
    >
      {value}
    </div>
  </div>
);

const AllocationCard: React.FC<{
  title: string;
  data: { name: string; valueBRL: number; weightPct: number }[];
}> = ({ title, data }) => (
  <div className="terminal-glass rounded-xl p-4 space-y-2">
    <h3 className="font-display text-xs font-semibold text-slate-200">{title}</h3>
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="valueBRL" nameKey="name" innerRadius={32} outerRadius={54} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#0B1120', border: '1px solid #1E293B', fontSize: '11px' }}
            formatter={(v: unknown) => formatCurrency(Number(v), 'BRL')}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
    <div className="space-y-1 text-[11px]">
      {data.slice(0, 4).map((d, i) => (
        <div key={d.name} className="flex items-center justify-between">
          <span className="text-slate-300 truncate max-w-[130px]" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
            {d.name}
          </span>
          <span className="font-mono text-slate-200">{d.weightPct.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  </div>
);
