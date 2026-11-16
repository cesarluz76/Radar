export type Market = 'BR' | 'US';

export type AssetCategory =
  | 'STOCK'
  | 'FII'
  | 'ETF'
  | 'BDR'
  | 'REIT'
  | 'ADR'
  | 'INDEX';

export type QuoteFreshness =
  | 'REALTIME'
  | 'DELAYED'
  | 'PREV_CLOSE'
  | 'HISTORICAL';

export type UserPlan = 'FREE' | 'PRO' | 'PREMIUM';

export type ConsensusLevel = 'NONE' | '1X' | '2X' | '3X' | '4X' | '5X';

export interface AssetSummary {
  ticker: string;
  yahooSymbol: string;
  name: string;
  shortName: string;
  market: Market;
  exchange: string;
  category: AssetCategory;
  sector: string;
  segment: string;
  currency: 'BRL' | 'USD';
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number | null;
  dayLow: number | null;
  high52w: number | null;
  low52w: number | null;
  volume: number | null;
  financialVolume: number | null;
  marketCap: number | null;
  logoUrl: string;
  freshness: QuoteFreshness;
  updatedAt: string;
  source: string;
  searchCount?: number;
}

export interface FundamentalIndicators {
  pe: number | null;
  pb: number | null;
  pEbitda: number | null;
  evEbitda: number | null;
  ps: number | null;
  pAssets: number | null;
  roe: number | null;
  roic: number | null;
  roa: number | null;
  netMargin: number | null;
  ebitdaMargin: number | null;
  ebitMargin: number | null;
  revenue: number | null;
  ebitda: number | null;
  ebit: number | null;
  netIncome: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  netDebt: number | null;
  netDebtToEbitda: number | null;
  currentRatio: number | null;
  dividendYield: number | null;
  payout: number | null;
  cagr5yRevenue: number | null;
  cagr5yEarnings: number | null;
  eps: number | null;
  bvps: number | null;
  freeCashFlow: number | null;
  fcfYield: number | null;
  pegRatio: number | null;
  earningsYield: number | null;
  sharesOutstanding: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  cashAndEquivalents: number | null;
  periodicity: 'ANNUAL' | 'TTM' | 'QUARTERLY';
  currency: 'BRL' | 'USD';
  unit: string;
  referenceDate: string;
  source: string;
}

export interface FinancialStatementPeriod {
  periodEnd: string;
  periodType: 'ANNUAL' | 'QUARTERLY';
  currency: 'BRL' | 'USD';
  revenue: number | null;
  ebit: number | null;
  ebitda: number | null;
  netIncome: number | null;
  netMargin: number | null;
  ebitdaMargin: number | null;
  totalAssets: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  cash: number | null;
  netDebt: number | null;
  operatingCashFlow: number | null;
  capex: number | null;
  freeCashFlow: number | null;
  dividendsPaid: number | null;
}

export interface DividendEvent {
  date: string;
  amount: number;
  currency: 'BRL' | 'USD';
  type: 'DIVIDEND' | 'JCP' | 'PROVENTO';
  isExtraordinary?: boolean;
}

export interface DividendIntelligence {
  currentYield: number | null;
  historicalAvgYield5y: number | null;
  annualDividendPerShare: number;
  recurringAnnualDividendPerShare: number;
  frequency: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'IRREGULAR';
  payout: number | null;
  dividendCagr5y: number | null;
  consistencyYears: number;
  sustainabilityScore: number;
  qualityTier: 'ELITE' | 'SOLIDA' | 'MODERADA' | 'ALERTA';
  yieldTrapWarning: string | null;
  events: DividendEvent[];
  upcomingCalendarEstimate: {
    estimatedMonth: string;
    historicalAmount: number;
  }[];
}

export interface ValuationParameters {
  bazinRate: number;
  targetPE: number;
  minMarginOfSafety: number;
  dcfWacc: number;
  dcfPerpetualGrowth: number;
  dcfBaseGrowth: number;
}

export interface ValuationMethodResult {
  method: 'BAZIN' | 'GRAHAM' | 'TARGET_PE' | 'DCF' | 'COMPARABLES';
  label: string;
  applicable: boolean;
  fairValue: number | null;
  discountPercent: number | null;
  approved: boolean;
  formulaNote: string;
  reasonIfInapplicable?: string;
  details: Record<string, string | number | null>;
}

export interface DcfScenario {
  name: 'CONSERVADOR' | 'BASE' | 'OTIMISTA';
  growthRate: number;
  wacc: number;
  perpetualGrowth: number;
  fairValue: number | null;
  discountPercent: number | null;
}

export interface QualityBreakdown {
  fundamentalsScore: number;
  debtScore: number;
  growthScore: number;
  earningsConsistencyScore: number;
  dividendSustainabilityScore: number;
  overallQuality: number;
  classification: 'EXCELENTE' | 'SOLIDA' | 'REGULAR' | 'FRAGIL';
}

export interface ValuationConsensusResult {
  ticker: string;
  price: number;
  currency: 'BRL' | 'USD';
  consensusCount: number;
  applicableCount: number;
  consensusLabel: ConsensusLevel;
  averageFairValue: number | null;
  averageDiscountPercent: number | null;
  marginOfSafetyTarget: number;
  methods: ValuationMethodResult[];
  dcfScenarios: DcfScenario[];
  dcfSensitivity: {
    waccValues: number[];
    growthValues: number[];
    matrix: (number | null)[][];
  };
  comparablesPeers: {
    ticker: string;
    name: string;
    pe: number | null;
    evEbitda: number | null;
    pb: number | null;
    ps: number | null;
    fcfYield: number | null;
  }[];
  quality: QualityBreakdown;
  calculatedAt: string;
  disclaimer: string;
}

export interface AutomatedFundamentalSummary {
  trend: 'EXPANSAO' | 'ESTABILIDADE' | 'DETERIORACAO' | 'INSUFICIENTE';
  positives: string[];
  risks: string[];
  notableChanges: string[];
  dataSourceNote: string;
}

export interface HistoricalBar {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicatorPoint {
  time: string;
  close: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema9: number | null;
  ema21: number | null;
  bbUpper: number | null;
  bbMiddle: number | null;
  bbLower: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  vwap: number | null;
}

export interface TechnicalSnapshot {
  ticker: string;
  range: string;
  interval: string;
  bars: HistoricalBar[];
  indicators: TechnicalIndicatorPoint[];
  supports: number[];
  resistances: number[];
  fibonacci: {
    high: number;
    low: number;
    levels: { label: string; price: number }[];
  } | null;
  summary: {
    trend: 'ALTA' | 'BAIXA' | 'LATERAL';
    volatilityAnnualized: number | null;
    latestRsi: number | null;
    rsiState: 'SOBRECOMPRADO' | 'SOBREVENDIDO' | 'NEUTRO' | 'INDISPONIVEL';
    note: string;
  };
}

export interface FullAssetAnalysis {
  asset: AssetSummary;
  profile: {
    description: string;
    website: string | null;
    employees: number | null;
    country: string;
    city: string | null;
    historyNote: string;
  };
  fundamentals: FundamentalIndicators;
  annualStatements: FinancialStatementPeriod[];
  quarterlyStatements: FinancialStatementPeriod[];
  dividends: DividendIntelligence;
  valuation: ValuationConsensusResult;
  automatedSummary: AutomatedFundamentalSummary;
}

export interface MacroBenchmark {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  unit: string;
  updatedAt: string;
  source: string;
  freshness: QuoteFreshness;
  history: { date: string; value: number }[];
}

export interface MacroOverview {
  ibovespa: MacroBenchmark;
  sp500: MacroBenchmark;
  nasdaq: MacroBenchmark;
  dowJones: MacroBenchmark;
  usdBrl: MacroBenchmark;
  cdiAnnual: number;
  selicAnnual: number;
  ipca12m: number;
  updatedAt: string;
}

export interface ProviderHealthStatus {
  id: string;
  name: string;
  configured: boolean;
  status: 'ONLINE' | 'DEGRADED' | 'STANDBY' | 'ERROR';
  lastSyncAt: string | null;
  avgLatencyMs: number | null;
  requestsToday: number;
  errorsToday: number;
  note: string;
}

export interface PortfolioTransactionRecord {
  id: string;
  userId: string;
  portfolioId: string;
  ticker: string;
  market: Market;
  assetType: AssetCategory;
  operationType:
    | 'BUY'
    | 'SELL'
    | 'SPLIT'
    | 'REVERSE_SPLIT'
    | 'BONUS'
    | 'AMORTIZATION'
    | 'DIVIDEND';
  quantity: number;
  unitPrice: number;
  fees: number;
  brokerage: number;
  fxRate: number;
  currency: 'BRL' | 'USD';
  date: string;
  notes?: string;
  splitRatio?: number;
}

export interface PortfolioPosition {
  ticker: string;
  market: Market;
  assetType: AssetCategory;
  sector: string;
  currency: 'BRL' | 'USD';
  quantity: number;
  avgPriceOriginal: number;
  avgPriceBRL: number;
  currentPriceOriginal: number;
  currentPriceBRL: number;
  totalCostOriginal: number;
  totalCostBRL: number;
  marketValueOriginal: number;
  marketValueBRL: number;
  dividendsReceivedBRL: number;
  unrealizedPnlOriginal: number;
  unrealizedPnlBRL: number;
  returnPctOriginal: number;
  returnPctBRL: number;
  returnWithDividendsPctBRL: number;
  fxContributionPct: number;
  weightPct: number;
  logoUrl: string;
}

export interface PortfolioAnalytics {
  totalInvestedBRL: number;
  totalMarketValueBRL: number;
  totalDividendsBRL: number;
  totalPnlBRL: number;
  totalReturnPctBRL: number;
  totalReturnWithDividendsPctBRL: number;
  twrPct: number;
  xirrPct: number | null;
  positions: PortfolioPosition[];
  bySector: { name: string; valueBRL: number; weightPct: number }[];
  byClass: { name: string; valueBRL: number; weightPct: number }[];
  byCountry: { name: string; valueBRL: number; weightPct: number }[];
  byCurrency: { name: string; valueBRL: number; weightPct: number }[];
  monthlyEvolution: {
    month: string;
    investedBRL: number;
    marketValueBRL: number;
    dividendsBRL: number;
    appreciationBRL: number;
    fxEffectBRL: number;
  }[];
}
