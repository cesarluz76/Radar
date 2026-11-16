import React, { useEffect, useState } from 'react';
import { Bell, Download, FileText, LogIn, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { ScreenerEntry } from '../server/valuationEngine.ts';
import type { AssetSummary, Market } from '../shared/types.ts';
import { formatCurrency, formatPercent } from '../utils/formatters.ts';
import { AssetLogo, ConsensusSeal } from '../components/BrandMark.tsx';

interface AlertsFavoritesReportsViewProps {
  mode: 'ALERTS' | 'FAVORITES' | 'REPORTS';
  universe: ScreenerEntry[];
  onSelectAsset: (ticker: string) => void;
}

export const AlertsFavoritesReportsView: React.FC<AlertsFavoritesReportsViewProps> = ({
  mode,
  universe,
  onSelectAsset,
}) => {
  const {
    user,
    signInWithGoogle,
    alerts,
    addAlert,
    toggleAlertActive,
    deleteAlert,
    watchlist,
    toggleWatchlist,
    transactions,
    apiFetch,
  } = useAuth();

  const [ticker, setTicker] = useState('BBSE3');
  const [market, setMarket] = useState<Market>('BR');
  const [alertType, setAlertType] = useState<
    | 'PRICE_BELOW'
    | 'PRICE_ABOVE'
    | 'CONSENSUS_3X'
    | 'CONSENSUS_4X'
    | 'CONSENSUS_5X'
    | 'DIVIDEND_YIELD'
    | 'FUNDAMENTAL_CHANGE'
    | 'EARNINGS'
  >('PRICE_BELOW');
  const [targetValue, setTargetValue] = useState('35.00');
  const [frequency, setFrequency] = useState<'REALTIME' | 'HOURLY' | 'DAILY'>('REALTIME');
  const [channels, setChannels] = useState<string[]>(['PUSH']);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [favSummaries, setFavSummaries] = useState<AssetSummary[]>([]);

  useEffect(() => {
    if (mode !== 'FAVORITES' || watchlist.length === 0) {
      setFavSummaries([]);
      return;
    }
    Promise.all(
      watchlist.map((w) =>
        fetch(`/api/assets/${encodeURIComponent(w.ticker)}/summary`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((items) => setFavSummaries(items.filter(Boolean)));
  }, [mode, watchlist]);

  if (!user && mode !== 'REPORTS') {
    return (
      <div className="terminal-glass rounded-2xl p-10 text-center max-w-xl mx-auto space-y-4">
        {mode === 'ALERTS' ? (
          <Bell className="w-10 h-10 text-emerald-400 mx-auto" />
        ) : (
          <Star className="w-10 h-10 text-amber-400 mx-auto" />
        )}
        <h1 className="font-display text-xl font-bold text-slate-50">
          {mode === 'ALERTS' ? 'Meus Alertas Inteligentes' : 'Meus Ativos Favoritos'}
        </h1>
        <p className="text-sm text-slate-400">
          Autentique-se para gerenciar sua lista de alertas personalizados e favoritos sincronizados em tempo real.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-[#060913] font-semibold text-xs"
        >
          <LogIn className="w-4 h-4" />
          <span>Entrar com Google</span>
        </button>
      </div>
    );
  }

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch)
        ? prev.length > 1
          ? prev.filter((c) => c !== ch)
          : prev
        : [...prev, ch]
    );
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAlert({
      ticker: ticker.trim().toUpperCase(),
      market,
      alertType,
      targetValue: Number(targetValue) || 0,
      channels,
      frequency,
      active: true,
    });
  };

  const handleEvaluateAlerts = async () => {
    if (!user) return;
    setCheckingAlerts(true);
    setCheckMsg(null);
    try {
      const res = await apiFetch<{
        triggered: Array<{ alertId: string; ticker: string; title: string; message: string }>;
        checkedAt: string;
      }>('/api/alerts/evaluate', {
        method: 'POST',
        body: JSON.stringify({ alerts }),
      });
      for (const hit of res.triggered) {
        const id = `ntf_${hit.alertId}_${new Date().toISOString().slice(0, 10)}`;
        await addDoc(collection(db, 'users', user.uid, 'notifications'), {
          id,
          userId: user.uid,
          alertId: hit.alertId,
          ticker: hit.ticker,
          title: hit.title,
          message: hit.message,
          read: false,
          createdAt: serverTimestamp(),
        }).catch(() => undefined);
      }
      setCheckMsg(
        res.triggered.length > 0
          ? `${res.triggered.length} alerta(s) disparado(s) e enviado(s) ao sininho de notificações.`
          : 'Verificação concluída: nenhum alerta atingiu a condição no momento.'
      );
    } catch (err) {
      setCheckMsg(err instanceof Error ? err.message : 'Erro ao verificar alertas.');
    } finally {
      setCheckingAlerts(false);
    }
  };

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (mode === 'ALERTS') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-50 flex items-center gap-2.5">
              <Bell className="w-6 h-6 text-emerald-400" />
              <span>Meus Alertas de Preço & Valuation</span>
            </h1>
            <p className="text-sm text-slate-400">
              Receba avisos quando ativos atingirem preço-alvo, entrarem em Consenso 3X/4X/5X ou alterarem Dividend Yield.
            </p>
          </div>
          <button
            type="button"
            disabled={checkingAlerts}
            onClick={handleEvaluateAlerts}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingAlerts ? 'animate-spin' : ''}`} />
            <span>Verificar Alertas Agora</span>
          </button>
        </div>

        {checkMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200">
            {checkMsg}
          </div>
        )}

        <form onSubmit={handleCreateAlert} className="terminal-glass rounded-2xl p-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Configurar Novo Alerta
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Ticker</label>
              <input
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Mercado</label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as Market)}
                className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
              >
                <option value="BR">Brasil (B3)</option>
                <option value="US">EUA</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Condição do Alerta</label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as typeof alertType)}
                className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
              >
                <option value="PRICE_BELOW">Preço menor ou igual (&lt;=)</option>
                <option value="PRICE_ABOVE">Preço maior ou igual (&gt;=)</option>
                <option value="CONSENSUS_3X">Entrar em Consenso 3X</option>
                <option value="CONSENSUS_4X">Entrar em Consenso 4X</option>
                <option value="CONSENSUS_5X">Entrar em Consenso 5X</option>
                <option value="DIVIDEND_YIELD">Dividend Yield mínimo (%)</option>
                <option value="FUNDAMENTAL_CHANGE">Mudança de Fundamentos</option>
                <option value="EARNINGS">Divulgação de Resultados</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Valor Alvo / %</label>
              <input
                type="number"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Frequência</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
              >
                <option value="REALTIME">Tempo Real</option>
                <option value="HOURLY">A cada 1 hora</option>
                <option value="DAILY">Diário</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Canais:</span>
              {['PUSH', 'EMAIL', 'WHATSAPP'].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  className={`px-2.5 py-1 rounded border font-mono text-[11px] ${
                    channels.includes(ch)
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Alerta</span>
            </button>
          </div>
        </form>

        <div className="terminal-glass rounded-2xl overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-900/50">
                <th className="py-3 px-4">Ativo</th>
                <th className="py-3 px-3">Regra</th>
                <th className="py-3 px-3 text-right">Alvo</th>
                <th className="py-3 px-3">Canais / Freq.</th>
                <th className="py-3 px-3 text-right">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum alerta cadastrado. Crie seu primeiro monitoramento acima.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/35">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-100">
                      <button type="button" onClick={() => onSelectAsset(a.ticker)} className="hover:text-emerald-400">
                        {a.ticker}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{a.alertType}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                      {a.targetValue.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {a.channels.join(', ')} · {a.frequency}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleAlertActive(a.id, !a.active)}
                        className={`font-mono text-xs ${
                          a.active ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {a.active ? 'Ativo' : 'Pausado'}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteAlert(a.id)}
                        aria-label="Excluir alerta"
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === 'FAVORITES') {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50 flex items-center gap-2.5">
            <Star className="w-6 h-6 text-amber-400" />
            <span>Meus Ativos Favoritos</span>
          </h1>
          <p className="text-sm text-slate-400">
            Lista de observação sincronizada com cotações em tempo real.
          </p>
        </div>

        {watchlist.length === 0 ? (
          <div className="terminal-glass rounded-2xl p-8 text-center text-xs text-slate-400">
            Nenhum ativo favoritado ainda. Abra qualquer empresa e clique em &quot;Favoritar&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((w) => {
              const s = favSummaries.find((x) => x.ticker === w.ticker);
              return (
                <div
                  key={w.id}
                  className="terminal-glass rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onSelectAsset(w.ticker)}
                    className="flex items-center gap-3 min-w-0 text-left flex-1"
                  >
                    <AssetLogo ticker={w.ticker} name={s?.name} size={36} />
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-sm text-slate-100">
                        {w.ticker}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {s?.name || w.market}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-3 shrink-0">
                    {s && (
                      <div className="text-right font-mono text-xs">
                        <div className="text-slate-100">{formatCurrency(s.price, s.currency)}</div>
                        <div className={s.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {formatPercent(s.changePercent)}
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleWatchlist(w.ticker, w.market)}
                      aria-label="Remover dos favoritos"
                      className="text-amber-400 hover:text-rose-400"
                    >
                      <Star className="w-4 h-4 fill-amber-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // REPORTS MODE
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-50 flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-emerald-400" />
          <span>Central de Relatórios Financeiros</span>
        </h1>
        <p className="text-sm text-slate-400">
          Exporte relatórios estruturados em CSV do universo de valuation, Consenso 3X/4X/5X e histórico da sua carteira.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="terminal-glass rounded-xl p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Relatório Completo de Valuation
          </h2>
          <p className="text-xs text-slate-400">
            Exporta todos os ativos monitorados no Brasil e EUA com P/L, P/VP, ROE, DY, Valor Justo Médio, Desconto e Selo Consenso.
          </p>
          <button
            type="button"
            onClick={() =>
              downloadCsv('radar-valuation-completo.csv', [
                ['Ticker', 'Nome', 'Mercado', 'Setor', 'Preco', 'Moeda', 'P/L', 'P/VP', 'ROE %', 'DY %', 'Valor Justo', 'Desconto %', 'Consenso', 'Qualidade'],
                ...universe.map((u) => [
                  u.asset.ticker,
                  u.asset.name,
                  u.asset.market,
                  u.asset.sector,
                  String(u.asset.price),
                  u.asset.currency,
                  String(u.pe ?? ''),
                  String(u.pb ?? ''),
                  String(u.roe ?? ''),
                  String(u.dividendYield ?? ''),
                  String(u.averageFairValue ?? ''),
                  String(u.discountPercent ?? ''),
                  u.consensusLabel,
                  String(u.overallQuality),
                ]),
              ])
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar CSV Valuation ({universe.length})</span>
          </button>
        </div>

        <div className="terminal-glass rounded-xl p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Relatório Consenso 3X / 4X / 5X
          </h2>
          <p className="text-xs text-slate-400">
            Lista filtrada exclusivamente pelos ativos com convergência matemática de 3 ou mais metodologias independentes.
          </p>
          <button
            type="button"
            onClick={() => {
              const cons = universe.filter((u) => u.consensusCount >= 3);
              downloadCsv('radar-consenso-oportunidades.csv', [
                ['Ticker', 'Setor', 'Preco', 'Valor Justo', 'Desconto %', 'Consenso', 'Metodos Aprovados'],
                ...cons.map((u) => [
                  u.asset.ticker,
                  u.asset.sector,
                  String(u.asset.price),
                  String(u.averageFairValue ?? ''),
                  String(u.discountPercent ?? ''),
                  u.consensusLabel,
                  u.approvedMethods.join(' | '),
                ]),
              ]);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#060913] font-semibold text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar CSV Consenso</span>
          </button>
        </div>

        <div className="terminal-glass rounded-xl p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Extrato da Minha Carteira
          </h2>
          <p className="text-xs text-slate-400">
            Exporta todas as operações, taxas, eventos corporativos e câmbio registrados na sua carteira privada.
          </p>
          <button
            type="button"
            disabled={transactions.length === 0}
            onClick={() =>
              downloadCsv('minha-carteira-operacoes.csv', [
                ['Data', 'Ticker', 'Mercado', 'Classe', 'Operacao', 'Quantidade', 'Preco', 'Moeda', 'Taxas', 'FX'],
                ...transactions.map((t) => [
                  t.date,
                  t.ticker,
                  t.market,
                  t.assetType,
                  t.operationType,
                  String(t.quantity),
                  String(t.unitPrice),
                  t.currency,
                  String((t.fees || 0) + (t.brokerage || 0)),
                  String(t.fxRate),
                ]),
              ])
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 font-semibold text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar CSV Operações ({transactions.length})</span>
          </button>
        </div>
      </div>

      {/* Preview Table of Top Consenso Opportunities */}
      <div className="terminal-glass rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800">
          <h3 className="font-display text-sm font-semibold text-slate-100">
            Pré-visualização — Oportunidades Consenso
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                <th className="py-2.5 px-4">Ticker</th>
                <th className="py-2.5 px-3">Métodos Aprovados</th>
                <th className="py-2.5 px-3 text-right">Desconto</th>
                <th className="py-2.5 px-4 text-right">Selo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {universe
                .filter((u) => u.consensusCount >= 3)
                .slice(0, 12)
                .map((u) => (
                  <tr
                    key={u.asset.ticker}
                    onClick={() => onSelectAsset(u.asset.ticker)}
                    className="hover:bg-slate-800/40 cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-100">
                      {u.asset.ticker}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {u.approvedMethods.join(' · ')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                      {formatPercent(u.discountPercent)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <ConsensusSeal level={u.consensusLabel} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
