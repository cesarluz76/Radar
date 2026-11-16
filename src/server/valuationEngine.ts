import type {
  AssetSummary,
  AutomatedFundamentalSummary,
  ConsensusLevel,
  DcfScenario,
  DividendEvent,
  DividendIntelligence,
  FinancialStatementPeriod,
  FullAssetAnalysis,
  FundamentalIndicators,
  QualityBreakdown,
  ValuationConsensusResult,
  ValuationMethodResult,
  ValuationParameters,
} from '../shared/types.ts';
import {
  extractStatements,
  fetchBrapiQuote,
  fetchOptionalProviderProfile,
  fetchSec10YearAnnuals,
  fetchYahooChart,
  fetchYahooQuoteSummary,
  getAssetSummary,
  providerCache,
  REAL_ASSET_CATALOG,
  resolveCatalogEntry,
  yNum,
} from './providers.ts';

export const DEFAULT_VALUATION_PARAMETERS: ValuationParameters = {
  bazinRate: 0.085,
  targetPE: 15,
  minMarginOfSafety: 10,
  dcfWacc: 0.11,
  dcfPerpetualGrowth: 0.03,
  dcfBaseGrowth: 0.06,
};

const SECTOR_DEFAULT_PE: Record<string, number> = {
  Energia: 9.5,
  'Materiais Básicos': 10.5,
  Financeiro: 10.0,
  'Utilidade Pública': 12.0,
  'Bens Industriais': 18.0,
  'Consumo Não Cíclico': 18.0,
  'Consumo Cíclico': 16.0,
  Saúde: 19.0,
  Tecnologia: 24.0,
  Comunicações: 16.0,
  'Real Estate': 14.0,
  'Fundos Imobiliários': 13.0,
};

function safeDiv(num: number | null, den: number | null): number | null {
  if (num == null || den == null || !Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return null;
  }
  return num / den;
}

function round(val: number | null, decimals = 2): number | null {
  if (val == null || !Number.isFinite(val)) return null;
  const f = Math.pow(10, decimals);
  return Math.round(val * f) / f;
}

function computeCagr(firstVal: number | null, lastVal: number | null, years: number): number | null {
  if (firstVal == null || lastVal == null || years <= 0 || firstVal <= 0 || lastVal <= 0) {
    return null;
  }
  return round((Math.pow(lastVal / firstVal, 1 / years) - 1) * 100, 2);
}

function buildDividendIntelligence(
  asset: AssetSummary,
  divEvents: DividendEvent[],
  payout: number | null,
  eps: number | null
): DividendIntelligence {
  const now = Date.now();
  const oneYearAgo = now - 365 * 86400000;
  const fiveYearsAgo = now - 5 * 365 * 86400000;

  const events12m = divEvents.filter((d) => new Date(d.date).getTime() >= oneYearAgo);
  const events5y = divEvents.filter((d) => new Date(d.date).getTime() >= fiveYearsAgo);

  // Identify extraordinary dividends (> 2.5x median individual payment over 5y)
  const amounts = events5y.map((e) => e.amount).sort((a, b) => a - b);
  const median = amounts.length > 0 ? amounts[Math.floor(amounts.length / 2)] : 0;
  const annotatedEvents = divEvents.map((e) => ({
    ...e,
    isExtraordinary: median > 0 && e.amount > median * 2.5,
  }));

  const annualDividendPerShare = round(
    events12m.reduce((acc, e) => acc + e.amount, 0),
    4
  ) ?? 0;

  const recurring12m = events12m.filter((e) => !(median > 0 && e.amount > median * 2.5));
  let recurringAnnualDividendPerShare =
    round(recurring12m.reduce((acc, e) => acc + e.amount, 0), 4) ?? 0;

  // Fallback to 3-year average annual recurring dividends if last 12m had only extraordinary
  if (recurringAnnualDividendPerShare === 0 && events5y.length > 0) {
    const byYear = new Map<string, number>();
    for (const e of events5y) {
      if (median > 0 && e.amount > median * 2.5) continue;
      const yr = e.date.slice(0, 4);
      byYear.set(yr, (byYear.get(yr) ?? 0) + e.amount);
    }
    const vals = Array.from(byYear.values());
    if (vals.length > 0) {
      recurringAnnualDividendPerShare =
        round(vals.reduce((a, b) => a + b, 0) / vals.length, 4) ?? 0;
    }
  }

  const currentYield =
    asset.price > 0 && annualDividendPerShare > 0
      ? round((annualDividendPerShare / asset.price) * 100, 2)
      : null;

  // Consistency across years
  const yearTotals = new Map<string, number>();
  for (const e of events5y) {
    const yr = e.date.slice(0, 4);
    yearTotals.set(yr, (yearTotals.get(yr) ?? 0) + e.amount);
  }
  const yearsList = Array.from(yearTotals.keys()).sort();
  const consistencyYears = yearsList.length;

  let dividendCagr5y: number | null = null;
  if (yearsList.length >= 2) {
    const firstYr = yearTotals.get(yearsList[0]) ?? 0;
    const lastYr = yearTotals.get(yearsList[yearsList.length - 1]) ?? 0;
    dividendCagr5y = computeCagr(firstYr, lastYr, yearsList.length - 1);
  }

  // Frequency detection
  const count12m = events12m.length;
  let frequency: DividendIntelligence['frequency'] = 'IRREGULAR';
  if (count12m >= 10) frequency = 'MENSAL';
  else if (count12m >= 4) frequency = 'TRIMESTRAL';
  else if (count12m >= 2) frequency = 'SEMESTRAL';
  else if (count12m === 1) frequency = 'ANUAL';

  const historicalAvgAnnual =
    yearsList.length > 0
      ? Array.from(yearTotals.values()).reduce((a, b) => a + b, 0) / yearsList.length
      : 0;
  const historicalAvgYield5y =
    asset.price > 0 && historicalAvgAnnual > 0
      ? round((historicalAvgAnnual / asset.price) * 100, 2)
      : null;

  // Yield-trap / price-drop distortion warning
  let yieldTrapWarning: string | null = null;
  const dropFrom52wHigh =
    asset.high52w && asset.high52w > 0
      ? ((asset.price - asset.high52w) / asset.high52w) * 100
      : 0;
  if (currentYield != null && currentYield > 10 && dropFrom52wHigh < -25) {
    yieldTrapWarning = `Alerta de Yield Distorcido: o ativo caiu ${Math.abs(dropFrom52wHigh).toFixed(1)}% frente à máxima de 52 semanas, elevando artificialmente o Dividend Yield. Verifique a sustentabilidade dos lucros.`;
  } else if (payout != null && payout > 100) {
    yieldTrapWarning = `Payout elevado (${payout.toFixed(1)}%): a distribuição supera o lucro líquido recente; risco de redução futura nos proventos.`;
  } else if (eps != null && eps <= 0 && annualDividendPerShare > 0) {
    yieldTrapWarning = 'Lucro por ação negativo ou nulo apesar de proventos recentes.';
  }

  let sustainabilityScore = 0;
  if (consistencyYears >= 5) sustainabilityScore += 35;
  else sustainabilityScore += consistencyYears * 6;
  if (payout != null && payout > 0 && payout <= 85) sustainabilityScore += 30;
  else if (payout != null && payout > 85 && payout <= 100) sustainabilityScore += 15;
  if (dividendCagr5y != null && dividendCagr5y > 0) sustainabilityScore += 20;
  if (!yieldTrapWarning) sustainabilityScore += 15;
  sustainabilityScore = Math.min(100, Math.max(0, sustainabilityScore));

  const qualityTier: DividendIntelligence['qualityTier'] =
    yieldTrapWarning && sustainabilityScore < 55
      ? 'ALERTA'
      : sustainabilityScore >= 80
        ? 'ELITE'
        : sustainabilityScore >= 55
          ? 'SOLIDA'
          : 'MODERADA';

  // Estimate upcoming payment months from historical cadence
  const monthStats = new Map<string, number[]>();
  for (const e of events5y) {
    const mm = e.date.slice(5, 7);
    const list = monthStats.get(mm) ?? [];
    list.push(e.amount);
    monthStats.set(mm, list);
  }
  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];
  const upcomingCalendarEstimate = Array.from(monthStats.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([mm, arr]) => ({
      estimatedMonth: monthNames[Math.max(0, parseInt(mm, 10) - 1)] || mm,
      historicalAmount: round(arr.reduce((x, y) => x + y, 0) / arr.length, 4) ?? 0,
    }));

  return {
    currentYield,
    historicalAvgYield5y,
    annualDividendPerShare,
    recurringAnnualDividendPerShare,
    frequency,
    payout,
    dividendCagr5y,
    consistencyYears,
    sustainabilityScore,
    qualityTier,
    yieldTrapWarning,
    events: annotatedEvents.slice(0, 40),
    upcomingCalendarEstimate,
  };
}

function buildDcfPrice(
  baseFcf: number,
  netDebt: number,
  shares: number,
  growthRate: number,
  wacc: number,
  perpetualGrowth: number
): number | null {
  if (
    !Number.isFinite(baseFcf) ||
    baseFcf <= 0 ||
    !Number.isFinite(shares) ||
    shares <= 0 ||
    wacc <= perpetualGrowth + 0.005
  ) {
    return null;
  }

  let pvFcf = 0;
  let fcf = baseFcf;
  for (let yr = 1; yr <= 5; yr++) {
    fcf = fcf * (1 + growthRate);
    pvFcf += fcf / Math.pow(1 + wacc, yr);
  }
  const terminalVal = (fcf * (1 + perpetualGrowth)) / (wacc - perpetualGrowth);
  const pvTerminal = terminalVal / Math.pow(1 + wacc, 5);
  const enterpriseValue = pvFcf + pvTerminal;
  const equityValue = enterpriseValue - (Number.isFinite(netDebt) ? netDebt : 0);
  if (equityValue <= 0) return null;
  return round(equityValue / shares, 2);
}

function buildQualityBreakdown(
  f: FundamentalIndicators,
  annuals: FinancialStatementPeriod[],
  div: DividendIntelligence
): QualityBreakdown {
  let fundamentalsScore = 0;
  if (f.roe != null && f.roe >= 15) fundamentalsScore += 35;
  else if (f.roe != null && f.roe >= 8) fundamentalsScore += 20;
  if (f.roic != null && f.roic >= 12) fundamentalsScore += 35;
  else if (f.roic != null && f.roic >= 7) fundamentalsScore += 20;
  if (f.netMargin != null && f.netMargin >= 12) fundamentalsScore += 30;
  else if (f.netMargin != null && f.netMargin >= 5) fundamentalsScore += 15;

  let debtScore = 50;
  if (f.netDebtToEbitda != null) {
    if (f.netDebtToEbitda <= 0) debtScore = 100;
    else if (f.netDebtToEbitda <= 1.5) debtScore = 85;
    else if (f.netDebtToEbitda <= 2.5) debtScore = 65;
    else if (f.netDebtToEbitda <= 3.5) debtScore = 40;
    else debtScore = 20;
  } else if (f.netDebt != null && f.netDebt < 0) {
    debtScore = 95;
  }

  let growthScore = 40;
  if (f.cagr5yRevenue != null && f.cagr5yRevenue >= 10) growthScore += 30;
  else if (f.cagr5yRevenue != null && f.cagr5yRevenue > 0) growthScore += 15;
  if (f.cagr5yEarnings != null && f.cagr5yEarnings >= 10) growthScore += 30;
  else if (f.cagr5yEarnings != null && f.cagr5yEarnings > 0) growthScore += 15;
  growthScore = Math.min(100, growthScore);

  const positiveYears = annuals.filter((a) => a.netIncome != null && a.netIncome > 0).length;
  const earningsConsistencyScore =
    annuals.length > 0 ? Math.round((positiveYears / annuals.length) * 100) : 50;

  const dividendSustainabilityScore = div.sustainabilityScore;

  const overallQuality = Math.round(
    fundamentalsScore * 0.3 +
      debtScore * 0.25 +
      growthScore * 0.15 +
      earningsConsistencyScore * 0.15 +
      dividendSustainabilityScore * 0.15
  );

  const classification: QualityBreakdown['classification'] =
    overallQuality >= 78
      ? 'EXCELENTE'
      : overallQuality >= 60
        ? 'SOLIDA'
        : overallQuality >= 42
          ? 'REGULAR'
          : 'FRAGIL';

  return {
    fundamentalsScore: Math.min(100, fundamentalsScore),
    debtScore,
    growthScore,
    earningsConsistencyScore,
    dividendSustainabilityScore,
    overallQuality,
    classification,
  };
}

function buildAutomatedSummary(
  asset: AssetSummary,
  f: FundamentalIndicators,
  annuals: FinancialStatementPeriod[],
  div: DividendIntelligence
): AutomatedFundamentalSummary {
  const positives: string[] = [];
  const risks: string[] = [];
  const notableChanges: string[] = [];

  if (f.roe != null) {
    if (f.roe >= 15) positives.push(`Retorno sobre patrimônio sólido (ROE de ${f.roe.toFixed(1)}%).`);
    else if (f.roe < 8) risks.push(`Retorno sobre patrimônio comprimido (ROE de ${f.roe.toFixed(1)}%).`);
  }
  if (f.roic != null && f.roic >= 12) {
    positives.push(`Eficiência de capital investido consistente (ROIC de ${f.roic.toFixed(1)}%).`);
  }
  if (f.netMargin != null) {
    if (f.netMargin >= 15) positives.push(`Margem líquida elevada de ${f.netMargin.toFixed(1)}%.`);
    else if (f.netMargin < 0) risks.push(`Operação apresentou prejuízo líquido no período recente (margem de ${f.netMargin.toFixed(1)}%).`);
  }
  if (f.netDebtToEbitda != null) {
    if (f.netDebtToEbitda <= 1.5) positives.push(`Alavancagem financeira confortável (Dívida Líquida/EBITDA de ${f.netDebtToEbitda.toFixed(2)}x).`);
    else if (f.netDebtToEbitda > 3.2) risks.push(`Endividamento elevado em relação à geração operacional (Dívida Líquida/EBITDA de ${f.netDebtToEbitda.toFixed(2)}x).`);
  } else if (f.netDebt != null && f.netDebt < 0) {
    positives.push('Posição de caixa líquido positivo (caixa supera a dívida total).');
  }

  if (f.freeCashFlow != null) {
    if (f.freeCashFlow > 0) positives.push(`Geração de fluxo de caixa livre positiva (FCF Yield de ${f.fcfYield != null ? f.fcfYield.toFixed(2) + '%' : 'positivo'}).`);
    else risks.push('Fluxo de caixa livre negativo no período reportado.');
  }

  if (div.yieldTrapWarning) {
    risks.push(div.yieldTrapWarning);
  } else if (div.currentYield != null && div.currentYield >= 5 && div.consistencyYears >= 4) {
    positives.push(`Histórico consistente de distribuição de proventos (${div.consistencyYears} anos consecutivos, DY de ${div.currentYield.toFixed(2)}%).`);
  }

  if (annuals.length >= 2) {
    const first = annuals[0];
    const last = annuals[annuals.length - 1];
    if (first.revenue && last.revenue) {
      const revDelta = ((last.revenue - first.revenue) / Math.abs(first.revenue)) * 100;
      notableChanges.push(
        `Receita acumulada ${revDelta >= 0 ? 'avançou' : 'recuou'} ${Math.abs(revDelta).toFixed(1)}% entre ${first.periodEnd.slice(0, 4)} e ${last.periodEnd.slice(0, 4)}.`
      );
    }
    if (first.netIncome != null && last.netIncome != null && first.netIncome !== 0) {
      const niDelta = ((last.netIncome - first.netIncome) / Math.abs(first.netIncome)) * 100;
      notableChanges.push(
        `Lucro líquido ${niDelta >= 0 ? 'cresceu' : 'retraiu'} ${Math.abs(niDelta).toFixed(1)}% no horizonte anual disponível.`
      );
    }
  }

  let trend: AutomatedFundamentalSummary['trend'] = 'ESTABILIDADE';
  if (annuals.length < 2 && f.revenue == null && f.netIncome == null) {
    trend = 'INSUFICIENTE';
  } else if (
    (f.cagr5yRevenue ?? f.revenueGrowth ?? 0) > 6 &&
    (f.netIncome ?? 0) > 0 &&
    risks.length <= positives.length
  ) {
    trend = 'EXPANSAO';
  } else if (risks.length > positives.length + 1 || (f.netIncome ?? 1) < 0) {
    trend = 'DETERIORACAO';
  }

  return {
    trend,
    positives: positives.length > 0 ? positives : ['Dados quantitativos básicos carregados; consulte os demonstrativos completos abaixo.'],
    risks: risks.length > 0 ? risks : ['Sem alertas críticos nos múltiplos disponíveis; acompanhe variações setoriais e trimestrais.'],
    notableChanges,
    dataSourceNote: `Resumo automatizado gerado estritamente a partir dos demonstrativos (${f.source}, ref. ${f.referenceDate}) para ${asset.ticker}.`,
  };
}

export async function analyzeAssetFull(
  rawTicker: string,
  overrideParams?: Partial<ValuationParameters>
): Promise<FullAssetAnalysis | null> {
  const params: ValuationParameters = {
    ...DEFAULT_VALUATION_PARAMETERS,
    ...overrideParams,
  };

  const entry = resolveCatalogEntry(rawTicker);
  const paramSig = JSON.stringify(params);
  const cacheKey = `full_analysis:${entry.ticker}:${paramSig}`;
  const cached = providerCache.get<FullAssetAnalysis>(cacheKey);
  if (cached) return cached;

  const [asset, qs, brapi, chart5y, secAnnuals, optExtra] = await Promise.all([
    getAssetSummary(entry.ticker),
    fetchYahooQuoteSummary(entry.yahooSymbol),
    entry.market === 'BR' ? fetchBrapiQuote(entry.ticker) : Promise.resolve(null),
    fetchYahooChart(entry.yahooSymbol, '5y', '1mo', true),
    entry.market === 'US' ? fetchSec10YearAnnuals(entry.ticker) : Promise.resolve([]),
    fetchOptionalProviderProfile(entry.ticker, entry.market),
  ]);

  if (!asset) return null;

  const summaryDetail = (qs?.summaryDetail as Record<string, unknown> | undefined) ?? {};
  const keyStats = (qs?.defaultKeyStatistics as Record<string, unknown> | undefined) ?? {};
  const finData = (qs?.financialData as Record<string, unknown> | undefined) ?? {};
  const profile = (qs?.assetProfile as Record<string, unknown> | undefined) ?? {};
  const priceMod = (qs?.price as Record<string, unknown> | undefined) ?? {};

  const brapiProfile = (brapi?.summaryProfile as Record<string, unknown> | undefined) ?? {};
  const brapiFin = (brapi?.financialData as Record<string, unknown> | undefined) ?? {};
  const brapiStats = (brapi?.defaultKeyStatistics as Record<string, unknown> | undefined) ?? {};

  // Update asset metadata with live profile/marketCap if available
  const marketCap =
    asset.marketCap ??
    yNum(priceMod.marketCap) ??
    yNum(summaryDetail.marketCap) ??
    optExtra?.marketCap ??
    null;
  if (marketCap != null) asset.marketCap = marketCap;

  const qsSector =
    (typeof profile.sector === 'string' && profile.sector) ||
    (typeof brapiProfile.sector === 'string' && brapiProfile.sector) ||
    asset.sector;
  if (qsSector && asset.sector === 'Não classificado') asset.sector = qsSector;

  const yahooAnnuals = extractStatements(qs, asset.currency, 'ANNUAL');
  const quarterlyStatements = extractStatements(qs, asset.currency, 'QUARTERLY');

  // Merge SEC 10-year statements with Yahoo annual statements for US companies
  const annualByYear = new Map<string, FinancialStatementPeriod>();
  for (const row of secAnnuals) annualByYear.set(row.periodEnd.slice(0, 4), row);
  for (const row of yahooAnnuals) {
    const yr = row.periodEnd.slice(0, 4);
    const prev = annualByYear.get(yr);
    annualByYear.set(yr, prev ? { ...prev, ...Object.fromEntries(Object.entries(row).filter(([, v]) => v != null)) } : row);
  }
  const annualStatements = Array.from(annualByYear.values()).sort((a, b) =>
    a.periodEnd.localeCompare(b.periodEnd)
  );
  const latestAnn = annualStatements[annualStatements.length - 1];

  // Calculate core raw financial primitives strictly from real sources
  const sharesOutstanding =
    yNum(keyStats.sharesOutstanding) ??
    yNum(brapiStats.sharesOutstanding) ??
    safeDiv(marketCap, asset.price);

  const revenue = yNum(finData.totalRevenue) ?? yNum(brapiFin.totalRevenue) ?? latestAnn?.revenue ?? null;
  const ebitda = yNum(finData.ebitda) ?? yNum(brapiFin.ebitda) ?? latestAnn?.ebitda ?? null;
  const ebit = latestAnn?.ebit ?? (ebitda != null ? ebitda * 0.85 : null);
  const netIncome =
    yNum(keyStats.netIncomeToCommon) ??
    latestAnn?.netIncome ??
    (revenue != null && yNum(finData.profitMargins) != null
      ? revenue * (yNum(finData.profitMargins) as number)
      : null);

  const eps =
    (typeof brapi?.earningsPerShare === 'number' ? brapi.earningsPerShare : null) ??
    yNum(keyStats.trailingEps) ??
    optExtra?.eps ??
    safeDiv(netIncome, sharesOutstanding);

  const bvps =
    yNum(keyStats.bookValue) ??
    yNum(brapiStats.bookValue) ??
    safeDiv(latestAnn?.totalEquity ?? null, sharesOutstanding);

  const totalEquity =
    latestAnn?.totalEquity ??
    (bvps != null && sharesOutstanding != null ? bvps * sharesOutstanding : null);

  const totalCash =
    yNum(finData.totalCash) ?? yNum(brapiFin.totalCash) ?? latestAnn?.cash ?? null;
  const totalDebt =
    yNum(finData.totalDebt) ?? yNum(brapiFin.totalDebt) ?? latestAnn?.totalDebt ?? null;
  const netDebt =
    totalDebt != null && totalCash != null
      ? totalDebt - totalCash
      : latestAnn?.netDebt ?? null;

  const ev =
    yNum(keyStats.enterpriseValue) ??
    (marketCap != null && netDebt != null ? marketCap + netDebt : null);

  const freeCashFlow =
    yNum(finData.freeCashflow) ??
    yNum(brapiFin.freeCashflow) ??
    latestAnn?.freeCashFlow ??
    null;

  // Derived ratios computed from raw primitives
  const pe =
    (typeof brapi?.priceEarnings === 'number' ? brapi.priceEarnings : null) ??
    yNum(summaryDetail.trailingPE) ??
    optExtra?.pe ??
    (eps != null && eps > 0 ? safeDiv(asset.price, eps) : null);
  const pb =
    yNum(keyStats.priceToBook) ??
    (bvps != null && bvps > 0 ? safeDiv(asset.price, bvps) : null);
  const pEbitda =
    marketCap != null && ebitda != null && ebitda > 0
      ? round(marketCap / ebitda, 2)
      : null;
  const evEbitda =
    yNum(keyStats.enterpriseToEbitda) ??
    (ev != null && ebitda != null && ebitda > 0 ? round(ev / ebitda, 2) : null);
  const ps =
    yNum(summaryDetail.priceToSalesTrailing12Months) ??
    (marketCap != null && revenue != null && revenue > 0 ? round(marketCap / revenue, 2) : null);
  const pAssets =
    marketCap != null && latestAnn?.totalAssets && latestAnn.totalAssets > 0
      ? round(marketCap / latestAnn.totalAssets, 2)
      : null;

  const roeRaw = yNum(finData.returnOnEquity) ?? yNum(brapiFin.returnOnEquity);
  const roe =
    roeRaw != null
      ? round(roeRaw * 100, 2)
      : round(safeDiv(netIncome, totalEquity) != null ? (safeDiv(netIncome, totalEquity) as number) * 100 : null, 2);

  const roaRaw = yNum(finData.returnOnAssets) ?? yNum(brapiFin.returnOnAssets);
  const roa =
    roaRaw != null
      ? round(roaRaw * 100, 2)
      : round(safeDiv(netIncome, latestAnn?.totalAssets ?? null) != null ? (safeDiv(netIncome, latestAnn?.totalAssets ?? null) as number) * 100 : null, 2);

  const investedCapital =
    totalEquity != null && netDebt != null ? totalEquity + Math.max(0, netDebt) : null;
  const roic =
    ebit != null && investedCapital != null && investedCapital > 0
      ? round(((ebit * 0.7) / investedCapital) * 100, 2)
      : null;

  const netMarginRaw = yNum(finData.profitMargins);
  const netMargin =
    netMarginRaw != null
      ? round(netMarginRaw * 100, 2)
      : round(safeDiv(netIncome, revenue) != null ? (safeDiv(netIncome, revenue) as number) * 100 : null, 2);

  const ebitdaMarginRaw = yNum(finData.ebitdaMargins);
  const ebitdaMargin =
    ebitdaMarginRaw != null
      ? round(ebitdaMarginRaw * 100, 2)
      : round(safeDiv(ebitda, revenue) != null ? (safeDiv(ebitda, revenue) as number) * 100 : null, 2);

  const ebitMarginRaw = yNum(finData.operatingMargins);
  const ebitMargin =
    ebitMarginRaw != null
      ? round(ebitMarginRaw * 100, 2)
      : round(safeDiv(ebit, revenue) != null ? (safeDiv(ebit, revenue) as number) * 100 : null, 2);

  const revenueGrowthRaw = yNum(finData.revenueGrowth);
  const earningsGrowthRaw = yNum(finData.earningsGrowth);
  const revenueGrowth = revenueGrowthRaw != null ? round(revenueGrowthRaw * 100, 2) : null;
  const earningsGrowth = earningsGrowthRaw != null ? round(earningsGrowthRaw * 100, 2) : null;

  const netDebtToEbitda =
    netDebt != null && ebitda != null && ebitda > 0
      ? round(netDebt / ebitda, 2)
      : null;
  const currentRatio = round(yNum(finData.currentRatio) ?? yNum(brapiFin.currentRatio), 2);

  // Merge Brapi cash dividends if present with Yahoo chart dividends
  const yahooDivs = chart5y?.dividends ?? [];
  const brapiCashDivs = (
    (brapi?.dividendsData as { cashDividends?: Array<Record<string, unknown>> } | undefined)
      ?.cashDividends ?? []
  )
    .filter((d) => typeof d.rate === 'number' && typeof d.paymentDate === 'string')
    .map((d) => ({
      date: String(d.paymentDate).slice(0, 10),
      amount: Number(d.rate),
      currency: asset.currency,
      type: String(d.label || '').includes('JCP') ? ('JCP' as const) : ('DIVIDEND' as const),
    }));
  const divEvents = brapiCashDivs.length > yahooDivs.length ? brapiCashDivs : yahooDivs;

  const payoutRaw = yNum(summaryDetail.payoutRatio);
  const payout = payoutRaw != null ? round(payoutRaw * 100, 2) : null;

  const dividends = buildDividendIntelligence(asset, divEvents, payout, eps);
  const dividendYield =
    dividends.currentYield ??
    (yNum(summaryDetail.dividendYield) != null
      ? round((yNum(summaryDetail.dividendYield) as number) * 100, 2)
      : null);

  const cagr5yRevenue =
    annualStatements.length >= 2
      ? computeCagr(
          annualStatements[0].revenue,
          annualStatements[annualStatements.length - 1].revenue,
          annualStatements.length - 1
        )
      : null;
  const cagr5yEarnings =
    annualStatements.length >= 2
      ? computeCagr(
          annualStatements[0].netIncome,
          annualStatements[annualStatements.length - 1].netIncome,
          annualStatements.length - 1
        )
      : null;

  const fcfYield =
    freeCashFlow != null && marketCap != null && marketCap > 0
      ? round((freeCashFlow / marketCap) * 100, 2)
      : null;
  const earningsYield = pe != null && pe > 0 ? round((1 / pe) * 100, 2) : null;
  const pegRatio =
    yNum(keyStats.pegRatio) ??
    (pe != null && earningsGrowth != null && earningsGrowth > 0
      ? round(pe / earningsGrowth, 2)
      : null);

  const fundamentals: FundamentalIndicators = {
    pe: round(pe, 2),
    pb: round(pb, 2),
    pEbitda,
    evEbitda,
    ps,
    pAssets,
    roe,
    roic,
    roa,
    netMargin,
    ebitdaMargin,
    ebitMargin,
    revenue,
    ebitda,
    ebit,
    netIncome,
    revenueGrowth,
    earningsGrowth,
    netDebt,
    netDebtToEbitda,
    currentRatio,
    dividendYield,
    payout:
      payout ??
      (eps != null && eps > 0 && dividends.annualDividendPerShare > 0
        ? round((dividends.annualDividendPerShare / eps) * 100, 2)
        : null),
    cagr5yRevenue,
    cagr5yEarnings,
    eps: round(eps, 2),
    bvps: round(bvps, 2),
    freeCashFlow,
    fcfYield,
    pegRatio,
    earningsYield,
    sharesOutstanding,
    totalEquity,
    totalDebt,
    cashAndEquivalents: totalCash,
    periodicity: 'TTM',
    currency: asset.currency,
    unit: 'Unidade absoluta (Moeda original)',
    referenceDate: latestAnn?.periodEnd ?? asset.updatedAt.slice(0, 10),
    source: [
      brapi ? 'Brapi B3' : null,
      qs ? 'Yahoo Finance Statements' : null,
      secAnnuals.length > 0 ? 'SEC EDGAR XBRL' : null,
      optExtra?.provider ?? null,
    ]
      .filter(Boolean)
      .join(' + ') || asset.source,
  };

  // --- 5 INDEPENDENT VALUATION METHODS ---
  const minMoS = params.minMarginOfSafety;

  // METHOD 1: TETO BAZIN
  const bazinApplicable = dividends.recurringAnnualDividendPerShare > 0 && params.bazinRate > 0;
  const bazinFair = bazinApplicable
    ? round(dividends.recurringAnnualDividendPerShare / params.bazinRate, 2)
    : null;
  const bazinDiscount =
    bazinFair != null && asset.price > 0
      ? round((bazinFair / asset.price - 1) * 100, 2)
      : null;
  const bazinMethod: ValuationMethodResult = {
    method: 'BAZIN',
    label: 'Teto Bazin',
    applicable: bazinApplicable,
    fairValue: bazinFair,
    discountPercent: bazinDiscount,
    approved: bazinApplicable && bazinDiscount != null && bazinDiscount >= minMoS,
    formulaNote: `Dividendo Recorrente Anual / Taxa Bazin (${(params.bazinRate * 100).toFixed(1)}%)`,
    reasonIfInapplicable: bazinApplicable
      ? undefined
      : 'Ativo sem histórico recorrente de dividendos suficientes nos últimos anos.',
    details: {
      dividendoRecorrente: dividends.recurringAnnualDividendPerShare,
      dividendoBruto12m: dividends.annualDividendPerShare,
      taxaBazinPct: round(params.bazinRate * 100, 2),
    },
  };

  // METHOD 2: PREÇO JUSTO GRAHAM = sqrt(22.5 * LPA * VPA)
  const grahamApplicable =
    fundamentals.eps != null &&
    fundamentals.eps > 0 &&
    fundamentals.bvps != null &&
    fundamentals.bvps > 0;
  const grahamFair = grahamApplicable
    ? round(Math.sqrt(22.5 * (fundamentals.eps as number) * (fundamentals.bvps as number)), 2)
    : null;
  const grahamDiscount =
    grahamFair != null && asset.price > 0
      ? round((grahamFair / asset.price - 1) * 100, 2)
      : null;
  const grahamMethod: ValuationMethodResult = {
    method: 'GRAHAM',
    label: 'Preço Justo Graham',
    applicable: grahamApplicable,
    fairValue: grahamFair,
    discountPercent: grahamDiscount,
    approved: grahamApplicable && grahamDiscount != null && grahamDiscount >= minMoS,
    formulaNote: '√(22,5 × LPA × VPA)',
    reasonIfInapplicable: grahamApplicable
      ? undefined
      : fundamentals.eps == null || fundamentals.bvps == null
        ? 'LPA ou VPA indisponíveis na fonte.'
        : 'Não aplicável: LPA ou VPA negativo/nulo.',
    details: {
      lpa: fundamentals.eps,
      vpa: fundamentals.bvps,
    },
  };

  // METHOD 3: P/L ALVO
  const sectorPeRef = SECTOR_DEFAULT_PE[asset.sector] ?? params.targetPE;
  const effectiveTargetPE = overrideParams?.targetPE ?? sectorPeRef;
  const targetPeApplicable = fundamentals.eps != null && fundamentals.eps > 0 && effectiveTargetPE > 0;
  const targetPeFair = targetPeApplicable
    ? round((fundamentals.eps as number) * effectiveTargetPE, 2)
    : null;
  const targetPeDiscount =
    targetPeFair != null && asset.price > 0
      ? round((targetPeFair / asset.price - 1) * 100, 2)
      : null;
  const targetPeMethod: ValuationMethodResult = {
    method: 'TARGET_PE',
    label: 'P/L Alvo',
    applicable: targetPeApplicable,
    fairValue: targetPeFair,
    discountPercent: targetPeDiscount,
    approved: targetPeApplicable && targetPeDiscount != null && targetPeDiscount >= minMoS,
    formulaNote: `LPA × P/L de referência (${effectiveTargetPE.toFixed(1)}x)`,
    reasonIfInapplicable: targetPeApplicable
      ? undefined
      : 'LPA negativo, nulo ou ausente para projeção por múltiplo.',
    details: {
      lpa: fundamentals.eps,
      plReferencia: effectiveTargetPE,
      plAtual: fundamentals.pe,
    },
  };

  // METHOD 4: DCF (Fluxo de Caixa Descontado)
  const dcfBaseGrowth =
    overrideParams?.dcfBaseGrowth ??
    (fundamentals.cagr5yRevenue != null
      ? Math.max(0.02, Math.min(0.14, fundamentals.cagr5yRevenue / 100))
      : params.dcfBaseGrowth);
  const dcfApplicable =
    fundamentals.freeCashFlow != null &&
    fundamentals.freeCashFlow > 0 &&
    fundamentals.sharesOutstanding != null &&
    fundamentals.sharesOutstanding > 0;
  const dcfFair = dcfApplicable
    ? buildDcfPrice(
        fundamentals.freeCashFlow as number,
        fundamentals.netDebt ?? 0,
        fundamentals.sharesOutstanding as number,
        dcfBaseGrowth,
        params.dcfWacc,
        params.dcfPerpetualGrowth
      )
    : null;
  const dcfDiscount =
    dcfFair != null && asset.price > 0
      ? round((dcfFair / asset.price - 1) * 100, 2)
      : null;

  const dcfScenarios: DcfScenario[] = dcfApplicable
    ? (['CONSERVADOR', 'BASE', 'OTIMISTA'] as const).map((sc) => {
        const gMod = sc === 'CONSERVADOR' ? -0.025 : sc === 'OTIMISTA' ? 0.025 : 0;
        const wMod = sc === 'CONSERVADOR' ? 0.015 : sc === 'OTIMISTA' ? -0.01 : 0;
        const gRate = Math.max(0.01, dcfBaseGrowth + gMod);
        const wRate = Math.max(params.dcfPerpetualGrowth + 0.02, params.dcfWacc + wMod);
        const fv = buildDcfPrice(
          fundamentals.freeCashFlow as number,
          fundamentals.netDebt ?? 0,
          fundamentals.sharesOutstanding as number,
          gRate,
          wRate,
          params.dcfPerpetualGrowth
        );
        return {
          name: sc,
          growthRate: round(gRate * 100, 1) ?? 0,
          wacc: round(wRate * 100, 1) ?? 0,
          perpetualGrowth: round(params.dcfPerpetualGrowth * 100, 1) ?? 0,
          fairValue: fv,
          discountPercent:
            fv != null && asset.price > 0 ? round((fv / asset.price - 1) * 100, 2) : null,
        };
      })
    : [];

  const waccGrid = [params.dcfWacc - 0.02, params.dcfWacc - 0.01, params.dcfWacc, params.dcfWacc + 0.01, params.dcfWacc + 0.02]
    .map((v) => Number(Math.max(0.05, v).toFixed(4)));
  const growthGrid = [0.02, 0.025, 0.03, 0.035, 0.04];
  const dcfSensitivity = {
    waccValues: waccGrid.map((v) => round(v * 100, 1) ?? 0),
    growthValues: growthGrid.map((v) => round(v * 100, 1) ?? 0),
    matrix: waccGrid.map((w) =>
      growthGrid.map((pg) =>
        dcfApplicable
          ? buildDcfPrice(
              fundamentals.freeCashFlow as number,
              fundamentals.netDebt ?? 0,
              fundamentals.sharesOutstanding as number,
              dcfBaseGrowth,
              w,
              pg
            )
          : null
      )
    ),
  };

  const dcfMethod: ValuationMethodResult = {
    method: 'DCF',
    label: 'Fluxo de Caixa Descontado (DCF)',
    applicable: dcfApplicable && dcfFair != null,
    fairValue: dcfFair,
    discountPercent: dcfDiscount,
    approved:
      dcfApplicable && dcfFair != null && dcfDiscount != null && dcfDiscount >= minMoS,
    formulaNote: `FCF 5 anos + Perpetuidade (WACC ${(params.dcfWacc * 100).toFixed(1)}%, g ${(params.dcfPerpetualGrowth * 100).toFixed(1)}%)`,
    reasonIfInapplicable: dcfApplicable
      ? undefined
      : 'Fluxo de caixa livre negativo ou número de ações indisponível.',
    details: {
      freeCashFlow: fundamentals.freeCashFlow,
      waccPct: round(params.dcfWacc * 100, 2),
      crescimentoBasePct: round(dcfBaseGrowth * 100, 2),
      perpetuidadePct: round(params.dcfPerpetualGrowth * 100, 2),
    },
  };

  // METHOD 5: MÚLTIPLOS COMPARÁVEIS (same-sector peers)
  const sectorPeersCatalog = REAL_ASSET_CATALOG.filter(
    (c) =>
      c.sector === asset.sector &&
      c.ticker !== asset.ticker &&
      c.category === asset.category
  ).slice(0, 4);

  const peerAnalyses: Array<{
    ticker: string;
    name: string;
    pe: number | null;
    evEbitda: number | null;
    pb: number | null;
    ps: number | null;
    fcfYield: number | null;
  }> = [];

  for (const peer of sectorPeersCatalog) {
    const peerQs = providerCache.get<Record<string, unknown>>(`y_qs:${peer.yahooSymbol}`);
    const peerPrice = providerCache.get<AssetSummary>(`summary:${peer.ticker}`)?.price ?? null;
    const pStats = (peerQs?.defaultKeyStatistics as Record<string, unknown> | undefined) ?? {};
    const pDetail = (peerQs?.summaryDetail as Record<string, unknown> | undefined) ?? {};
    const pFin = (peerQs?.financialData as Record<string, unknown> | undefined) ?? {};
    const pPe = yNum(pDetail.trailingPE);
    const pPb = yNum(pStats.priceToBook);
    const pEvEb = yNum(pStats.enterpriseToEbitda);
    const pPs = yNum(pDetail.priceToSalesTrailing12Months);
    const pFcf = yNum(pFin.freeCashflow);
    const pMcap = yNum(pDetail.marketCap) ?? (peerPrice && yNum(pStats.sharesOutstanding) ? peerPrice * (yNum(pStats.sharesOutstanding) as number) : null);
    peerAnalyses.push({
      ticker: peer.ticker,
      name: peer.name,
      pe: round(pPe, 2),
      evEbitda: round(pEvEb, 2),
      pb: round(pPb, 2),
      ps: round(pPs, 2),
      fcfYield: pFcf && pMcap && pMcap > 0 ? round((pFcf / pMcap) * 100, 2) : null,
    });
  }

  // Compute implied fair value from sector multiples (prioritize live peer medians if >=2 peers loaded, else sector median benchmark multiples)
  const validPeerPes = peerAnalyses.map((p) => p.pe).filter((v): v is number => v != null && v > 0 && v < 80);
  const validPeerPbs = peerAnalyses.map((p) => p.pb).filter((v): v is number => v != null && v > 0 && v < 25);
  const refPeerPe =
    validPeerPes.length >= 2
      ? validPeerPes.sort((a, b) => a - b)[Math.floor(validPeerPes.length / 2)]
      : sectorPeRef;
  const refPeerPb =
    validPeerPbs.length >= 2
      ? validPeerPbs.sort((a, b) => a - b)[Math.floor(validPeerPbs.length / 2)]
      : asset.sector === 'Financeiro'
        ? 1.4
        : asset.sector === 'Tecnologia'
          ? 5.0
          : 2.0;

  const compEstimates: number[] = [];
  if (fundamentals.eps != null && fundamentals.eps > 0) {
    compEstimates.push(fundamentals.eps * refPeerPe);
  }
  if (fundamentals.bvps != null && fundamentals.bvps > 0) {
    compEstimates.push(fundamentals.bvps * refPeerPb);
  }
  const compApplicable = compEstimates.length > 0;
  const compFair = compApplicable
    ? round(compEstimates.reduce((a, b) => a + b, 0) / compEstimates.length, 2)
    : null;
  const compDiscount =
    compFair != null && asset.price > 0
      ? round((compFair / asset.price - 1) * 100, 2)
      : null;

  const compMethod: ValuationMethodResult = {
    method: 'COMPARABLES',
    label: 'Múltiplos Comparáveis',
    applicable: compApplicable,
    fairValue: compFair,
    discountPercent: compDiscount,
    approved: compApplicable && compDiscount != null && compDiscount >= minMoS,
    formulaNote: `Múltiplos do setor ${asset.sector} (P/L ${refPeerPe.toFixed(1)}x e P/VP ${refPeerPb.toFixed(1)}x)`,
    reasonIfInapplicable: compApplicable
      ? undefined
      : 'Dados de LPA e VPA ausentes ou negativos para comparação setorial.',
    details: {
      setor: asset.sector,
      plSetorialRef: round(refPeerPe, 2),
      pvpSetorialRef: round(refPeerPb, 2),
      paresConsultados: peerAnalyses.length,
    },
  };

  const methods = [bazinMethod, grahamMethod, targetPeMethod, dcfMethod, compMethod];
  const applicableMethods = methods.filter((m) => m.applicable && m.fairValue != null);
  const approvedMethods = methods.filter((m) => m.approved);
  const consensusCount = approvedMethods.length;
  const applicableCount = applicableMethods.length;

  // Strictly never award 5X if any of the 5 methods cannot be calculated
  const consensusLabel: ConsensusLevel =
    consensusCount === 5 && applicableCount === 5
      ? '5X'
      : consensusCount >= 4
        ? '4X'
        : consensusCount === 3
          ? '3X'
          : consensusCount === 2
            ? '2X'
            : consensusCount === 1
              ? '1X'
              : 'NONE';

  const averageFairValue =
    applicableMethods.length > 0
      ? round(
          applicableMethods.reduce((acc, m) => acc + (m.fairValue ?? 0), 0) /
            applicableMethods.length,
          2
        )
      : null;
  const averageDiscountPercent =
    averageFairValue != null && asset.price > 0
      ? round((averageFairValue / asset.price - 1) * 100, 2)
      : null;

  const quality = buildQualityBreakdown(fundamentals, annualStatements, dividends);
  const valuation: ValuationConsensusResult = {
    ticker: asset.ticker,
    price: asset.price,
    currency: asset.currency,
    consensusCount,
    applicableCount,
    consensusLabel,
    averageFairValue,
    averageDiscountPercent,
    marginOfSafetyTarget: minMoS,
    methods,
    dcfScenarios,
    dcfSensitivity,
    comparablesPeers: peerAnalyses,
    quality,
    calculatedAt: new Date().toISOString(),
    disclaimer:
      'Convergência matemática entre modelos quantitativos de valuation; não constitui garantia de valorização ou recomendação individualizada.',
  };

  const automatedSummary = buildAutomatedSummary(
    asset,
    fundamentals,
    annualStatements,
    dividends
  );

  const full: FullAssetAnalysis = {
    asset,
    profile: {
      description:
        (typeof profile.longBusinessSummary === 'string' && profile.longBusinessSummary) ||
        (typeof brapiProfile.longBusinessSummary === 'string' && brapiProfile.longBusinessSummary) ||
        `${asset.name} atua no setor de ${asset.sector} (${asset.segment}), listada na ${asset.exchange}.`,
      website:
        (typeof profile.website === 'string' && profile.website) ||
        (typeof brapiProfile.website === 'string' && brapiProfile.website) ||
        null,
      employees: yNum(profile.fullTimeEmployees) ?? yNum(brapiProfile.fullTimeEmployees),
      country:
        (typeof profile.country === 'string' && profile.country) ||
        (asset.market === 'BR' ? 'Brasil' : 'Estados Unidos'),
      city: typeof profile.city === 'string' ? profile.city : null,
      historyNote:
        annualStatements.length > 0
          ? `Histórico financeiro disponível desde ${annualStatements[0].periodEnd.slice(0, 4)} (${annualStatements.length} exercícios anuais).`
          : 'Dados corporativos carregados dos provedores integrados.',
    },
    fundamentals,
    annualStatements,
    quarterlyStatements,
    dividends,
    valuation,
    automatedSummary,
  };

  providerCache.set(cacheKey, full, 120_000);
  return full;
}

export interface ScreenerEntry {
  asset: AssetSummary;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  roic: number | null;
  netDebtToEbitda: number | null;
  revenueGrowth: number | null;
  dividendYield: number | null;
  payout: number | null;
  dividendCagr5y: number | null;
  consistencyYears: number;
  dividendQualityTier: DividendIntelligence['qualityTier'];
  yieldTrapWarning: string | null;
  averageFairValue: number | null;
  discountPercent: number | null;
  consensusCount: number;
  consensusLabel: ConsensusLevel;
  overallQuality: number;
  approvedMethods: string[];
}

export async function buildRadarScreenerUniverse(
  overrideParams?: Partial<ValuationParameters>
): Promise<ScreenerEntry[]> {
  const params = { ...DEFAULT_VALUATION_PARAMETERS, ...overrideParams };
  const cacheKey = `radar_screener:${JSON.stringify(params)}`;
  const cached = providerCache.get<ScreenerEntry[]>(cacheKey);
  if (cached) return cached;

  // Analyze core stock/FII/REIT universe in controlled batches
  const targets = REAL_ASSET_CATALOG.filter((c) => c.category !== 'INDEX');
  const results: ScreenerEntry[] = [];
  const batchSize = 8;

  for (let i = 0; i < targets.length; i += batchSize) {
    const slice = targets.slice(i, i + batchSize);
    const analyses = await Promise.all(
      slice.map((t) => analyzeAssetFull(t.ticker, params).catch(() => null))
    );
    for (const a of analyses) {
      if (!a) continue;
      results.push({
        asset: a.asset,
        pe: a.fundamentals.pe,
        pb: a.fundamentals.pb,
        roe: a.fundamentals.roe,
        roic: a.fundamentals.roic,
        netDebtToEbitda: a.fundamentals.netDebtToEbitda,
        revenueGrowth: a.fundamentals.revenueGrowth,
        dividendYield: a.fundamentals.dividendYield,
        payout: a.fundamentals.payout,
        dividendCagr5y: a.dividends.dividendCagr5y,
        consistencyYears: a.dividends.consistencyYears,
        dividendQualityTier: a.dividends.qualityTier,
        yieldTrapWarning: a.dividends.yieldTrapWarning,
        averageFairValue: a.valuation.averageFairValue,
        discountPercent: a.valuation.averageDiscountPercent,
        consensusCount: a.valuation.consensusCount,
        consensusLabel: a.valuation.consensusLabel,
        overallQuality: a.valuation.quality.overallQuality,
        approvedMethods: a.valuation.methods
          .filter((m) => m.approved)
          .map((m) => m.label),
      });
    }
  }

  providerCache.set(cacheKey, results, 120_000);
  return results;
}
