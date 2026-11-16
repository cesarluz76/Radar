import type {
  AssetCategory,
  AssetSummary,
  DividendEvent,
  FinancialStatementPeriod,
  HistoricalBar,
  MacroBenchmark,
  MacroOverview,
  Market,
  ProviderHealthStatus,
  QuoteFreshness,
} from '../shared/types.ts';

export interface CatalogEntry {
  ticker: string;
  yahooSymbol: string;
  name: string;
  market: Market;
  exchange: string;
  category: AssetCategory;
  sector: string;
  segment: string;
  currency: 'BRL' | 'USD';
  domain?: string;
}

// Curated real-world B3 & US market assets (no synthetic/fictional tickers)
export const REAL_ASSET_CATALOG: CatalogEntry[] = [
  // Brasil — Ações B3
  { ticker: 'PETR4', yahooSymbol: 'PETR4.SA', name: 'Petróleo Brasileiro S.A. - Petrobras PN', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Energia', segment: 'Petróleo e Gás', currency: 'BRL', domain: 'petrobras.com.br' },
  { ticker: 'VALE3', yahooSymbol: 'VALE3.SA', name: 'Vale S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Materiais Básicos', segment: 'Mineração', currency: 'BRL', domain: 'vale.com' },
  { ticker: 'ITUB4', yahooSymbol: 'ITUB4.SA', name: 'Itaú Unibanco Holding S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Financeiro', segment: 'Bancos', currency: 'BRL', domain: 'itau.com.br' },
  { ticker: 'BBDC4', yahooSymbol: 'BBDC4.SA', name: 'Banco Bradesco S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Financeiro', segment: 'Bancos', currency: 'BRL', domain: 'bradesco.com.br' },
  { ticker: 'BBAS3', yahooSymbol: 'BBAS3.SA', name: 'Banco do Brasil S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Financeiro', segment: 'Bancos', currency: 'BRL', domain: 'bb.com.br' },
  { ticker: 'BBSE3', yahooSymbol: 'BBSE3.SA', name: 'BB Seguridade Participações S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Financeiro', segment: 'Seguridade', currency: 'BRL', domain: 'bbseguridaderi.com.br' },
  { ticker: 'WEGE3', yahooSymbol: 'WEGE3.SA', name: 'WEG S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Bens Industriais', segment: 'Motores e Automação', currency: 'BRL', domain: 'weg.net' },
  { ticker: 'ITSA4', yahooSymbol: 'ITSA4.SA', name: 'Itaúsa S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Financeiro', segment: 'Holdings Diversificadas', currency: 'BRL', domain: 'itausa.com.br' },
  { ticker: 'TAEE11', yahooSymbol: 'TAEE11.SA', name: 'Transmissora Aliança de Energia Elétrica', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Utilidade Pública', segment: 'Energia Elétrica', currency: 'BRL', domain: 'taesa.com.br' },
  { ticker: 'EGIE3', yahooSymbol: 'EGIE3.SA', name: 'Engie Brasil Energia S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Utilidade Pública', segment: 'Energia Elétrica', currency: 'BRL', domain: 'engie.com.br' },
  { ticker: 'ELET3', yahooSymbol: 'ELET3.SA', name: 'Centrais Elétricas Brasileiras - Eletrobras', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Utilidade Pública', segment: 'Energia Elétrica', currency: 'BRL', domain: 'eletrobras.com' },
  { ticker: 'SBSP3', yahooSymbol: 'SBSP3.SA', name: 'Sabesp - Saneamento Básico do Estado de SP', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Utilidade Pública', segment: 'Água e Saneamento', currency: 'BRL', domain: 'sabesp.com.br' },
  { ticker: 'SUZB3', yahooSymbol: 'SUZB3.SA', name: 'Suzano S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Materiais Básicos', segment: 'Papel e Celulose', currency: 'BRL', domain: 'suzano.com.br' },
  { ticker: 'KLBN11', yahooSymbol: 'KLBN11.SA', name: 'Klabin S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Materiais Básicos', segment: 'Papel e Celulose', currency: 'BRL', domain: 'klabin.com.br' },
  { ticker: 'ABEV3', yahooSymbol: 'ABEV3.SA', name: 'Ambev S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Consumo Não Cíclico', segment: 'Bebidas', currency: 'BRL', domain: 'ambev.com.br' },
  { ticker: 'PRIO3', yahooSymbol: 'PRIO3.SA', name: 'PRIO S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Energia', segment: 'Petróleo e Gás', currency: 'BRL', domain: 'prio3.com.br' },
  { ticker: 'RENT3', yahooSymbol: 'RENT3.SA', name: 'Localiza Rent a Car S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Consumo Cíclico', segment: 'Locação de Veículos', currency: 'BRL', domain: 'localiza.com' },
  { ticker: 'RADL3', yahooSymbol: 'RADL3.SA', name: 'Raia Drogasil S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Saúde', segment: 'Varejo Farmacêutico', currency: 'BRL', domain: 'rd.com.br' },
  { ticker: 'B3SA3', yahooSymbol: 'B3SA3.SA', name: 'B3 S.A. - Brasil, Bolsa, Balcão', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Financeiro', segment: 'Serviços Financeiros', currency: 'BRL', domain: 'b3.com.br' },
  { ticker: 'VIVT3', yahooSymbol: 'VIVT3.SA', name: 'Telefônica Brasil S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Comunicações', segment: 'Telecomunicações', currency: 'BRL', domain: 'telefonica.com.br' },
  { ticker: 'CXSE3', yahooSymbol: 'CXSE3.SA', name: 'Caixa Seguridade Participações S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Financeiro', segment: 'Seguridade', currency: 'BRL', domain: 'caixaseguridade.com.br' },
  { ticker: 'CPLE6', yahooSymbol: 'CPLE6.SA', name: 'Companhia Paranaense de Energia - Copel', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Utilidade Pública', segment: 'Energia Elétrica', currency: 'BRL', domain: 'copel.com' },
  { ticker: 'CMIG4', yahooSymbol: 'CMIG4.SA', name: 'Companhia Energética de Minas Gerais - Cemig', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Utilidade Pública', segment: 'Energia Elétrica', currency: 'BRL', domain: 'cemig.com.br' },
  { ticker: 'SANB11', yahooSymbol: 'SANB11.SA', name: 'Banco Santander (Brasil) S.A.', market: 'BR', exchange: 'B3', category: 'STOCK', sector: 'Financeiro', segment: 'Bancos', currency: 'BRL', domain: 'santander.com.br' },
  // Brasil — FIIs, ETFs, BDRs
  { ticker: 'HGLG11', yahooSymbol: 'HGLG11.SA', name: 'Pátria Logística FII', market: 'BR', exchange: 'B3', category: 'FII', sector: 'Fundos Imobiliários', segment: 'Logística', currency: 'BRL' },
  { ticker: 'MXRF11', yahooSymbol: 'MXRF11.SA', name: 'Maxi Renda FII', market: 'BR', exchange: 'B3', category: 'FII', sector: 'Fundos Imobiliários', segment: 'Papel / CRI', currency: 'BRL' },
  { ticker: 'KNRI11', yahooSymbol: 'KNRI11.SA', name: 'Kinea Renda Imobiliária FII', market: 'BR', exchange: 'B3', category: 'FII', sector: 'Fundos Imobiliários', segment: 'Híbrido', currency: 'BRL' },
  { ticker: 'XPML11', yahooSymbol: 'XPML11.SA', name: 'XP Malls FII', market: 'BR', exchange: 'B3', category: 'FII', sector: 'Fundos Imobiliários', segment: 'Shoppings', currency: 'BRL' },
  { ticker: 'BOVA11', yahooSymbol: 'BOVA11.SA', name: 'iShares Ibovespa Fundo de Índice', market: 'BR', exchange: 'B3', category: 'ETF', sector: 'ETFs Brasil', segment: 'Índice Ibovespa', currency: 'BRL' },
  { ticker: 'IVVB11', yahooSymbol: 'IVVB11.SA', name: 'iShares S&P 500 Fundo de Investimento', market: 'BR', exchange: 'B3', category: 'ETF', sector: 'ETFs Internacionais', segment: 'S&P 500 BRL', currency: 'BRL' },
  { ticker: 'AAPL34', yahooSymbol: 'AAPL34.SA', name: 'Apple Inc. BDR', market: 'BR', exchange: 'B3', category: 'BDR', sector: 'Tecnologia', segment: 'Hardware e Ecossistema', currency: 'BRL', domain: 'apple.com' },
  { ticker: 'NVDC34', yahooSymbol: 'NVDC34.SA', name: 'NVIDIA Corp. BDR', market: 'BR', exchange: 'B3', category: 'BDR', sector: 'Tecnologia', segment: 'Semicondutores', currency: 'BRL', domain: 'nvidia.com' },

  // Estados Unidos — Stocks, REITs, ETFs, ADRs
  { ticker: 'AAPL', yahooSymbol: 'AAPL', name: 'Apple Inc.', market: 'US', exchange: 'NASDAQ', category: 'STOCK', sector: 'Tecnologia', segment: 'Consumer Electronics', currency: 'USD', domain: 'apple.com' },
  { ticker: 'MSFT', yahooSymbol: 'MSFT', name: 'Microsoft Corporation', market: 'US', exchange: 'NASDAQ', category: 'STOCK', sector: 'Tecnologia', segment: 'Enterprise Software & Cloud', currency: 'USD', domain: 'microsoft.com' },
  { ticker: 'NVDA', yahooSymbol: 'NVDA', name: 'NVIDIA Corporation', market: 'US', exchange: 'NASDAQ', category: 'STOCK', sector: 'Tecnologia', segment: 'Semicondutores & IA', currency: 'USD', domain: 'nvidia.com' },
  { ticker: 'GOOGL', yahooSymbol: 'GOOGL', name: 'Alphabet Inc.', market: 'US', exchange: 'NASDAQ', category: 'STOCK', sector: 'Comunicações', segment: 'Digital Platforms & AI', currency: 'USD', domain: 'abc.xyz' },
  { ticker: 'AMZN', yahooSymbol: 'AMZN', name: 'Amazon.com, Inc.', market: 'US', exchange: 'NASDAQ', category: 'STOCK', sector: 'Consumo Cíclico', segment: 'E-Commerce & Cloud', currency: 'USD', domain: 'amazon.com' },
  { ticker: 'META', yahooSymbol: 'META', name: 'Meta Platforms, Inc.', market: 'US', exchange: 'NASDAQ', category: 'STOCK', sector: 'Comunicações', segment: 'Social Platforms', currency: 'USD', domain: 'meta.com' },
  { ticker: 'BRK-B', yahooSymbol: 'BRK-B', name: 'Berkshire Hathaway Inc.', market: 'US', exchange: 'NYSE', category: 'STOCK', sector: 'Financeiro', segment: 'Seguros e Conglomerado', currency: 'USD', domain: 'berkshirehathaway.com' },
  { ticker: 'JPM', yahooSymbol: 'JPM', name: 'JPMorgan Chase & Co.', market: 'US', exchange: 'NYSE', category: 'STOCK', sector: 'Financeiro', segment: 'Bancos Globais', currency: 'USD', domain: 'jpmorganchase.com' },
  { ticker: 'JNJ', yahooSymbol: 'JNJ', name: 'Johnson & Johnson', market: 'US', exchange: 'NYSE', category: 'STOCK', sector: 'Saúde', segment: 'Farmacêutica', currency: 'USD', domain: 'jnj.com' },
  { ticker: 'PG', yahooSymbol: 'PG', name: 'Procter & Gamble Co.', market: 'US', exchange: 'NYSE', category: 'STOCK', sector: 'Consumo Não Cíclico', segment: 'Produtos de Consumo', currency: 'USD', domain: 'pg.com' },
  { ticker: 'KO', yahooSymbol: 'KO', name: 'The Coca-Cola Company', market: 'US', exchange: 'NYSE', category: 'STOCK', sector: 'Consumo Não Cíclico', segment: 'Bebidas', currency: 'USD', domain: 'coca-colacompany.com' },
  { ticker: 'PEP', yahooSymbol: 'PEP', name: 'PepsiCo, Inc.', market: 'US', exchange: 'NASDAQ', category: 'STOCK', sector: 'Consumo Não Cíclico', segment: 'Bebidas e Alimentos', currency: 'USD', domain: 'pepsico.com' },
  { ticker: 'XOM', yahooSymbol: 'XOM', name: 'Exxon Mobil Corporation', market: 'US', exchange: 'NYSE', category: 'STOCK', sector: 'Energia', segment: 'Petróleo e Gás', currency: 'USD', domain: 'exxonmobil.com' },
  { ticker: 'CVX', yahooSymbol: 'CVX', name: 'Chevron Corporation', market: 'US', exchange: 'NYSE', category: 'STOCK', sector: 'Energia', segment: 'Petróleo e Gás', currency: 'USD', domain: 'chevron.com' },
  { ticker: 'ABBV', yahooSymbol: 'ABBV', name: 'AbbVie Inc.', market: 'US', exchange: 'NYSE', category: 'STOCK', sector: 'Saúde', segment: 'Biotecnologia', currency: 'USD', domain: 'abbvie.com' },
  { ticker: 'AVGO', yahooSymbol: 'AVGO', name: 'Broadcom Inc.', market: 'US', exchange: 'NASDAQ', category: 'STOCK', sector: 'Tecnologia', segment: 'Semicondutores', currency: 'USD', domain: 'broadcom.com' },
  { ticker: 'O', yahooSymbol: 'O', name: 'Realty Income Corporation', market: 'US', exchange: 'NYSE', category: 'REIT', sector: 'Real Estate', segment: 'Retail Triple-Net REIT', currency: 'USD', domain: 'realtyincome.com' },
  { ticker: 'SCHD', yahooSymbol: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', market: 'US', exchange: 'NYSE Arca', category: 'ETF', sector: 'ETFs Dividendos', segment: 'US Dividend Aristocrats', currency: 'USD' },
  { ticker: 'SPY', yahooSymbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', market: 'US', exchange: 'NYSE Arca', category: 'ETF', sector: 'ETFs Índice', segment: 'S&P 500 Index', currency: 'USD' },
  { ticker: 'QQQ', yahooSymbol: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq-100)', market: 'US', exchange: 'NASDAQ', category: 'ETF', sector: 'ETFs Índice', segment: 'Nasdaq-100 Index', currency: 'USD' },
  { ticker: 'TSM', yahooSymbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing ADR', market: 'US', exchange: 'NYSE', category: 'ADR', sector: 'Tecnologia', segment: 'Foundry Semicondutores', currency: 'USD', domain: 'tsmc.com' },
];

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();
  get<T>(key: string): T | null {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return hit.value as T;
  }
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export const providerCache = new TtlCache();

// Provider telemetry tracked honestly from real server requests
const providerMetrics: Record<
  string,
  {
    name: string;
    configured: boolean;
    lastSyncAt: string | null;
    requestsToday: number;
    errorsToday: number;
    totalLatencyMs: number;
    lastError: string | null;
    note: string;
  }
> = {
  yahoo: {
    name: 'Yahoo Finance (v8/v10)',
    configured: true,
    lastSyncAt: null,
    requestsToday: 0,
    errorsToday: 0,
    totalLatencyMs: 0,
    lastError: null,
    note: 'Cotações B3/US, históricos OHLCV, eventos de dividendos/splits e demonstrações financeiras',
  },
  brapi: {
    name: 'Brapi B3',
    configured: true,
    lastSyncAt: null,
    requestsToday: 0,
    errorsToday: 0,
    totalLatencyMs: 0,
    lastError: null,
    note: process.env.BRAPI_TOKEN
      ? 'Token B3 autenticado ativo'
      : 'Modo público B3 (listagem completa + ações liberadas; configure BRAPI_TOKEN para ampliar)',
  },
  bcb: {
    name: 'Banco Central do Brasil (SGS)',
    configured: true,
    lastSyncAt: null,
    requestsToday: 0,
    errorsToday: 0,
    totalLatencyMs: 0,
    lastError: null,
    note: 'Séries oficiais Selic, CDI e IPCA em tempo real',
  },
  sec: {
    name: 'SEC EDGAR XBRL',
    configured: true,
    lastSyncAt: null,
    requestsToday: 0,
    errorsToday: 0,
    totalLatencyMs: 0,
    lastError: null,
    note: 'Demonstrações 10-K/10-Q oficiais para empresas listadas nos EUA',
  },
  fmp: {
    name: 'Financial Modeling Prep',
    configured: Boolean(process.env.FMP_API_KEY),
    lastSyncAt: null,
    requestsToday: 0,
    errorsToday: 0,
    totalLatencyMs: 0,
    lastError: null,
    note: process.env.FMP_API_KEY
      ? 'Chave FMP configurada no servidor'
      : 'Aguardando FMP_API_KEY no ambiente do servidor',
  },
  finnhub: {
    name: 'Finnhub',
    configured: Boolean(process.env.FINNHUB_API_KEY),
    lastSyncAt: null,
    requestsToday: 0,
    errorsToday: 0,
    totalLatencyMs: 0,
    lastError: null,
    note: process.env.FINNHUB_API_KEY
      ? 'Chave Finnhub configurada no servidor'
      : 'Aguardando FINNHUB_API_KEY no ambiente do servidor',
  },
  twelvedata: {
    name: 'Twelve Data',
    configured: Boolean(process.env.TWELVE_DATA_API_KEY),
    lastSyncAt: null,
    requestsToday: 0,
    errorsToday: 0,
    totalLatencyMs: 0,
    lastError: null,
    note: process.env.TWELVE_DATA_API_KEY
      ? 'Chave Twelve Data configurada no servidor'
      : 'Aguardando TWELVE_DATA_API_KEY no ambiente do servidor',
  },
  polygon: {
    name: 'Polygon.io',
    configured: Boolean(process.env.POLYGON_API_KEY),
    lastSyncAt: null,
    requestsToday: 0,
    errorsToday: 0,
    totalLatencyMs: 0,
    lastError: null,
    note: process.env.POLYGON_API_KEY
      ? 'Chave Polygon configurada no servidor'
      : 'Aguardando POLYGON_API_KEY no ambiente do servidor',
  },
};

export interface IntegrationLogItem {
  timestamp: string;
  provider: string;
  endpoint: string;
  ok: boolean;
  latencyMs: number;
  message: string;
}

const integrationLogs: IntegrationLogItem[] = [];

function recordProviderCall(
  id: string,
  endpoint: string,
  ok: boolean,
  latencyMs: number,
  message: string
): void {
  const m = providerMetrics[id];
  if (m) {
    m.requestsToday += 1;
    m.totalLatencyMs += latencyMs;
    m.lastSyncAt = new Date().toISOString();
    if (!ok) {
      m.errorsToday += 1;
      m.lastError = message;
    }
  }
  integrationLogs.unshift({
    timestamp: new Date().toISOString(),
    provider: id,
    endpoint,
    ok,
    latencyMs,
    message,
  });
  if (integrationLogs.length > 100) integrationLogs.pop();
}

export function getProviderStatuses(): ProviderHealthStatus[] {
  return Object.entries(providerMetrics).map(([id, m]) => ({
    id,
    name: m.name,
    configured: m.configured,
    status: !m.configured
      ? 'STANDBY'
      : m.errorsToday > 5 && m.errorsToday > m.requestsToday * 0.5
        ? 'DEGRADED'
        : 'ONLINE',
    lastSyncAt: m.lastSyncAt,
    avgLatencyMs:
      m.requestsToday > 0 ? Math.round(m.totalLatencyMs / m.requestsToday) : null,
    requestsToday: m.requestsToday,
    errorsToday: m.errorsToday,
    note: m.lastError ? `${m.note} (Último aviso: ${m.lastError})` : m.note,
  }));
}

export function getIntegrationLogs(): IntegrationLogItem[] {
  return integrationLogs.slice(0, 60);
}

// Search popularity tracking (real searches performed by users)
const realSearchCounts = new Map<string, number>();

export function incrementRealSearchCount(ticker: string): number {
  const norm = ticker.toUpperCase().replace(/\.SA$/, '');
  const next = (realSearchCounts.get(norm) ?? 0) + 1;
  realSearchCounts.set(norm, next);
  return next;
}

export function getRealSearchRanking(): { ticker: string; count: number }[] {
  return Array.from(realSearchCounts.entries())
    .map(([ticker, count]) => ({ ticker, count }))
    .sort((a, b) => b.count - a.count);
}

// Yahoo Cookie + Crumb manager
let yahooSession: { cookie: string; crumb: string; expiresAt: number } | null = null;
let yahooSessionPromise: Promise<{ cookie: string; crumb: string } | null> | null = null;

async function getYahooSession(forceRefresh = false): Promise<{ cookie: string; crumb: string } | null> {
  if (!forceRefresh && yahooSession && Date.now() < yahooSession.expiresAt) {
    return { cookie: yahooSession.cookie, crumb: yahooSession.crumb };
  }
  if (!forceRefresh && yahooSessionPromise) return yahooSessionPromise;

  yahooSessionPromise = (async () => {
    try {
      const r1 = await fetch('https://fc.yahoo.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      const setCookies = typeof r1.headers.getSetCookie === 'function'
        ? r1.headers.getSetCookie()
        : [r1.headers.get('set-cookie') || ''];
      const cookie = setCookies
        .filter(Boolean)
        .map((c) => c.split(';')[0])
        .join('; ');
      if (!cookie) return null;

      const r2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Cookie: cookie,
        },
      });
      if (!r2.ok) return null;
      const crumb = (await r2.text()).trim();
      if (!crumb) return null;

      yahooSession = { cookie, crumb, expiresAt: Date.now() + 25 * 60 * 1000 };
      return { cookie, crumb };
    } catch {
      return null;
    } finally {
      yahooSessionPromise = null;
    }
  })();

  return yahooSessionPromise;
}

// Brapi sequential queue (free tier concurrencyLimit = 1)
let brapiQueue: Promise<unknown> = Promise.resolve();
function enqueueBrapi<T>(fn: () => Promise<T>): Promise<T> {
  const next = brapiQueue.then(fn, fn);
  brapiQueue = next.catch(() => undefined);
  return next;
}

export function resolveCatalogEntry(rawTicker: string): CatalogEntry {
  const clean = rawTicker.trim().toUpperCase();
  const base = clean.replace(/\.SA$/, '');
  const found = REAL_ASSET_CATALOG.find(
    (c) => c.ticker === base || c.yahooSymbol.toUpperCase() === clean
  );
  if (found) return found;

  // Infer market dynamically for any user-searched real ticker
  const isB3Pattern =
    clean.endsWith('.SA') ||
    /^[A-Z]{4}(3|4|5|6|11|32|33|34|35|39)$/.test(base);
  const category: AssetCategory = isB3Pattern
    ? base.endsWith('11')
      ? 'FII'
      : /3[2-9]$/.test(base)
        ? 'BDR'
        : 'STOCK'
    : 'STOCK';

  return {
    ticker: base,
    yahooSymbol: isB3Pattern ? `${base}.SA` : base,
    name: base,
    market: isB3Pattern ? 'BR' : 'US',
    exchange: isB3Pattern ? 'B3' : 'US Market',
    category,
    sector: 'Não classificado',
    segment: 'Mercado Geral',
    currency: isB3Pattern ? 'BRL' : 'USD',
  };
}

function classifyFreshness(
  regularMarketTimeSec: number | undefined,
  marketState?: string
): QuoteFreshness {
  if (!regularMarketTimeSec) return 'PREV_CLOSE';
  const ageMin = (Date.now() - regularMarketTimeSec * 1000) / 60000;
  if (marketState === 'REGULAR' && ageMin <= 5) return 'REALTIME';
  if (ageMin <= 60) return 'DELAYED';
  return 'PREV_CLOSE';
}

export async function fetchYahooChart(
  yahooSymbol: string,
  range = '1y',
  interval = '1d',
  includeEvents = true
): Promise<{
  meta: Record<string, unknown>;
  bars: HistoricalBar[];
  dividends: DividendEvent[];
  splits: { date: string; numerator: number; denominator: number }[];
} | null> {
  const cacheKey = `y_chart:${yahooSymbol}:${range}:${interval}:${includeEvents}`;
  const ttl = range === '1d' || range === '5d' ? 60_000 : 180_000;
  const cached = providerCache.get<{
    meta: Record<string, unknown>;
    bars: HistoricalBar[];
    dividends: DividendEvent[];
    splits: { date: string; numerator: number; denominator: number }[];
  }>(cacheKey);
  if (cached) return cached;

  const t0 = Date.now();
  const eventsParam = includeEvents ? '&events=div,split' : '';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}${eventsParam}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const latency = Date.now() - t0;
    if (!res.ok) {
      recordProviderCall('yahoo', `chart/${yahooSymbol}`, false, latency, `HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: Record<string, unknown>;
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: (number | null)[];
              high?: (number | null)[];
              low?: (number | null)[];
              close?: (number | null)[];
              volume?: (number | null)[];
            }>;
          };
          events?: {
            dividends?: Record<string, { amount: number; date: number }>;
            splits?: Record<string, { numerator: number; denominator: number; date: number }>;
          };
        }>;
      };
    };

    const result = json.chart?.result?.[0];
    if (!result || !result.meta) {
      recordProviderCall('yahoo', `chart/${yahooSymbol}`, false, latency, 'Sem dados no retorno');
      return null;
    }

    const timestamps = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const bars: HistoricalBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = q.close?.[i];
      const o = q.open?.[i] ?? c;
      const h = q.high?.[i] ?? c;
      const l = q.low?.[i] ?? c;
      const v = q.volume?.[i] ?? 0;
      if (c == null || o == null || h == null || l == null) continue;
      const ts = timestamps[i] * 1000;
      bars.push({
        time:
          interval.includes('m') || interval.includes('h')
            ? new Date(ts).toISOString()
            : new Date(ts).toISOString().slice(0, 10),
        timestamp: ts,
        open: Number(o),
        high: Number(h),
        low: Number(l),
        close: Number(c),
        volume: Number(v),
      });
    }

    const currency =
      (result.meta.currency as string) === 'BRL' ? 'BRL' : 'USD';
    const rawDivs = result.events?.dividends ?? {};
    const dividends: DividendEvent[] = Object.values(rawDivs)
      .map((d) => ({
        date: new Date(d.date * 1000).toISOString().slice(0, 10),
        amount: Number(d.amount),
        currency: currency as 'BRL' | 'USD',
        type: 'DIVIDEND' as const,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const rawSplits = result.events?.splits ?? {};
    const splits = Object.values(rawSplits).map((s) => ({
      date: new Date(s.date * 1000).toISOString().slice(0, 10),
      numerator: s.numerator,
      denominator: s.denominator,
    }));

    const payload = { meta: result.meta, bars, dividends, splits };
    providerCache.set(cacheKey, payload, ttl);
    recordProviderCall('yahoo', `chart/${yahooSymbol}`, true, latency, 'OK');
    return payload;
  } catch (err) {
    recordProviderCall(
      'yahoo',
      `chart/${yahooSymbol}`,
      false,
      Date.now() - t0,
      err instanceof Error ? err.message : 'Erro de rede'
    );
    return null;
  }
}

export async function fetchYahooQuoteSummary(
  yahooSymbol: string
): Promise<Record<string, unknown> | null> {
  const cacheKey = `y_qs:${yahooSymbol}`;
  const cached = providerCache.get<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  const modules = [
    'assetProfile',
    'summaryDetail',
    'price',
    'defaultKeyStatistics',
    'financialData',
    'incomeStatementHistory',
    'incomeStatementHistoryQuarterly',
    'balanceSheetHistory',
    'balanceSheetHistoryQuarterly',
    'cashflowStatementHistory',
    'cashflowStatementHistoryQuarterly',
  ].join(',');

  const attempt = async (forceRefresh: boolean) => {
    const sess = await getYahooSession(forceRefresh);
    if (!sess) return null;
    const t0 = Date.now();
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=${modules}&crumb=${encodeURIComponent(sess.crumb)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Cookie: sess.cookie,
      },
    });
    const latency = Date.now() - t0;
    if (res.status === 401 && !forceRefresh) {
      return 'RETRY_AUTH' as const;
    }
    if (!res.ok) {
      recordProviderCall('yahoo', `quoteSummary/${yahooSymbol}`, false, latency, `HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as {
      quoteSummary?: { result?: Array<Record<string, unknown>> };
    };
    const resObj = json.quoteSummary?.result?.[0] ?? null;
    if (resObj) {
      providerCache.set(cacheKey, resObj, 10 * 60 * 1000);
      recordProviderCall('yahoo', `quoteSummary/${yahooSymbol}`, true, latency, 'OK');
    }
    return resObj;
  };

  let res = await attempt(false);
  if (res === 'RETRY_AUTH') {
    res = await attempt(true);
  }
  return res === 'RETRY_AUTH' ? null : res;
}

export interface BrapiListStock {
  stock: string;
  name: string;
  close: number;
  change: number;
  volume: number;
  market_cap: number | null;
  logo: string;
  sector: string | null;
  type: string;
}

export async function fetchBrapiList(): Promise<BrapiListStock[]> {
  const cacheKey = 'brapi_list_all';
  const cached = providerCache.get<BrapiListStock[]>(cacheKey);
  if (cached) return cached;

  return enqueueBrapi(async () => {
    const again = providerCache.get<BrapiListStock[]>(cacheKey);
    if (again) return again;

    const t0 = Date.now();
    try {
      const tokenParam = process.env.BRAPI_TOKEN
        ? `&token=${encodeURIComponent(process.env.BRAPI_TOKEN)}`
        : '';
      const res = await fetch(`https://brapi.dev/api/quote/list?limit=600${tokenParam}`);
      const latency = Date.now() - t0;
      if (!res.ok) {
        recordProviderCall('brapi', 'quote/list', false, latency, `HTTP ${res.status}`);
        return [];
      }
      const json = (await res.json()) as { stocks?: BrapiListStock[] };
      const list = json.stocks ?? [];
      providerCache.set(cacheKey, list, 5 * 60 * 1000);
      recordProviderCall('brapi', 'quote/list', true, latency, `${list.length} ativos B3`);
      return list;
    } catch (err) {
      recordProviderCall(
        'brapi',
        'quote/list',
        false,
        Date.now() - t0,
        err instanceof Error ? err.message : 'Erro Brapi'
      );
      return [];
    }
  });
}

export async function fetchBrapiQuote(ticker: string): Promise<Record<string, unknown> | null> {
  const clean = ticker.toUpperCase().replace(/\.SA$/, '');
  const freeAllowed = ['PETR4', 'VALE3', 'ITUB4', 'MGLU3'];
  if (!process.env.BRAPI_TOKEN && !freeAllowed.includes(clean)) {
    return null;
  }
  const cacheKey = `brapi_q:${clean}`;
  const cached = providerCache.get<Record<string, unknown>>(cacheKey);
  if (cached) return cached;

  return enqueueBrapi(async () => {
    const again = providerCache.get<Record<string, unknown>>(cacheKey);
    if (again) return again;
    const t0 = Date.now();
    try {
      const tokenParam = process.env.BRAPI_TOKEN
        ? `&token=${encodeURIComponent(process.env.BRAPI_TOKEN)}`
        : '';
      const url = `https://brapi.dev/api/quote/${encodeURIComponent(clean)}?fundamental=true&dividends=true&modules=summaryProfile,defaultKeyStatistics,financialData,incomeStatementHistory,balanceSheetHistory${tokenParam}`;
      const res = await fetch(url);
      const latency = Date.now() - t0;
      if (!res.ok) {
        recordProviderCall('brapi', `quote/${clean}`, false, latency, `HTTP ${res.status}`);
        return null;
      }
      const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
      const item = json.results?.[0] ?? null;
      if (item) {
        providerCache.set(cacheKey, item, 3 * 60 * 1000);
        recordProviderCall('brapi', `quote/${clean}`, true, latency, 'OK');
      }
      return item;
    } catch (err) {
      recordProviderCall(
        'brapi',
        `quote/${clean}`,
        false,
        Date.now() - t0,
        err instanceof Error ? err.message : 'Erro Brapi'
      );
      return null;
    }
  });
}

// Optional paid provider adapters (FMP, Finnhub, Twelve Data, Polygon)
export async function fetchOptionalProviderProfile(ticker: string, market: Market): Promise<{
  provider: string;
  pe?: number | null;
  eps?: number | null;
  dividendYield?: number | null;
  marketCap?: number | null;
} | null> {
  if (process.env.FMP_API_KEY && market === 'US') {
    const t0 = Date.now();
    try {
      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(ticker)}?apikey=${encodeURIComponent(process.env.FMP_API_KEY)}`
      );
      const latency = Date.now() - t0;
      if (res.ok) {
        const arr = (await res.json()) as Array<Record<string, unknown>>;
        const item = arr?.[0];
        recordProviderCall('fmp', `profile/${ticker}`, true, latency, 'OK');
        if (item) {
          return {
            provider: 'Financial Modeling Prep',
            marketCap: typeof item.mktCap === 'number' ? item.mktCap : null,
          };
        }
      } else {
        recordProviderCall('fmp', `profile/${ticker}`, false, latency, `HTTP ${res.status}`);
      }
    } catch (err) {
      recordProviderCall('fmp', `profile/${ticker}`, false, Date.now() - t0, String(err));
    }
  }
  if (process.env.FINNHUB_API_KEY && market === 'US') {
    const t0 = Date.now();
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(ticker)}&metric=all&token=${encodeURIComponent(process.env.FINNHUB_API_KEY)}`
      );
      const latency = Date.now() - t0;
      if (res.ok) {
        const json = (await res.json()) as { metric?: Record<string, number> };
        recordProviderCall('finnhub', `metric/${ticker}`, true, latency, 'OK');
        if (json.metric) {
          return {
            provider: 'Finnhub',
            pe: json.metric.peBasicExclExtraTTM ?? null,
            eps: json.metric.epsBasicExclExtraItemsTTM ?? null,
            dividendYield: json.metric.dividendYieldIndicatedAnnual ?? null,
          };
        }
      } else {
        recordProviderCall('finnhub', `metric/${ticker}`, false, latency, `HTTP ${res.status}`);
      }
    } catch (err) {
      recordProviderCall('finnhub', `metric/${ticker}`, false, Date.now() - t0, String(err));
    }
  }
  return null;
}

export async function getAssetSummary(rawTicker: string): Promise<AssetSummary | null> {
  const entry = resolveCatalogEntry(rawTicker);
  const cacheKey = `summary:${entry.ticker}`;
  const cached = providerCache.get<AssetSummary>(cacheKey);
  if (cached) return cached;

  // Try Brapi first for B3 when available or Yahoo chart universally
  const [brapiData, yahooChart] = await Promise.all([
    entry.market === 'BR' ? fetchBrapiQuote(entry.ticker) : Promise.resolve(null),
    fetchYahooChart(entry.yahooSymbol, '1y', '1d', false),
  ]);

  if (!yahooChart && !brapiData) return null;

  const meta = yahooChart?.meta ?? {};
  const bars = yahooChart?.bars ?? [];
  const lastBar = bars[bars.length - 1];
  const prevBar = bars[bars.length - 2];

  const price =
    (typeof brapiData?.regularMarketPrice === 'number' ? brapiData.regularMarketPrice : null) ??
    (typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : null) ??
    lastBar?.close ??
    0;

  const prevClose =
    (typeof brapiData?.regularMarketPreviousClose === 'number'
      ? brapiData.regularMarketPreviousClose
      : null) ??
    (typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose : null) ??
    prevBar?.close ??
    price;

  const change =
    typeof brapiData?.regularMarketChange === 'number'
      ? brapiData.regularMarketChange
      : price - prevClose;
  const changePercent =
    typeof brapiData?.regularMarketChangePercent === 'number'
      ? brapiData.regularMarketChangePercent
      : prevClose > 0
        ? ((price - prevClose) / prevClose) * 100
        : 0;

  const volume =
    (typeof brapiData?.regularMarketVolume === 'number'
      ? brapiData.regularMarketVolume
      : null) ??
    (typeof meta.regularMarketVolume === 'number' ? meta.regularMarketVolume : null) ??
    lastBar?.volume ??
    null;

  const summary: AssetSummary = {
    ticker: entry.ticker,
    yahooSymbol: entry.yahooSymbol,
    name:
      (typeof brapiData?.longName === 'string' && brapiData.longName) ||
      (typeof meta.longName === 'string' && meta.longName) ||
      entry.name,
    shortName:
      (typeof brapiData?.shortName === 'string' && brapiData.shortName) ||
      (typeof meta.shortName === 'string' && meta.shortName) ||
      entry.ticker,
    market: entry.market,
    exchange: entry.exchange,
    category: entry.category,
    sector: entry.sector,
    segment: entry.segment,
    currency: entry.currency,
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    dayHigh:
      (typeof brapiData?.regularMarketDayHigh === 'number' ? brapiData.regularMarketDayHigh : null) ??
      (typeof meta.regularMarketDayHigh === 'number' ? meta.regularMarketDayHigh : null) ??
      lastBar?.high ??
      null,
    dayLow:
      (typeof brapiData?.regularMarketDayLow === 'number' ? brapiData.regularMarketDayLow : null) ??
      (typeof meta.regularMarketDayLow === 'number' ? meta.regularMarketDayLow : null) ??
      lastBar?.low ??
      null,
    high52w:
      (typeof brapiData?.fiftyTwoWeekHigh === 'number' ? brapiData.fiftyTwoWeekHigh : null) ??
      (typeof meta.fiftyTwoWeekHigh === 'number' ? meta.fiftyTwoWeekHigh : null) ??
      (bars.length > 0 ? Math.max(...bars.map((b) => b.high)) : null),
    low52w:
      (typeof brapiData?.fiftyTwoWeekLow === 'number' ? brapiData.fiftyTwoWeekLow : null) ??
      (typeof meta.fiftyTwoWeekLow === 'number' ? meta.fiftyTwoWeekLow : null) ??
      (bars.length > 0 ? Math.min(...bars.map((b) => b.low)) : null),
    volume,
    financialVolume: volume != null ? Math.round(volume * price) : null,
    marketCap:
      typeof brapiData?.marketCap === 'number' ? brapiData.marketCap : null,
    logoUrl: `/api/logos/${encodeURIComponent(entry.ticker)}`,
    freshness: classifyFreshness(
      typeof meta.regularMarketTime === 'number' ? meta.regularMarketTime : undefined,
      typeof meta.marketState === 'string' ? meta.marketState : undefined
    ),
    updatedAt:
      typeof brapiData?.regularMarketTime === 'string'
        ? brapiData.regularMarketTime
        : typeof meta.regularMarketTime === 'number'
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : new Date().toISOString(),
    source: brapiData ? 'Brapi + Yahoo Finance' : 'Yahoo Finance',
    searchCount: realSearchCounts.get(entry.ticker) ?? 0,
  };

  providerCache.set(cacheKey, summary, 90_000);
  return summary;
}

export async function getMarketCatalogWithQuotes(market?: Market): Promise<AssetSummary[]> {
  const cacheKey = `catalog_quotes:${market || 'ALL'}`;
  const cached = providerCache.get<AssetSummary[]>(cacheKey);
  if (cached) return cached;

  const entries = REAL_ASSET_CATALOG.filter((e) => !market || e.market === market);
  const brapiList = market !== 'US' ? await fetchBrapiList() : [];
  const brapiByTicker = new Map(brapiList.map((b) => [b.stock.toUpperCase(), b]));

  const summaries = await Promise.all(
    entries.map(async (entry) => {
      const brapiItem = brapiByTicker.get(entry.ticker);
      const summary = await getAssetSummary(entry.ticker);
      if (summary) {
        if (brapiItem && summary.marketCap == null) {
          summary.marketCap = brapiItem.market_cap;
        }
        return summary;
      }
      if (brapiItem) {
        return {
          ticker: entry.ticker,
          yahooSymbol: entry.yahooSymbol,
          name: brapiItem.name || entry.name,
          shortName: entry.ticker,
          market: entry.market,
          exchange: entry.exchange,
          category: entry.category,
          sector: brapiItem.sector || entry.sector,
          segment: entry.segment,
          currency: entry.currency,
          price: brapiItem.close || 0,
          change: (brapiItem.close * (brapiItem.change || 0)) / 100,
          changePercent: brapiItem.change || 0,
          dayHigh: null,
          dayLow: null,
          high52w: null,
          low52w: null,
          volume: brapiItem.volume || null,
          financialVolume: brapiItem.volume ? Math.round(brapiItem.volume * brapiItem.close) : null,
          marketCap: brapiItem.market_cap,
          logoUrl: `/api/logos/${encodeURIComponent(entry.ticker)}`,
          freshness: 'PREV_CLOSE' as QuoteFreshness,
          updatedAt: new Date().toISOString(),
          source: 'Brapi B3',
          searchCount: realSearchCounts.get(entry.ticker) ?? 0,
        };
      }
      return null;
    })
  );

  const valid = summaries.filter((s): s is AssetSummary => s !== null && s.price > 0);
  providerCache.set(cacheKey, valid, 90_000);
  return valid;
}

export async function searchAssetsLive(
  query: string,
  marketFilter?: 'ALL' | Market
): Promise<AssetSummary[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results = new Map<string, CatalogEntry>();

  // 1. Search curated catalog
  for (const item of REAL_ASSET_CATALOG) {
    if (marketFilter && marketFilter !== 'ALL' && item.market !== marketFilter) continue;
    if (
      item.ticker.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    ) {
      results.set(item.ticker, item);
    }
  }

  // 2. Search Brapi B3 full list
  if (marketFilter !== 'US') {
    const brapiList = await fetchBrapiList();
    for (const b of brapiList) {
      if (results.size >= 14) break;
      if (
        b.stock.toLowerCase().includes(q) ||
        (b.name && b.name.toLowerCase().includes(q)) ||
        (b.sector && b.sector.toLowerCase().includes(q))
      ) {
        if (!results.has(b.stock.toUpperCase())) {
          results.set(b.stock.toUpperCase(), resolveCatalogEntry(b.stock));
        }
      }
    }
  }

  // 3. Search Yahoo Finance global search endpoint
  try {
    const yRes = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (yRes.ok) {
      const yJson = (await yRes.json()) as {
        quotes?: Array<{
          symbol?: string;
          shortname?: string;
          longname?: string;
          quoteType?: string;
          exchDisp?: string;
          sectorDisp?: string;
        }>;
      };
      for (const item of yJson.quotes ?? []) {
        if (!item.symbol) continue;
        const isSa = item.symbol.endsWith('.SA');
        const mkt: Market = isSa ? 'BR' : 'US';
        if (marketFilter && marketFilter !== 'ALL' && mkt !== marketFilter) continue;
        if (!['EQUITY', 'ETF'].includes(item.quoteType || 'EQUITY')) continue;
        const cleanTicker = item.symbol.replace(/\.SA$/, '').toUpperCase();
        if (!results.has(cleanTicker)) {
          results.set(cleanTicker, {
            ticker: cleanTicker,
            yahooSymbol: item.symbol,
            name: item.longname || item.shortname || cleanTicker,
            market: mkt,
            exchange: isSa ? 'B3' : item.exchDisp || 'US',
            category: item.quoteType === 'ETF' ? 'ETF' : 'STOCK',
            sector: item.sectorDisp || 'Mercado Geral',
            segment: item.quoteType || 'Ação',
            currency: isSa ? 'BRL' : 'USD',
          });
        }
      }
    }
  } catch {
    // non-fatal
  }

  const topEntries = Array.from(results.values()).slice(0, 10);
  const quoted = await Promise.all(topEntries.map((e) => getAssetSummary(e.ticker)));
  return quoted.filter((s): s is AssetSummary => s !== null);
}

// Fetch Banco Central do Brasil SGS rate
async function fetchBcbSeriesLast(seriesCode: number): Promise<number | null> {
  const cacheKey = `bcb:${seriesCode}`;
  const cached = providerCache.get<number>(cacheKey);
  if (cached != null) return cached;

  const t0 = Date.now();
  try {
    const res = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/12?formato=json`
    );
    const latency = Date.now() - t0;
    if (!res.ok) {
      recordProviderCall('bcb', `sgs.${seriesCode}`, false, latency, `HTTP ${res.status}`);
      return null;
    }
    const arr = (await res.json()) as Array<{ data: string; valor: string }>;
    if (!arr.length) return null;
    let val = parseFloat(arr[arr.length - 1].valor);
    // Series 11 (Selic daily) and 12 (CDI daily) return daily % -> annualize (252 business days)
    if (seriesCode === 11 || seriesCode === 12) {
      val = (Math.pow(1 + val / 100, 252) - 1) * 100;
    } else if (seriesCode === 433) {
      // IPCA monthly % -> compound last 12 months
      val = (arr.reduce((acc, row) => acc * (1 + parseFloat(row.valor) / 100), 1) - 1) * 100;
    }
    val = Number(val.toFixed(2));
    providerCache.set(cacheKey, val, 30 * 60 * 1000);
    recordProviderCall('bcb', `sgs.${seriesCode}`, true, latency, `${val}%`);
    return val;
  } catch (err) {
    recordProviderCall('bcb', `sgs.${seriesCode}`, false, Date.now() - t0, String(err));
    return null;
  }
}

async function fetchIndexBenchmark(
  symbol: string,
  name: string,
  unit: string
): Promise<MacroBenchmark> {
  const data = await fetchYahooChart(symbol, '1mo', '1d', false);
  const bars = data?.bars ?? [];
  const meta = data?.meta ?? {};
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];

  const val =
    (typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : null) ??
    last?.close ??
    0;
  const prevVal =
    (typeof meta.chartPreviousClose === 'number' && bars.length <= 1
      ? meta.chartPreviousClose
      : null) ??
    prev?.close ??
    val;
  const change = val - prevVal;
  const changePercent = prevVal > 0 ? (change / prevVal) * 100 : 0;

  return {
    symbol,
    name,
    value: Number(val.toFixed(unit === 'BRL' ? 4 : 2)),
    change: Number(change.toFixed(unit === 'BRL' ? 4 : 2)),
    changePercent: Number(changePercent.toFixed(2)),
    unit,
    updatedAt:
      typeof meta.regularMarketTime === 'number'
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
    source: 'Yahoo Finance',
    freshness: classifyFreshness(
      typeof meta.regularMarketTime === 'number' ? meta.regularMarketTime : undefined,
      typeof meta.marketState === 'string' ? meta.marketState : undefined
    ),
    history: bars.map((b) => ({ date: b.time, value: Number(b.close.toFixed(2)) })),
  };
}

export async function getMacroOverview(): Promise<MacroOverview> {
  const cacheKey = 'macro_overview';
  const cached = providerCache.get<MacroOverview>(cacheKey);
  if (cached) return cached;

  const [ibovespa, sp500, nasdaq, dowJones, usdBrl, selic, cdi, ipca] =
    await Promise.all([
      fetchIndexBenchmark('^BVSP', 'Ibovespa', 'pts'),
      fetchIndexBenchmark('^GSPC', 'S&P 500', 'pts'),
      fetchIndexBenchmark('^IXIC', 'Nasdaq', 'pts'),
      fetchIndexBenchmark('^DJI', 'Dow Jones', 'pts'),
      fetchIndexBenchmark('USDBRL=X', 'Dólar (USD/BRL)', 'BRL'),
      fetchBcbSeriesLast(11),
      fetchBcbSeriesLast(12),
      fetchBcbSeriesLast(433),
    ]);

  const overview: MacroOverview = {
    ibovespa,
    sp500,
    nasdaq,
    dowJones,
    usdBrl,
    cdiAnnual: cdi ?? 11.15,
    selicAnnual: selic ?? 11.25,
    ipca12m: ipca ?? 4.5,
    updatedAt: new Date().toISOString(),
  };

  providerCache.set(cacheKey, overview, 120_000);
  return overview;
}

// Helper to parse Yahoo quoteSummary numeric objects `{ raw: number }` or raw numbers
export function yNum(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (val && typeof val === 'object' && 'raw' in val) {
    const raw = (val as { raw?: unknown }).raw;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  }
  return null;
}

export function extractStatements(
  qs: Record<string, unknown> | null,
  currency: 'BRL' | 'USD',
  periodType: 'ANNUAL' | 'QUARTERLY'
): FinancialStatementPeriod[] {
  if (!qs) return [];
  const incKey =
    periodType === 'ANNUAL'
      ? 'incomeStatementHistory'
      : 'incomeStatementHistoryQuarterly';
  const balKey =
    periodType === 'ANNUAL'
      ? 'balanceSheetHistory'
      : 'balanceSheetHistoryQuarterly';
  const cfKey =
    periodType === 'ANNUAL'
      ? 'cashflowStatementHistory'
      : 'cashflowStatementHistoryQuarterly';

  const incArr =
    ((qs[incKey] as Record<string, unknown> | undefined)?.incomeStatementHistory as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const balArr =
    ((qs[balKey] as Record<string, unknown> | undefined)?.balanceSheetStatements as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const cfArr =
    ((qs[cfKey] as Record<string, unknown> | undefined)?.cashflowStatements as
      | Array<Record<string, unknown>>
      | undefined) ?? [];

  const byDate = new Map<string, FinancialStatementPeriod>();

  const getOrInit = (rawEndDate: unknown): FinancialStatementPeriod | null => {
    let dateStr: string | null = null;
    if (rawEndDate && typeof rawEndDate === 'object' && 'fmt' in rawEndDate) {
      dateStr = String((rawEndDate as { fmt: unknown }).fmt);
    } else if (typeof rawEndDate === 'number') {
      dateStr = new Date(rawEndDate * 1000).toISOString().slice(0, 10);
    } else if (typeof rawEndDate === 'string') {
      dateStr = rawEndDate.slice(0, 10);
    }
    if (!dateStr) return null;
    const existing = byDate.get(dateStr);
    if (existing) return existing;
    const blank: FinancialStatementPeriod = {
      periodEnd: dateStr,
      periodType,
      currency,
      revenue: null,
      ebit: null,
      ebitda: null,
      netIncome: null,
      netMargin: null,
      ebitdaMargin: null,
      totalAssets: null,
      totalEquity: null,
      totalDebt: null,
      cash: null,
      netDebt: null,
      operatingCashFlow: null,
      capex: null,
      freeCashFlow: null,
      dividendsPaid: null,
    };
    byDate.set(dateStr, blank);
    return blank;
  };

  for (const row of incArr) {
    const p = getOrInit(row.endDate);
    if (!p) continue;
    p.revenue = yNum(row.totalRevenue);
    p.ebit = yNum(row.ebit) ?? yNum(row.operatingIncome);
    p.netIncome = yNum(row.netIncome);
    if (p.revenue && p.revenue > 0 && p.netIncome != null) {
      p.netMargin = Number(((p.netIncome / p.revenue) * 100).toFixed(2));
    }
  }

  for (const row of balArr) {
    const p = getOrInit(row.endDate);
    if (!p) continue;
    p.totalAssets = yNum(row.totalAssets);
    p.totalEquity = yNum(row.totalStockholderEquity);
    const shortDebt = yNum(row.shortLongTermDebt) ?? 0;
    const longDebt = yNum(row.longTermDebt) ?? 0;
    p.totalDebt = shortDebt + longDebt > 0 ? shortDebt + longDebt : yNum(row.totalDebt);
    p.cash = yNum(row.cash) ?? yNum(row.cashAndShortTermInvestments);
    if (p.totalDebt != null && p.cash != null) {
      p.netDebt = p.totalDebt - p.cash;
    }
  }

  for (const row of cfArr) {
    const p = getOrInit(row.endDate);
    if (!p) continue;
    p.operatingCashFlow = yNum(row.totalCashFromOperatingActivities);
    const capexRaw = yNum(row.capitalExpenditures);
    p.capex = capexRaw != null ? Math.abs(capexRaw) : null;
    if (p.operatingCashFlow != null && p.capex != null) {
      p.freeCashFlow = p.operatingCashFlow - p.capex;
    }
    const da = yNum(row.depreciation);
    if (p.ebit != null && da != null) {
      p.ebitda = p.ebit + da;
      if (p.revenue && p.revenue > 0) {
        p.ebitdaMargin = Number(((p.ebitda / p.revenue) * 100).toFixed(2));
      }
    }
    const divPaid = yNum(row.dividendsPaid);
    p.dividendsPaid = divPaid != null ? Math.abs(divPaid) : null;
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.periodEnd.localeCompare(b.periodEnd)
  );
}

// SEC EDGAR 10-year XBRL supplement for US stocks
let secCikMap: Map<string, string> | null = null;
async function getSecCik(ticker: string): Promise<string | null> {
  if (!secCikMap) {
    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': 'RadarValuationPro contact@radarvaluation.com.br' },
      });
      if (res.ok) {
        const json = (await res.json()) as Record<
          string,
          { cik_str: number; ticker: string }
        >;
        secCikMap = new Map();
        for (const row of Object.values(json)) {
          secCikMap.set(row.ticker.toUpperCase(), String(row.cik_str).padStart(10, '0'));
        }
      }
    } catch {
      return null;
    }
  }
  return secCikMap?.get(ticker.toUpperCase()) ?? null;
}

export async function fetchSec10YearAnnuals(
  ticker: string
): Promise<FinancialStatementPeriod[]> {
  const cacheKey = `sec_10y:${ticker.toUpperCase()}`;
  const cached = providerCache.get<FinancialStatementPeriod[]>(cacheKey);
  if (cached) return cached;

  const cik = await getSecCik(ticker);
  if (!cik) return [];

  const t0 = Date.now();
  try {
    const res = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      {
        headers: { 'User-Agent': 'RadarValuationPro contact@radarvaluation.com.br' },
      }
    );
    const latency = Date.now() - t0;
    if (!res.ok) {
      recordProviderCall('sec', `companyfacts/${ticker}`, false, latency, `HTTP ${res.status}`);
      return [];
    }
    const data = (await res.json()) as {
      facts?: {
        'us-gaap'?: Record<
          string,
          {
            units?: {
              USD?: Array<{
                end: string;
                val: number;
                form: string;
                frame?: string;
              }>;
            };
          }
        >;
      };
    };
    const gaap = data.facts?.['us-gaap'] ?? {};

    const pickAnnualSeries = (concepts: string[]): Map<string, number> => {
      const out = new Map<string, number>();
      for (const concept of concepts) {
        const rows = gaap[concept]?.units?.USD ?? [];
        for (const r of rows) {
          if (r.form !== '10-K' || !r.end) continue;
          const yr = r.end.slice(0, 4);
          if (r.frame && /^CY\d{4}$/.test(r.frame)) {
            out.set(yr, r.val);
          } else if (!out.has(yr)) {
            out.set(yr, r.val);
          }
        }
        if (out.size >= 4) break;
      }
      return out;
    };

    const revMap = pickAnnualSeries([
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'Revenues',
      'SalesRevenueNet',
    ]);
    const netIncMap = pickAnnualSeries(['NetIncomeLoss']);
    const ebitMap = pickAnnualSeries(['OperatingIncomeLoss']);
    const equityMap = pickAnnualSeries(['StockholdersEquity']);
    const ocfMap = pickAnnualSeries(['NetCashProvidedByUsedInOperatingActivities']);
    const capexMap = pickAnnualSeries([
      'PaymentsToAcquirePropertyPlantAndEquipment',
    ]);
    const cashMap = pickAnnualSeries([
      'CashAndCashEquivalentsAtCarryingValue',
    ]);
    const debtMap = pickAnnualSeries(['LongTermDebtNoncurrent', 'LongTermDebt']);

    const years = Array.from(
      new Set([...revMap.keys(), ...netIncMap.keys()])
    )
      .sort()
      .slice(-10);

    const periods: FinancialStatementPeriod[] = years.map((yr) => {
      const revenue = revMap.get(yr) ?? null;
      const netIncome = netIncMap.get(yr) ?? null;
      const ebit = ebitMap.get(yr) ?? null;
      const totalEquity = equityMap.get(yr) ?? null;
      const ocf = ocfMap.get(yr) ?? null;
      const capex = capexMap.get(yr) ?? null;
      const freeCashFlow = ocf != null && capex != null ? ocf - Math.abs(capex) : null;
      const cash = cashMap.get(yr) ?? null;
      const totalDebt = debtMap.get(yr) ?? null;
      return {
        periodEnd: `${yr}-12-31`,
        periodType: 'ANNUAL',
        currency: 'USD',
        revenue,
        ebit,
        ebitda: null,
        netIncome,
        netMargin:
          revenue && revenue > 0 && netIncome != null
            ? Number(((netIncome / revenue) * 100).toFixed(2))
            : null,
        ebitdaMargin: null,
        totalAssets: null,
        totalEquity,
        totalDebt,
        cash,
        netDebt: totalDebt != null && cash != null ? totalDebt - cash : null,
        operatingCashFlow: ocf,
        capex,
        freeCashFlow,
        dividendsPaid: null,
      };
    });

    providerCache.set(cacheKey, periods, 60 * 60 * 1000);
    recordProviderCall('sec', `companyfacts/${ticker}`, true, latency, `${periods.length} anos`);
    return periods;
  } catch (err) {
    recordProviderCall('sec', `companyfacts/${ticker}`, false, Date.now() - t0, String(err));
    return [];
  }
}

// Cached company logo proxy with deterministic SVG monogram fallback
export async function getCompanyLogoAsset(ticker: string): Promise<{
  contentType: string;
  body: Buffer | string;
}> {
  const entry = resolveCatalogEntry(ticker);
  const cacheKey = `logo:${entry.ticker}`;
  const cached = providerCache.get<{ contentType: string; body: Buffer | string }>(
    cacheKey
  );
  if (cached) return cached;

  const tryFetch = async (url: string) => {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') || 'image/png';
      if (!ct.startsWith('image/')) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 100) return null;
      return { contentType: ct, body: buf };
    } catch {
      return null;
    }
  };

  if (entry.market === 'BR') {
    const brapiLogo = await tryFetch(
      `https://icons.brapi.dev/icons/${encodeURIComponent(entry.ticker)}.svg`
    );
    if (brapiLogo) {
      providerCache.set(cacheKey, brapiLogo, 24 * 60 * 60 * 1000);
      return brapiLogo;
    }
  }

  if (entry.market === 'US') {
    const fmpLogo = await tryFetch(
      `https://financialmodelingprep.com/image-stock/${encodeURIComponent(entry.ticker)}.png`
    );
    if (fmpLogo) {
      providerCache.set(cacheKey, fmpLogo, 24 * 60 * 60 * 1000);
      return fmpLogo;
    }
  }

  if (entry.domain) {
    const favicon = await tryFetch(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(entry.domain)}&sz=128`
    );
    if (favicon) {
      providerCache.set(cacheKey, favicon, 24 * 60 * 60 * 1000);
      return favicon;
    }
  }

  // Deterministic institutional SVG monogram fallback (zero broken images)
  const initials = entry.ticker.replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const hue =
    entry.ticker.split('').reduce((acc, ch) => acc + ch.charCodeAt(0) * 17, 0) %
    360;
  const accent = entry.market === 'BR' ? '#10B981' : '#F59E0B';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue}, 42%, 18%)"/>
        <stop offset="100%" stop-color="#0B1120"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill="url(#g)"/>
    <rect x="1" y="1" width="62" height="62" rx="13" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="1.5"/>
    <text x="32" y="37" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="${initials.length > 3 ? '15' : '18'}" fill="#F8FAFC" letter-spacing="0.5">${initials}</text>
  </svg>`;
  const fallback = { contentType: 'image/svg+xml', body: svg };
  providerCache.set(cacheKey, fallback, 60 * 60 * 1000);
  return fallback;
}
