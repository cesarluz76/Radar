import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  attachOptionalAuth,
  createPaymentCheckoutSession,
  requireAdmin,
  requireAuth,
  requirePlan,
  signEntitlementToken,
  type AuthenticatedRequest,
} from './src/server/authAndPlanMiddleware.ts';
import {
  getAssetSummary,
  getCompanyLogoAsset,
  getIntegrationLogs,
  getMacroOverview,
  getMarketCatalogWithQuotes,
  getProviderStatuses,
  getRealSearchRanking,
  incrementRealSearchCount,
  searchAssetsLive,
} from './src/server/providers.ts';
import {
  analyzeAssetFull,
  buildRadarScreenerUniverse,
  DEFAULT_VALUATION_PARAMETERS,
} from './src/server/valuationEngine.ts';
import { getTechnicalSnapshot } from './src/server/technicalEngine.ts';
import type { ValuationParameters } from './src/shared/types.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '1mb' }));

// Global server-side platform parameters (also synchronized with Firestore /config/platform by admin)
let serverPlatformConfig = {
  ...DEFAULT_VALUATION_PARAMETERS,
  proMonthlyPriceBRL: 79.9,
  premiumMonthlyPriceBRL: 149.9,
  updatedBy: 'Sistema (Padrão)',
  updatedAt: new Date().toISOString(),
};

// Public / Market Overview Routes
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/macro', async (_req, res) => {
  try {
    const overview = await getMacroOverview();
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro macro' });
  }
});

app.get('/api/config/public', (_req, res) => {
  res.json(serverPlatformConfig);
});

app.get('/api/logos/:ticker', async (req, res) => {
  try {
    const logo = await getCompanyLogoAsset(req.params.ticker);
    res.setHeader('Content-Type', logo.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(logo.body);
  } catch {
    res.status(404).end();
  }
});

app.get('/api/assets/search', async (req, res) => {
  try {
    const q = String(req.query.q || '');
    const market = String(req.query.market || 'ALL') as 'ALL' | 'BR' | 'US';
    const items = await searchAssetsLive(q, market);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro na busca' });
  }
});

app.post('/api/assets/:ticker/track-search', (req, res) => {
  const count = incrementRealSearchCount(req.params.ticker);
  res.json({ ticker: req.params.ticker.toUpperCase(), count });
});

app.get('/api/assets/most-searched', async (_req, res) => {
  try {
    const ranking = getRealSearchRanking().slice(0, 10);
    const items = await Promise.all(
      ranking.map(async (r) => {
        const s = await getAssetSummary(r.ticker);
        return s ? { ...s, searchCount: r.count } : null;
      })
    );
    res.json({ items: items.filter(Boolean) });
  } catch {
    res.json({ items: [] });
  }
});

app.get('/api/markets', async (req, res) => {
  try {
    const m = req.query.market === 'BR' || req.query.market === 'US' ? req.query.market : undefined;
    const items = await getMarketCatalogWithQuotes(m);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao listar mercado' });
  }
});

app.get('/api/assets/:ticker/summary', async (req, res) => {
  try {
    const summary = await getAssetSummary(req.params.ticker);
    if (!summary) {
      res.status(404).json({ error: 'Ativo não encontrado nos provedores.' });
      return;
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao buscar ativo' });
  }
});

app.get('/api/assets/:ticker/full', attachOptionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const customParams: Partial<ValuationParameters> = {
      bazinRate: serverPlatformConfig.bazinRate,
      targetPE: serverPlatformConfig.targetPE,
      minMarginOfSafety: serverPlatformConfig.minMarginOfSafety,
      dcfWacc: serverPlatformConfig.dcfWacc,
      dcfPerpetualGrowth: serverPlatformConfig.dcfPerpetualGrowth,
      dcfBaseGrowth: serverPlatformConfig.dcfBaseGrowth,
    };

    if (req.query.bazinRate) customParams.bazinRate = Number(req.query.bazinRate);
    if (req.query.targetPE) customParams.targetPE = Number(req.query.targetPE);
    if (req.query.minMoS) customParams.minMarginOfSafety = Number(req.query.minMoS);
    if (req.query.wacc) customParams.dcfWacc = Number(req.query.wacc);
    if (req.query.perpGrowth) customParams.dcfPerpetualGrowth = Number(req.query.perpGrowth);
    if (req.query.baseGrowth) customParams.dcfBaseGrowth = Number(req.query.baseGrowth);

    const full = await analyzeAssetFull(req.params.ticker, customParams);
    if (!full) {
      res.status(404).json({ error: 'Dados do ativo indisponíveis nos provedores.' });
      return;
    }

    // Server-side plan filtering: FREE users get summary + basic quote + limited valuation preview
    const plan = req.authSession?.plan ?? 'FREE';
    if (plan === 'FREE') {
      res.json({
        ...full,
        planRestricted: true,
        annualStatements: full.annualStatements.slice(-2),
        quarterlyStatements: [],
        valuation: {
          ...full.valuation,
          dcfScenarios: [],
          dcfSensitivity: { waccValues: [], growthValues: [], matrix: [] },
          methods: full.valuation.methods.slice(0, 2),
        },
      });
      return;
    }

    res.json({ ...full, planRestricted: false });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro na análise completa' });
  }
});

app.get('/api/assets/:ticker/technical', async (req, res) => {
  try {
    const range = String(req.query.range || '6mo');
    const snap = await getTechnicalSnapshot(req.params.ticker, range);
    if (!snap) {
      res.status(404).json({ error: 'Histórico técnico indisponível.' });
      return;
    }
    res.json(snap);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro técnico' });
  }
});

// Radar Screener & Consensus Universe
app.get('/api/radar/universe', attachOptionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const items = await buildRadarScreenerUniverse({
      bazinRate: req.query.bazinRate ? Number(req.query.bazinRate) : serverPlatformConfig.bazinRate,
      targetPE: req.query.targetPE ? Number(req.query.targetPE) : serverPlatformConfig.targetPE,
      minMarginOfSafety: req.query.minMoS
        ? Number(req.query.minMoS)
        : serverPlatformConfig.minMarginOfSafety,
    });
    res.json({
      items,
      userPlan: req.authSession?.plan ?? 'FREE',
      parameters: serverPlatformConfig,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro no Radar' });
  }
});

// Server-enforced PRO/PREMIUM Comparison endpoint
app.get('/api/compare', attachOptionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const rawTickers = String(req.query.tickers || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 5);
    const range = String(req.query.range || '1y');
    const plan = req.authSession?.plan ?? 'FREE';
    const maxAllowed = plan === 'FREE' ? 2 : 5;
    const tickers = rawTickers.slice(0, maxAllowed);

    const analyses = await Promise.all(tickers.map((t) => analyzeAssetFull(t)));
    const charts = await Promise.all(tickers.map((t) => getTechnicalSnapshot(t, range)));

    res.json({
      items: analyses.filter(Boolean),
      charts: charts.filter(Boolean),
      maxAllowed,
      plan,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro no comparador' });
  }
});

// Server-enforced PRO/PREMIUM Alert Evaluation
app.post('/api/alerts/evaluate', requirePlan('PRO'), async (req: AuthenticatedRequest, res) => {
  try {
    const rules = (req.body?.alerts ?? []) as Array<{
      id: string;
      ticker: string;
      alertType: string;
      targetValue: number;
      active: boolean;
      lastTriggeredAt?: string;
    }>;
    const triggered: Array<{ alertId: string; ticker: string; title: string; message: string }> = [];

    for (const rule of rules.filter((r) => r.active).slice(0, 25)) {
      const analysis = await analyzeAssetFull(rule.ticker);
      if (!analysis) continue;
      const price = analysis.asset.price;
      const dy = analysis.fundamentals.dividendYield ?? 0;
      const cons = analysis.valuation.consensusCount;

      let hit = false;
      let title = '';
      let message = '';

      if (rule.alertType === 'PRICE_BELOW' && price <= rule.targetValue) {
        hit = true;
        title = `${analysis.asset.ticker} atingiu preço-alvo (${price.toFixed(2)})`;
        message = `Cotação atual (${price.toFixed(2)} ${analysis.asset.currency}) ficou igual ou abaixo de ${rule.targetValue.toFixed(2)}.`;
      } else if (rule.alertType === 'PRICE_ABOVE' && price >= rule.targetValue) {
        hit = true;
        title = `${analysis.asset.ticker} superou alvo (${price.toFixed(2)})`;
        message = `Cotação atual (${price.toFixed(2)} ${analysis.asset.currency}) atingiu ou superou ${rule.targetValue.toFixed(2)}.`;
      } else if (rule.alertType === 'CONSENSUS_3X' && cons >= 3) {
        hit = true;
        title = `${analysis.asset.ticker} entrou em Consenso ${analysis.valuation.consensusLabel}`;
        message = `${cons} métodos independentes apontam desconto com média de ${analysis.valuation.averageDiscountPercent ?? 0}%.`;
      } else if (rule.alertType === 'CONSENSUS_4X' && cons >= 4) {
        hit = true;
        title = `${analysis.asset.ticker} entrou em Consenso ${analysis.valuation.consensusLabel}`;
        message = `${cons} métodos independentes apontam desconto relevante.`;
      } else if (rule.alertType === 'CONSENSUS_5X' && cons === 5) {
        hit = true;
        title = `${analysis.asset.ticker} atingiu Consenso Máximo 5X`;
        message = `Todos os 5 modelos de valuation convergem para margem de segurança.`;
      } else if (rule.alertType === 'DIVIDEND_YIELD' && dy >= rule.targetValue) {
        hit = true;
        title = `${analysis.asset.ticker} com Dividend Yield de ${dy.toFixed(2)}%`;
        message = `Dividend Yield atual (${dy.toFixed(2)}%) atingiu o parâmetro configurado (${rule.targetValue.toFixed(2)}%).`;
      }

      if (hit) {
        triggered.push({ alertId: rule.id, ticker: analysis.asset.ticker, title, message });
      }
    }

    res.json({ triggered, checkedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao avaliar alertas' });
  }
});

// Billing & Subscription Endpoints (Server-Validated)
app.get('/api/billing/status', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    uid: req.authSession?.uid,
    email: req.authSession?.email,
    currentPlan: req.authSession?.plan ?? 'FREE',
    isAdmin: req.authSession?.isAdmin ?? false,
    gateways: {
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      mercadoPagoConfigured: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
    },
    pricing: {
      proMonthlyPriceBRL: serverPlatformConfig.proMonthlyPriceBRL,
      premiumMonthlyPriceBRL: serverPlatformConfig.premiumMonthlyPriceBRL,
    },
  });
});

app.post('/api/billing/checkout', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const provider = req.body?.provider === 'MERCADO_PAGO' ? 'MERCADO_PAGO' : 'STRIPE';
    const plan = req.body?.plan === 'PREMIUM' ? 'PREMIUM' : 'PRO';
    const billingCycle = req.body?.billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
    const basePrice =
      plan === 'PREMIUM'
        ? serverPlatformConfig.premiumMonthlyPriceBRL
        : serverPlatformConfig.proMonthlyPriceBRL;
    const amountBRL = billingCycle === 'ANNUAL' ? Number((basePrice * 10).toFixed(2)) : basePrice;
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    const result = await createPaymentCheckoutSession({
      provider,
      plan,
      billingCycle,
      amountBRL,
      userEmail: req.authSession!.email,
      uid: req.authSession!.uid,
      appUrl,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro no checkout' });
  }
});

// Admin Endpoints (Strictly gated to authenticated admin)
app.get('/api/admin/overview', requireAdmin, (_req, res) => {
  res.json({
    providers: getProviderStatuses(),
    logs: getIntegrationLogs(),
    config: serverPlatformConfig,
    searchRanking: getRealSearchRanking(),
  });
});

app.post('/api/admin/config', requireAdmin, (req: AuthenticatedRequest, res) => {
  const b = req.body || {};
  serverPlatformConfig = {
    bazinRate: typeof b.bazinRate === 'number' ? b.bazinRate : serverPlatformConfig.bazinRate,
    targetPE: typeof b.targetPE === 'number' ? b.targetPE : serverPlatformConfig.targetPE,
    minMarginOfSafety:
      typeof b.minMarginOfSafety === 'number'
        ? b.minMarginOfSafety
        : serverPlatformConfig.minMarginOfSafety,
    dcfWacc: typeof b.dcfWacc === 'number' ? b.dcfWacc : serverPlatformConfig.dcfWacc,
    dcfPerpetualGrowth:
      typeof b.dcfPerpetualGrowth === 'number'
        ? b.dcfPerpetualGrowth
        : serverPlatformConfig.dcfPerpetualGrowth,
    dcfBaseGrowth:
      typeof b.dcfBaseGrowth === 'number' ? b.dcfBaseGrowth : serverPlatformConfig.dcfBaseGrowth,
    proMonthlyPriceBRL:
      typeof b.proMonthlyPriceBRL === 'number'
        ? b.proMonthlyPriceBRL
        : serverPlatformConfig.proMonthlyPriceBRL,
    premiumMonthlyPriceBRL:
      typeof b.premiumMonthlyPriceBRL === 'number'
        ? b.premiumMonthlyPriceBRL
        : serverPlatformConfig.premiumMonthlyPriceBRL,
    updatedBy: req.authSession!.email,
    updatedAt: new Date().toISOString(),
  };
  res.json(serverPlatformConfig);
});

app.post('/api/admin/grant-entitlement', requireAdmin, (req, res) => {
  const targetUid = String(req.body?.uid || '');
  const plan = req.body?.plan === 'PREMIUM' || req.body?.plan === 'PRO' ? req.body.plan : 'FREE';
  if (!targetUid) {
    res.status(400).json({ error: 'UID obrigatório.' });
    return;
  }
  const entitlementToken = signEntitlementToken(targetUid, plan);
  res.json({ uid: targetUid, plan, entitlementToken });
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RADAR VALUATION PRO server listening on http://0.0.0.0:${PORT}`);
  });

  // Periodic background refresh for macro indicators (every 5 minutes)
  setInterval(() => {
    getMacroOverview().catch(() => undefined);
  }, 5 * 60 * 1000);
}

startServer();
