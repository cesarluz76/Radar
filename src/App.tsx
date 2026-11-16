import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { TerminalShell, type NavSectionId } from './components/TerminalShell.tsx';
import type { ScreenerEntry } from './server/valuationEngine.ts';
import type { MacroOverview } from './shared/types.ts';
import { DashboardView } from './views/DashboardView.tsx';
import { MarketsView } from './views/MarketsView.tsx';
import { RadarSonarView } from './views/RadarSonarView.tsx';
import { AssetDetailView } from './views/AssetDetailView.tsx';
import { DividendsRadarView } from './views/DividendsRadarView.tsx';
import { PortfolioAndEvolutionView } from './views/PortfolioAndEvolutionView.tsx';
import { ComparatorAndTechnicalView } from './views/ComparatorAndTechnicalView.tsx';
import { AlertsFavoritesReportsView } from './views/AlertsFavoritesReportsView.tsx';
import { SubscriptionSettingsAdminView } from './views/SubscriptionSettingsAdminView.tsx';

function RadarTerminalApp() {
  const { apiFetch } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSectionId>('dashboard');
  const [previousSection, setPreviousSection] = useState<NavSectionId>('dashboard');
  const [selectedTicker, setSelectedTicker] = useState<string>('PETR4');

  const [macro, setMacro] = useState<MacroOverview | null>(null);
  const [universe, setUniverse] = useState<ScreenerEntry[]>([]);
  const [loadingUniverse, setLoadingUniverse] = useState(true);

  const loadMacro = useCallback(async () => {
    try {
      const res = await fetch('/api/macro');
      if (res.ok) {
        const data = (await res.json()) as MacroOverview;
        setMacro(data);
      }
    } catch {
      // non-fatal
    }
  }, []);

  const loadUniverse = useCallback(
    async (params?: { bazinRate: number; targetPE: number; minMoS: number }) => {
      setLoadingUniverse(true);
      try {
        const qs = params
          ? `?bazinRate=${params.bazinRate}&targetPE=${params.targetPE}&minMoS=${params.minMoS}`
          : '';
        const data = await apiFetch<{ items: ScreenerEntry[] }>(
          `/api/radar/universe${qs}`
        );
        setUniverse(data.items ?? []);
      } catch {
        // non-fatal
      } finally {
        setLoadingUniverse(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    loadMacro();
    loadUniverse();
  }, [loadMacro, loadUniverse]);

  const handleNavigate = (section: NavSectionId) => {
    if (section !== 'asset-detail') {
      setPreviousSection(section);
    }
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAsset = (ticker: string) => {
    setSelectedTicker(ticker.toUpperCase());
    if (activeSection !== 'asset-detail') {
      setPreviousSection(activeSection);
    }
    setActiveSection('asset-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <TerminalShell
      activeSection={activeSection}
      onNavigate={handleNavigate}
      onSelectAsset={handleSelectAsset}
      macro={macro}
    >
      {activeSection === 'dashboard' && (
        <DashboardView
          macro={macro}
          universe={universe}
          loadingUniverse={loadingUniverse}
          onSelectAsset={handleSelectAsset}
          onNavigate={handleNavigate}
        />
      )}

      {activeSection === 'market-br' && (
        <MarketsView
          market="BR"
          universe={universe}
          loading={loadingUniverse}
          onSelectAsset={handleSelectAsset}
        />
      )}

      {activeSection === 'market-us' && (
        <MarketsView
          market="US"
          universe={universe}
          loading={loadingUniverse}
          onSelectAsset={handleSelectAsset}
        />
      )}

      {(activeSection === 'radar-sonar' ||
        activeSection === 'consensus-3x' ||
        activeSection === 'consensus-4x' ||
        activeSection === 'consensus-5x') && (
        <RadarSonarView
          mode={
            activeSection === 'consensus-3x'
              ? '3X'
              : activeSection === 'consensus-4x'
                ? '4X'
                : activeSection === 'consensus-5x'
                  ? '5X'
                  : 'SONAR'
          }
          universe={universe}
          loading={loadingUniverse}
          onRefreshWithParams={loadUniverse}
          onSelectAsset={handleSelectAsset}
          onNavigate={handleNavigate}
        />
      )}

      {activeSection === 'dividends' && (
        <DividendsRadarView
          universe={universe}
          loading={loadingUniverse}
          onSelectAsset={handleSelectAsset}
        />
      )}

      {activeSection === 'portfolio' && (
        <PortfolioAndEvolutionView
          mode="PORTFOLIO"
          macro={macro}
          onSelectAsset={handleSelectAsset}
        />
      )}

      {activeSection === 'evolution' && (
        <PortfolioAndEvolutionView
          mode="EVOLUTION"
          macro={macro}
          onSelectAsset={handleSelectAsset}
        />
      )}

      {activeSection === 'comparator' && (
        <ComparatorAndTechnicalView
          mode="COMPARATOR"
          onSelectAsset={handleSelectAsset}
        />
      )}

      {activeSection === 'technical' && (
        <ComparatorAndTechnicalView
          mode="TECHNICAL"
          initialTicker={selectedTicker}
          onSelectAsset={handleSelectAsset}
        />
      )}

      {activeSection === 'alerts' && (
        <AlertsFavoritesReportsView
          mode="ALERTS"
          universe={universe}
          onSelectAsset={handleSelectAsset}
        />
      )}

      {activeSection === 'favorites' && (
        <AlertsFavoritesReportsView
          mode="FAVORITES"
          universe={universe}
          onSelectAsset={handleSelectAsset}
        />
      )}

      {activeSection === 'reports' && (
        <AlertsFavoritesReportsView
          mode="REPORTS"
          universe={universe}
          onSelectAsset={handleSelectAsset}
        />
      )}

      {activeSection === 'subscription' && (
        <SubscriptionSettingsAdminView
          mode="SUBSCRIPTION"
          onUniverseRefresh={() => loadUniverse()}
        />
      )}

      {activeSection === 'settings' && (
        <SubscriptionSettingsAdminView
          mode="SETTINGS"
          onUniverseRefresh={() => loadUniverse()}
        />
      )}

      {activeSection === 'admin' && (
        <SubscriptionSettingsAdminView
          mode="ADMIN"
          onUniverseRefresh={() => loadUniverse()}
        />
      )}

      {activeSection === 'asset-detail' && (
        <AssetDetailView
          ticker={selectedTicker}
          onBack={() => setActiveSection(previousSection)}
          onNavigate={handleNavigate}
          onSelectAsset={handleSelectAsset}
        />
      )}
    </TerminalShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RadarTerminalApp />
    </AuthProvider>
  );
}
