import React, { useEffect, useState } from 'react';
import {
  Check,
  CreditCard,
  Download,
  LogIn,
  Save,
  Settings,
  Shield,
  Sliders,
  Trash2,
} from 'lucide-react';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { Market, ProviderHealthStatus, UserPlan } from '../shared/types.ts';
import { formatCurrency, formatDateTimeBr } from '../utils/formatters.ts';

interface SubscriptionSettingsAdminViewProps {
  mode: 'SUBSCRIPTION' | 'SETTINGS' | 'ADMIN';
  onUniverseRefresh: () => void;
}

interface AdminOverviewData {
  providers: ProviderHealthStatus[];
  logs: Array<{
    timestamp: string;
    provider: string;
    endpoint: string;
    ok: boolean;
    latencyMs: number;
    message: string;
  }>;
  config: {
    bazinRate: number;
    targetPE: number;
    minMarginOfSafety: number;
    dcfWacc: number;
    dcfPerpetualGrowth: number;
    proMonthlyPriceBRL: number;
    premiumMonthlyPriceBRL: number;
    updatedBy: string;
    updatedAt: string;
  };
  searchRanking: Array<{ ticker: string; count: number }>;
}

export const SubscriptionSettingsAdminView: React.FC<
  SubscriptionSettingsAdminViewProps
> = ({ mode, onUniverseRefresh }) => {
  const {
    user,
    profile,
    isAdmin,
    effectivePlan,
    signInWithGoogle,
    apiFetch,
    updateProfileSettings,
    setEntitlementToken,
    exportAllUserData,
    deleteAllUserData,
  } = useAuth();

  // Subscription state
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [publicPrices, setPublicPrices] = useState({
    proMonthlyPriceBRL: 79.9,
    premiumMonthlyPriceBRL: 149.9,
  });
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  // Settings state
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [preferredMarket, setPreferredMarket] = useState<'ALL' | Market>(
    profile?.preferredMarket || 'ALL'
  );
  const [preferredCurrency, setPreferredCurrency] = useState<'BRL' | 'USD'>(
    profile?.preferredCurrency || 'BRL'
  );
  const [financialGoal, setFinancialGoal] = useState(
    String(profile?.financialGoal ?? 500000)
  );
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Admin state
  const [adminData, setAdminData] = useState<AdminOverviewData | null>(null);
  const [bazinRatePct, setBazinRatePct] = useState('8.5');
  const [targetPE, setTargetPE] = useState('15');
  const [minMoS, setMinMoS] = useState('10');
  const [dcfWaccPct, setDcfWaccPct] = useState('11');
  const [dcfPerpPct, setDcfPerpPct] = useState('3');
  const [proPrice, setProPrice] = useState('79.9');
  const [premiumPrice, setPremiumPrice] = useState('149.9');
  const [adminStatusMsg, setAdminStatusMsg] = useState<string | null>(null);
  const [grantUid, setGrantUid] = useState('');
  const [grantPlan, setGrantPlan] = useState<UserPlan>('PREMIUM');
  const [paramHistory, setParamHistory] = useState<
    Array<{ id: string; changedBy: string; summary: string; createdAt?: unknown }>
  >([]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setPreferredMarket(profile.preferredMarket);
      setPreferredCurrency(profile.preferredCurrency);
      setFinancialGoal(String(profile.financialGoal));
    }
  }, [profile]);

  useEffect(() => {
    fetch('/api/config/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (c) {
          setPublicPrices({
            proMonthlyPriceBRL: c.proMonthlyPriceBRL,
            premiumMonthlyPriceBRL: c.premiumMonthlyPriceBRL,
          });
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (mode !== 'ADMIN' || !isAdmin) return;
    apiFetch<AdminOverviewData>('/api/admin/overview')
      .then((d) => {
        setAdminData(d);
        setBazinRatePct(String((d.config.bazinRate * 100).toFixed(1)));
        setTargetPE(String(d.config.targetPE));
        setMinMoS(String(d.config.minMarginOfSafety));
        setDcfWaccPct(String((d.config.dcfWacc * 100).toFixed(1)));
        setDcfPerpPct(String((d.config.dcfPerpetualGrowth * 100).toFixed(1)));
        setProPrice(String(d.config.proMonthlyPriceBRL));
        setPremiumPrice(String(d.config.premiumMonthlyPriceBRL));
      })
      .catch(() => undefined);

    getDocs(query(collection(db, 'parameter_history'), orderBy('createdAt', 'desc')))
      .then((snap) =>
        setParamHistory(snap.docs.map((d) => d.data() as { id: string; changedBy: string; summary: string }))
      )
      .catch(() => undefined);
  }, [mode, isAdmin, apiFetch]);

  const handleCheckout = async (
    plan: 'PRO' | 'PREMIUM',
    provider: 'STRIPE' | 'MERCADO_PAGO'
  ) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setCheckoutBusy(true);
    setCheckoutMessage(null);
    try {
      const res = await apiFetch<{
        configured: boolean;
        checkoutUrl?: string;
        message: string;
      }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan, provider, billingCycle }),
      });
      if (res.configured && res.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
      } else {
        setCheckoutMessage(res.message);
      }
    } catch (err) {
      setCheckoutMessage(err instanceof Error ? err.message : 'Erro no checkout');
    } finally {
      setCheckoutBusy(false);
    }
  };

  if (mode === 'SUBSCRIPTION') {
    const mult = billingCycle === 'ANNUAL' ? 10 : 1;
    const plans: Array<{
      id: UserPlan;
      audience: string;
      priceBRL: number;
      features: string[];
      featured?: boolean;
    }> = [
      {
        id: 'FREE',
        audience: 'Para investidores iniciantes',
        priceBRL: 0,
        features: [
          'Pesquisa básica de ativos Brasil e EUA',
          'Cotações e indicadores macroeconômicos',
          'Ficha resumida (2 anos de histórico)',
          '2 métodos iniciais de valuation',
          'Comparador com até 2 ativos e lista de favoritos',
        ],
      },
      {
        id: 'PRO',
        audience: 'Para análise fundamentalista ativa',
        priceBRL: publicPrices.proMonthlyPriceBRL * mult,
        featured: true,
        features: [
          'Radar Sonar interativo completo',
          'Selo Consenso 3X e Valuation 5 Métodos',
          'Indicadores fundamentalistas completos (28+ métricas)',
          'Minha Carteira com preço médio, câmbio e eventos corporativos',
          'Radar de Dividendos, Histórico Financeiro e Alertas',
        ],
      },
      {
        id: 'PREMIUM',
        audience: 'Para inteligência institucional',
        priceBRL: publicPrices.premiumMonthlyPriceBRL * mult,
        features: [
          'Todos os recursos do Plano PRO incluídos',
          'Selos exclusivos Consenso 4X e Consenso 5X',
          'Comparador avançado de até 5 empresas simultâneas',
          'Análise técnica completa (Candles, RSI, MACD, Bollinger, Fibonacci)',
          'Dashboard patrimonial TWR/XIRR, simulador DCF e relatórios CSV',
        ],
      },
    ];

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-50 flex items-center gap-2.5">
              <CreditCard className="w-6 h-6 text-amber-400" />
              <span>Planos & Assinatura</span>
            </h1>
            <p className="text-sm text-slate-400">
              Plano atual autenticado no servidor: <strong className="font-mono text-emerald-400">{effectivePlan}</strong>
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                billingCycle === 'MONTHLY'
                  ? 'bg-emerald-500 text-[#060913] font-semibold'
                  : 'text-slate-400'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('ANNUAL')}
              className={`px-3 py-1.5 rounded text-xs font-medium ${
                billingCycle === 'ANNUAL'
                  ? 'bg-emerald-500 text-[#060913] font-semibold'
                  : 'text-slate-400'
              }`}
            >
              Anual (2 meses grátis)
            </button>
          </div>
        </div>

        {checkoutMessage && (
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200">
            {checkoutMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {plans.map((p) => {
            const isCurrent = effectivePlan === p.id;
            return (
              <div
                key={p.id}
                className={`rounded-2xl p-6 flex flex-col justify-between space-y-5 ${
                  p.id === 'PREMIUM'
                    ? 'terminal-glass-gold'
                    : p.featured
                      ? 'terminal-glass-emerald'
                      : 'terminal-glass'
                }`}
              >
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-400">{p.audience}</div>
                    <h2 className="font-display text-xl font-bold text-slate-50 mt-0.5">
                      Plano {p.id}
                    </h2>
                  </div>
                  <div className="font-mono">
                    <span className="text-3xl font-bold text-slate-50">
                      {p.priceBRL === 0 ? 'Gratuito' : formatCurrency(p.priceBRL, 'BRL')}
                    </span>
                    {p.priceBRL > 0 && (
                      <span className="text-xs text-slate-400">
                        /{billingCycle === 'ANNUAL' ? 'ano' : 'mês'}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 text-xs text-slate-300 pt-3 border-t border-slate-800/80">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {p.id === 'FREE' ? (
                  <div className="text-xs font-mono text-slate-400 py-2 text-center border border-slate-800 rounded-lg">
                    {isCurrent ? 'Plano Ativo' : 'Plano Base'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={checkoutBusy || isCurrent}
                      onClick={() => handleCheckout(p.id as 'PRO' | 'PREMIUM', 'MERCADO_PAGO')}
                      className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#060913] font-semibold text-xs transition-colors"
                    >
                      {isCurrent ? 'Plano Ativo' : `Assinar ${p.id} via Mercado Pago`}
                    </button>
                    <button
                      type="button"
                      disabled={checkoutBusy || isCurrent}
                      onClick={() => handleCheckout(p.id as 'PRO' | 'PREMIUM', 'STRIPE')}
                      className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-50 text-slate-200 font-medium text-xs transition-colors"
                    >
                      Pagar com Stripe (Cartão / USD)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === 'SETTINGS') {
    if (!user) {
      return (
        <div className="terminal-glass rounded-2xl p-10 text-center max-w-xl mx-auto space-y-4">
          <Settings className="w-10 h-10 text-emerald-400 mx-auto" />
          <h1 className="font-display text-xl font-bold text-slate-50">Configurações da Conta</h1>
          <p className="text-sm text-slate-400">
            Faça login para gerenciar suas preferências de mercado, metas financeiras e direitos LGPD.
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

    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            Configurações & Privacidade (LGPD)
          </h1>
          <p className="text-sm text-slate-400">
            Preferências do terminal, meta patrimonial e portabilidade/exclusão integral dos seus dados.
          </p>
        </div>

        <div className="terminal-glass rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Nome de Exibição</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Mercado Preferencial</label>
              <select
                value={preferredMarket}
                onChange={(e) => setPreferredMarket(e.target.value as 'ALL' | Market)}
                className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
              >
                <option value="ALL">Brasil & EUA</option>
                <option value="BR">Brasil (B3)</option>
                <option value="US">Estados Unidos</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Moeda Base</label>
              <select
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value as 'BRL' | 'USD')}
                className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
              >
                <option value="BRL">Real Brasileiro (BRL)</option>
                <option value="USD">Dólar Americano (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Meta Financeira (BRL)</label>
              <input
                type="number"
                value={financialGoal}
                onChange={(e) => setFinancialGoal(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            {settingsSaved ? (
              <span className="text-xs text-emerald-400">Preferências salvas no Firestore.</span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={async () => {
                await updateProfileSettings({
                  displayName,
                  preferredMarket,
                  preferredCurrency,
                  financialGoal: Number(financialGoal) || 500000,
                });
                setSettingsSaved(true);
                setTimeout(() => setSettingsSaved(false), 3000);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>

        {/* LGPD Controls */}
        <div className="terminal-glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="font-display text-base font-semibold text-slate-100">
              Privacidade & Direitos LGPD
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Conforme a Lei Geral de Proteção de Dados, você pode baixar uma cópia integral de seus registros ou apagar permanentemente sua carteira, alertas, favoritos e perfil.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const json = exportAllUserData();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `radar-valuation-dados-${user.uid}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-100"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Meus Dados (JSON)</span>
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/15 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Todos os Meus Dados</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={deleteAllUserData}
                  className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold text-xs"
                >
                  Confirmar Exclusão Permanente
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-xs text-slate-300"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ADMIN MODE
  if (!isAdmin) {
    return (
      <div className="terminal-glass rounded-2xl p-8 text-center text-sm text-rose-300">
        Acesso restrito ao administrador autorizado da plataforma.
      </div>
    );
  }

  const handleSaveAdminConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminStatusMsg(null);
    const payload = {
      bazinRate: Number(bazinRatePct) / 100,
      targetPE: Number(targetPE),
      minMarginOfSafety: Number(minMoS),
      dcfWacc: Number(dcfWaccPct) / 100,
      dcfPerpetualGrowth: Number(dcfPerpPct) / 100,
      proMonthlyPriceBRL: Number(proPrice),
      premiumMonthlyPriceBRL: Number(premiumPrice),
    };
    try {
      await apiFetch('/api/admin/config', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await setDoc(doc(db, 'config', 'platform'), {
        ...payload,
        updatedBy: user?.email || 'admin',
        updatedAt: serverTimestamp(),
      });

      const histId = `hist_${Date.now()}`;
      await setDoc(doc(db, 'parameter_history', histId), {
        id: histId,
        changedBy: user?.email || 'admin',
        summary: `Bazin ${bazinRatePct}%, P/L ${targetPE}x, MoS ${minMoS}%, PRO R$${proPrice}, PREMIUM R$${premiumPrice}`,
        bazinRate: payload.bazinRate,
        targetPE: payload.targetPE,
        minMarginOfSafety: payload.minMarginOfSafety,
        createdAt: serverTimestamp(),
      });

      setAdminStatusMsg('Parâmetros globais salvos e registrados no histórico de auditoria.');
      onUniverseRefresh();
    } catch (err) {
      setAdminStatusMsg(err instanceof Error ? err.message : 'Erro ao salvar parâmetros.');
    }
  };

  const handleGrantPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUid.trim()) return;
    try {
      const res = await apiFetch<{ entitlementToken: string }>('/api/admin/grant-entitlement', {
        method: 'POST',
        body: JSON.stringify({ uid: grantUid.trim(), plan: grantPlan }),
      });
      if (grantUid.trim() === user?.uid) {
        setEntitlementToken(res.entitlementToken);
      }
      await updateDoc(doc(db, 'users', grantUid.trim()), {
        plan: grantPlan,
        updatedAt: serverTimestamp(),
      }).catch(() => undefined);
      setAdminStatusMsg(`Plano ${grantPlan} concedido para UID ${grantUid.trim()}.`);
    } catch (err) {
      setAdminStatusMsg(err instanceof Error ? err.message : 'Erro ao conceder plano.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-50 flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-amber-400" />
          <span>Painel Administrativo & Operações</span>
        </h1>
        <p className="text-sm text-slate-400">
          Configuração dinâmica de parâmetros de valuation, preços de planos, monitoramento de provedores financeiros e logs.
        </p>
      </div>

      {adminStatusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-xs text-emerald-200">
          {adminStatusMsg}
        </div>
      )}

      {/* Global Valuation & Pricing Parameters */}
      <form onSubmit={handleSaveAdminConfig} className="terminal-glass rounded-2xl p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-slate-100">
          Parâmetros Globais de Valuation & Planos Comerciais
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Taxa Bazin (%)</label>
            <input type="number" step="0.5" value={bazinRatePct} onChange={(e) => setBazinRatePct(e.target.value)} className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">P/L Ref.</label>
            <input type="number" step="0.5" value={targetPE} onChange={(e) => setTargetPE(e.target.value)} className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">MoS Mín (%)</label>
            <input type="number" step="1" value={minMoS} onChange={(e) => setMinMoS(e.target.value)} className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">WACC (%)</label>
            <input type="number" step="0.5" value={dcfWaccPct} onChange={(e) => setDcfWaccPct(e.target.value)} className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Perp. g (%)</label>
            <input type="number" step="0.25" value={dcfPerpPct} onChange={(e) => setDcfPerpPct(e.target.value)} className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Preço PRO (R$)</label>
            <input type="number" step="0.1" value={proPrice} onChange={(e) => setProPrice(e.target.value)} className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Preço PREMIUM (R$)</label>
            <input type="number" step="0.1" value={premiumPrice} onChange={(e) => setPremiumPrice(e.target.value)} className="w-full h-9 px-2.5 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100" />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#060913] font-semibold text-xs"
          >
            Salvar & Aplicar Parâmetros
          </button>
        </div>
      </form>

      {/* Grant Subscriber Entitlement */}
      <form onSubmit={handleGrantPlan} className="terminal-glass rounded-2xl p-5 flex flex-wrap items-end gap-3 text-xs">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-slate-400 mb-1">UID do Assinante (Admin Override)</label>
          <input
            type="text"
            value={grantUid}
            onChange={(e) => setGrantUid(e.target.value)}
            placeholder={user?.uid || 'UID do usuário'}
            className="w-full h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 font-mono text-slate-100"
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1">Plano</label>
          <select
            value={grantPlan}
            onChange={(e) => setGrantPlan(e.target.value as UserPlan)}
            className="h-9 px-3 rounded-lg bg-[#070B17] border border-slate-800 text-slate-100"
          >
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
            <option value="PREMIUM">PREMIUM</option>
          </select>
        </div>
        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold"
        >
          Atualizar Plano
        </button>
      </form>

      {/* Providers Health Monitor */}
      {adminData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="terminal-glass rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800">
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Provedores de Dados Financeiros
              </h2>
            </div>
            <div className="divide-y divide-slate-800/70 text-xs">
              {adminData.providers.map((p) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100">{p.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{p.note}</div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <div
                      className={
                        p.status === 'ONLINE'
                          ? 'text-emerald-400'
                          : p.status === 'STANDBY'
                            ? 'text-slate-400'
                            : 'text-rose-400'
                      }
                    >
                      {p.status}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {p.requestsToday} req · {p.avgLatencyMs ?? '—'} ms
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="terminal-glass rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800">
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Logs Recentes de Integração & Alterações
              </h2>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 text-[11px] font-mono">
              {adminData.logs.slice(0, 20).map((log, i) => (
                <div key={i} className="px-4 py-2 flex items-center justify-between gap-2">
                  <span className={log.ok ? 'text-emerald-400' : 'text-rose-400'}>
                    [{log.provider}] {log.endpoint}
                  </span>
                  <span className="text-slate-400 truncate">
                    {log.latencyMs}ms · {log.message}
                  </span>
                  <span className="text-slate-500 shrink-0">
                    {formatDateTimeBr(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
            {paramHistory.length > 0 && (
              <div className="p-4 border-t border-slate-800 space-y-1 text-xs">
                <div className="font-semibold text-slate-300">Histórico de Parâmetros</div>
                {paramHistory.slice(0, 5).map((h) => (
                  <div key={h.id} className="text-[11px] text-slate-400">
                    • {h.changedBy}: {h.summary}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
