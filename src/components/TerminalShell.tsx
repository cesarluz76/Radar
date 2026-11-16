import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Coins,
  CreditCard,
  FileText,
  GitCompare,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Radar,
  Search,
  Settings,
  Shield,
  Sliders,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { AssetSummary, MacroOverview } from '../shared/types.ts';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters.ts';
import { AssetLogo, BrandLogo } from './BrandMark.tsx';

export type NavSectionId =
  | 'dashboard'
  | 'market-br'
  | 'market-us'
  | 'radar-sonar'
  | 'consensus-3x'
  | 'consensus-4x'
  | 'consensus-5x'
  | 'dividends'
  | 'portfolio'
  | 'evolution'
  | 'comparator'
  | 'technical'
  | 'alerts'
  | 'favorites'
  | 'reports'
  | 'subscription'
  | 'settings'
  | 'admin'
  | 'asset-detail';

interface TerminalShellProps {
  activeSection: NavSectionId;
  onNavigate: (section: NavSectionId) => void;
  onSelectAsset: (ticker: string) => void;
  macro: MacroOverview | null;
  children: React.ReactNode;
}

const MENU_ITEMS: Array<{
  id: NavSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'market-br', label: 'Mercado Brasil', icon: TrendingUp },
  { id: 'market-us', label: 'Mercado EUA', icon: Globe },
  { id: 'radar-sonar', label: 'Radar Sonar', icon: Radar },
  { id: 'consensus-3x', label: 'Consenso 3X', icon: Award },
  { id: 'consensus-4x', label: 'Consenso 4X', icon: Award },
  { id: 'consensus-5x', label: 'Consenso 5X', icon: Award },
  { id: 'dividends', label: 'Radar de Dividendos', icon: Coins },
  { id: 'portfolio', label: 'Minha Carteira', icon: Briefcase },
  { id: 'evolution', label: 'Evolução Patrimonial', icon: BarChart3 },
  { id: 'comparator', label: 'Comparador', icon: GitCompare },
  { id: 'technical', label: 'Análise Técnica', icon: Activity },
  { id: 'alerts', label: 'Meus Alertas', icon: Bell },
  { id: 'favorites', label: 'Favoritos', icon: Star },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'subscription', label: 'Minha Assinatura', icon: CreditCard },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export const TerminalShell: React.FC<TerminalShellProps> = ({
  activeSection,
  onNavigate,
  onSelectAsset,
  macro,
  children,
}) => {
  const {
    user,
    profile,
    isAdmin,
    effectivePlan,
    notifications,
    markNotificationRead,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/assets/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = (await res.json()) as { items?: AssetSummary[] };
          setSearchResults(data.items ?? []);
          setSearchOpen(true);
        }
      } catch {
        // ignore network blip
      } finally {
        setSearching(false);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePickAsset = (ticker: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    onSelectAsset(ticker);
  };

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Falha ao autenticar');
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-slate-800/80 bg-[#080C1A] sticky top-0 h-screen">
        <div className="h-16 px-4 flex items-center border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
          >
            <BrandLogo />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Menu principal">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const isGoldItem = item.id === 'consensus-5x' || item.id === 'subscription';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? isGoldItem
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 mt-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'admin'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span className="truncate">Administração</span>
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
          <span>Plano atual</span>
          <span
            className={`font-mono font-semibold ${
              effectivePlan === 'PREMIUM'
                ? 'text-amber-400'
                : effectivePlan === 'PRO'
                  ? 'text-emerald-400'
                  : 'text-slate-300'
            }`}
          >
            {effectivePlan}
          </span>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-[#080C1A] border-r border-slate-800 h-full flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800">
              <BrandLogo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fechar menu"
                className="p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-300 hover:bg-slate-800/60"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Administração</span>
                </button>
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar (Clean 3-Zone Contract) */}
        <header className="h-16 sticky top-0 z-30 border-b border-slate-800/80 bg-[#060913]/90 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between gap-4">
          {/* Zone 1: Mobile Menu + Global Asset Search */}
          <div className="flex items-center gap-3 flex-1 max-w-xl min-w-0" ref={searchRef}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
              className="lg:hidden p-2 rounded-lg border border-slate-800 text-slate-300 hover:text-white shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder="Pesquise qualquer ativo pelo ticker ou nome da empresa."
                aria-label="Pesquisa global de ativos"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-900/90 border border-slate-800 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
              {searchOpen && (searchResults.length > 0 || searching) && (
                <div className="absolute left-0 right-0 mt-1.5 rounded-xl terminal-glass shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
                  {searching && (
                    <div className="px-4 py-3 text-xs text-slate-400">
                      Consultando provedores B3 e EUA...
                    </div>
                  )}
                  {searchResults.map((item) => (
                    <button
                      key={item.ticker}
                      type="button"
                      onClick={() => handlePickAsset(item.ticker)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/60 transition-colors text-left border-b border-slate-800/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AssetLogo ticker={item.ticker} name={item.name} size={30} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm text-slate-100">
                              {item.ticker}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {item.exchange} · {item.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{item.name}</p>
                        </div>
                      </div>
                      <div className="text-right font-mono shrink-0">
                        <div className="text-sm font-medium text-slate-100">
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
          </div>

          {/* Zone 2: Market Benchmarks Strip (Desktop) */}
          {macro && (
            <div className="hidden xl:flex items-center gap-5 text-xs font-mono whitespace-nowrap shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">IBOV</span>
                <span className="text-slate-100">{formatNumber(macro.ibovespa.value, 0)}</span>
                <span
                  className={
                    macro.ibovespa.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }
                >
                  {formatPercent(macro.ibovespa.changePercent)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">S&P 500</span>
                <span className="text-slate-100">{formatNumber(macro.sp500.value, 0)}</span>
                <span
                  className={
                    macro.sp500.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }
                >
                  {formatPercent(macro.sp500.changePercent)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">USD/BRL</span>
                <span className="text-amber-300">
                  {formatCurrency(macro.usdBrl.value, 'BRL', 2)}
                </span>
              </div>
            </div>
          )}

          {/* Zone 3: Notifications + Auth/Plan */}
          <div className="flex items-center gap-2.5 shrink-0">
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  aria-label="Notificações"
                  className="relative p-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[#060913] font-mono text-[10px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl terminal-glass shadow-2xl p-3 z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-semibold text-slate-200">
                        Notificações de Alertas
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          onNavigate('alerts');
                        }}
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        Gerenciar
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/70">
                      {notifications.length === 0 ? (
                        <p className="py-5 text-center text-xs text-slate-500">
                          Nenhuma notificação disparada.
                        </p>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              markNotificationRead(n.id);
                              setNotifOpen(false);
                              onSelectAsset(n.ticker);
                            }}
                            className={`w-full text-left py-2.5 px-1 hover:bg-slate-800/40 transition-colors ${
                              n.read ? 'opacity-65' : ''
                            }`}
                          >
                            <div className="text-xs font-semibold text-slate-100">{n.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{n.message}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('subscription')}
                  className="hidden sm:inline-flex items-center px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 font-mono text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  {effectivePlan}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:border-slate-700 text-xs whitespace-nowrap shrink-0"
                >
                  <span className="max-w-[110px] truncate text-slate-200">
                    {profile?.displayName || user.displayName || user.email}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sair da conta"
                  title="Sair"
                  className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#060913] font-semibold text-xs transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar com Google</span>
              </button>
            )}
          </div>
        </header>

        {authError && (
          <div className="mx-4 lg:mx-6 mt-3 px-4 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
            <span>{authError}</span>
            <button type="button" onClick={() => setAuthError(null)} className="underline">
              Fechar
            </button>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
