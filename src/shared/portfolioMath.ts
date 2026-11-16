import type {
  AssetSummary,
  PortfolioAnalytics,
  PortfolioPosition,
  PortfolioTransactionRecord,
} from './types.ts';

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00Z').getTime();
  const b = new Date(dateB + 'T00:00:00Z').getTime();
  return Math.max(0, (b - a) / 86400000);
}

/**
 * Newton-Raphson XIRR calculation on cashflows in BRL.
 * Negative cashflow = capital outflow (BUY + fees), positive = inflow (SELL, DIVIDEND, ending portfolio value).
 */
export function calculateXIRR(
  cashflows: { date: string; amount: number }[]
): number | null {
  if (cashflows.length < 2) return null;
  const sorted = [...cashflows].sort((a, b) => a.date.localeCompare(b.date));
  const hasNeg = sorted.some((c) => c.amount < 0);
  const hasPos = sorted.some((c) => c.amount > 0);
  if (!hasNeg || !hasPos) return null;

  const d0 = sorted[0].date;
  const years = sorted.map((c) => daysBetween(d0, c.date) / 365);
  if (years[years.length - 1] < 0.01) return null;

  let rate = 0.12;
  for (let iter = 0; iter < 60; iter++) {
    let npv = 0;
    let dNpv = 0;
    for (let i = 0; i < sorted.length; i++) {
      const t = years[i];
      const base = 1 + rate;
      if (base <= 0.0001) return null;
      const factor = Math.pow(base, t);
      npv += sorted[i].amount / factor;
      dNpv -= (t * sorted[i].amount) / (factor * base);
    }
    if (Math.abs(npv) < 1e-4) {
      return Number((rate * 100).toFixed(2));
    }
    if (Math.abs(dNpv) < 1e-8) break;
    const nextRate = rate - npv / dNpv;
    if (!Number.isFinite(nextRate) || nextRate <= -0.99 || nextRate > 20) break;
    rate = nextRate;
  }
  return Number.isFinite(rate) ? Number((rate * 100).toFixed(2)) : null;
}

export function computePortfolioAnalytics(
  transactions: PortfolioTransactionRecord[],
  quotesByTicker: Record<string, AssetSummary>,
  currentUsdBrl: number
): PortfolioAnalytics {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  interface LotState {
    ticker: string;
    market: 'BR' | 'US';
    assetType: PortfolioTransactionRecord['assetType'];
    currency: 'BRL' | 'USD';
    qty: number;
    costOriginal: number;
    costBRL: number;
    dividendsBRL: number;
  }

  const stateMap = new Map<string, LotState>();
  const cashflowsBRL: { date: string; amount: number }[] = [];

  for (const tx of sorted) {
    const key = tx.ticker.toUpperCase();
    const current = stateMap.get(key) ?? {
      ticker: key,
      market: tx.market,
      assetType: tx.assetType,
      currency: tx.currency,
      qty: 0,
      costOriginal: 0,
      costBRL: 0,
      dividendsBRL: 0,
    };

    const fx = tx.currency === 'USD' ? (tx.fxRate > 0 ? tx.fxRate : currentUsdBrl) : 1;
    const txFees = (tx.fees || 0) + (tx.brokerage || 0);

    if (tx.operationType === 'BUY') {
      const grossOrig = tx.quantity * tx.unitPrice + txFees;
      const grossBRL = grossOrig * fx;
      current.qty += tx.quantity;
      current.costOriginal += grossOrig;
      current.costBRL += grossBRL;
      cashflowsBRL.push({ date: tx.date, amount: -grossBRL });
    } else if (tx.operationType === 'SELL') {
      if (current.qty > 0) {
        const sellRatio = Math.min(1, tx.quantity / current.qty);
        current.costOriginal -= current.costOriginal * sellRatio;
        current.costBRL -= current.costBRL * sellRatio;
        current.qty = Math.max(0, current.qty - tx.quantity);
      }
      const proceedsBRL = (tx.quantity * tx.unitPrice - txFees) * fx;
      cashflowsBRL.push({ date: tx.date, amount: proceedsBRL });
    } else if (tx.operationType === 'SPLIT') {
      const ratio = tx.splitRatio && tx.splitRatio > 0 ? tx.splitRatio : 1;
      current.qty = current.qty * ratio;
    } else if (tx.operationType === 'REVERSE_SPLIT') {
      const ratio = tx.splitRatio && tx.splitRatio > 0 ? tx.splitRatio : 1;
      current.qty = current.qty / ratio;
    } else if (tx.operationType === 'BONUS') {
      current.qty += tx.quantity;
      const bonusValOrig = tx.quantity * tx.unitPrice;
      current.costOriginal += bonusValOrig;
      current.costBRL += bonusValOrig * fx;
    } else if (tx.operationType === 'AMORTIZATION') {
      const amortOrig = tx.quantity > 0 ? tx.quantity * tx.unitPrice : tx.unitPrice;
      const amortBRL = amortOrig * fx;
      current.costOriginal = Math.max(0, current.costOriginal - amortOrig);
      current.costBRL = Math.max(0, current.costBRL - amortBRL);
      cashflowsBRL.push({ date: tx.date, amount: amortBRL });
    } else if (tx.operationType === 'DIVIDEND') {
      const divBRL = (tx.quantity > 0 ? tx.quantity * tx.unitPrice : tx.unitPrice) * fx;
      current.dividendsBRL += divBRL;
      cashflowsBRL.push({ date: tx.date, amount: divBRL });
    }

    stateMap.set(key, current);
  }

  const positions: PortfolioPosition[] = [];
  let totalInvestedBRL = 0;
  let totalMarketValueBRL = 0;
  let totalDividendsBRL = 0;

  for (const st of stateMap.values()) {
    totalDividendsBRL += st.dividendsBRL;
    if (st.qty <= 1e-6) continue;

    const quote = quotesByTicker[st.ticker];
    const currentPriceOriginal = quote?.price ?? (st.costOriginal / st.qty);
    const fxNow = st.currency === 'USD' ? currentUsdBrl : 1;
    const currentPriceBRL = currentPriceOriginal * fxNow;
    const avgPriceOriginal = st.costOriginal / st.qty;
    const avgPriceBRL = st.costBRL / st.qty;
    const marketValueOriginal = st.qty * currentPriceOriginal;
    const marketValueBRL = st.qty * currentPriceBRL;

    const unrealizedPnlOriginal = marketValueOriginal - st.costOriginal;
    const unrealizedPnlBRL = marketValueBRL - st.costBRL;
    const returnPctOriginal =
      st.costOriginal > 0 ? (unrealizedPnlOriginal / st.costOriginal) * 100 : 0;
    const returnPctBRL = st.costBRL > 0 ? (unrealizedPnlBRL / st.costBRL) * 100 : 0;
    const returnWithDividendsPctBRL =
      st.costBRL > 0
        ? ((unrealizedPnlBRL + st.dividendsBRL) / st.costBRL) * 100
        : 0;
    const fxContributionPct =
      st.currency === 'USD' ? returnPctBRL - returnPctOriginal : 0;

    totalInvestedBRL += st.costBRL;
    totalMarketValueBRL += marketValueBRL;

    positions.push({
      ticker: st.ticker,
      market: st.market,
      assetType: st.assetType,
      sector: quote?.sector || 'Não classificado',
      currency: st.currency,
      quantity: Number(st.qty.toFixed(6)),
      avgPriceOriginal,
      avgPriceBRL,
      currentPriceOriginal,
      currentPriceBRL,
      totalCostOriginal: st.costOriginal,
      totalCostBRL: st.costBRL,
      marketValueOriginal,
      marketValueBRL,
      dividendsReceivedBRL: st.dividendsBRL,
      unrealizedPnlOriginal,
      unrealizedPnlBRL,
      returnPctOriginal,
      returnPctBRL,
      returnWithDividendsPctBRL,
      fxContributionPct,
      weightPct: 0,
      logoUrl: quote?.logoUrl || `/api/logos/${encodeURIComponent(st.ticker)}`,
    });
  }

  for (const pos of positions) {
    pos.weightPct =
      totalMarketValueBRL > 0 ? (pos.marketValueBRL / totalMarketValueBRL) * 100 : 0;
  }
  positions.sort((a, b) => b.marketValueBRL - a.marketValueBRL);

  const sectorMap = new Map<string, number>();
  const classMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const currencyMap = new Map<string, number>();

  for (const pos of positions) {
    sectorMap.set(pos.sector, (sectorMap.get(pos.sector) ?? 0) + pos.marketValueBRL);
    classMap.set(pos.assetType, (classMap.get(pos.assetType) ?? 0) + pos.marketValueBRL);
    const country = pos.market === 'BR' ? 'Brasil (B3)' : 'Estados Unidos';
    countryMap.set(country, (countryMap.get(country) ?? 0) + pos.marketValueBRL);
    currencyMap.set(pos.currency, (currencyMap.get(pos.currency) ?? 0) + pos.marketValueBRL);
  }

  const toAllocation = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([name, valueBRL]) => ({
        name,
        valueBRL,
        weightPct: totalMarketValueBRL > 0 ? (valueBRL / totalMarketValueBRL) * 100 : 0,
      }))
      .sort((a, b) => b.valueBRL - a.valueBRL);

  const totalPnlBRL = totalMarketValueBRL - totalInvestedBRL;
  const totalReturnPctBRL =
    totalInvestedBRL > 0 ? (totalPnlBRL / totalInvestedBRL) * 100 : 0;
  const totalReturnWithDividendsPctBRL =
    totalInvestedBRL > 0
      ? ((totalPnlBRL + totalDividendsBRL) / totalInvestedBRL) * 100
      : 0;

  // Build monthly evolution timeline separating contributions, appreciation, dividends, and FX effect
  const monthlyMap = new Map<
    string,
    { investedDelta: number; dividendsDelta: number }
  >();
  for (const tx of sorted) {
    const month = tx.date.slice(0, 7);
    const entry = monthlyMap.get(month) ?? { investedDelta: 0, dividendsDelta: 0 };
    const fx = tx.currency === 'USD' ? (tx.fxRate > 0 ? tx.fxRate : currentUsdBrl) : 1;
    const txFees = (tx.fees || 0) + (tx.brokerage || 0);
    if (tx.operationType === 'BUY') {
      entry.investedDelta += (tx.quantity * tx.unitPrice + txFees) * fx;
    } else if (tx.operationType === 'SELL') {
      entry.investedDelta -= (tx.quantity * tx.unitPrice - txFees) * fx;
    } else if (tx.operationType === 'DIVIDEND') {
      entry.dividendsDelta +=
        (tx.quantity > 0 ? tx.quantity * tx.unitPrice : tx.unitPrice) * fx;
    }
    monthlyMap.set(month, entry);
  }

  const months = Array.from(monthlyMap.keys()).sort();
  const todayMonth = new Date().toISOString().slice(0, 7);
  if (months.length > 0 && months[months.length - 1] !== todayMonth) {
    months.push(todayMonth);
  }

  let cumInvested = 0;
  let cumDividends = 0;
  const totalFxGainBRL = positions.reduce(
    (acc, p) =>
      acc +
      (p.currency === 'USD'
        ? p.marketValueBRL -
          p.marketValueOriginal * (p.totalCostBRL / Math.max(1e-6, p.totalCostOriginal))
        : 0),
    0
  );
  const totalAppreciationBRL = totalPnlBRL - totalFxGainBRL;

  // TWR (Time-Weighted Return) computed across contribution sub-periods
  let twrCompound = 1;
  let prevEndVal = 0;

  const monthlyEvolution = months.map((month, idx) => {
    const delta = monthlyMap.get(month) ?? { investedDelta: 0, dividendsDelta: 0 };
    const prevInvested = cumInvested;
    cumInvested = Math.max(0, cumInvested + delta.investedDelta);
    cumDividends += delta.dividendsDelta;
    const progress = months.length <= 1 ? 1 : (idx + 1) / months.length;
    const estAppreciation = totalAppreciationBRL * progress;
    const estFx = totalFxGainBRL * progress;
    const estMarketValue = Math.max(0, cumInvested + estAppreciation + estFx);

    if (idx === months.length - 1 && totalMarketValueBRL > 0) {
      const subDenom = prevEndVal + delta.investedDelta;
      if (subDenom > 0) {
        twrCompound *= (totalMarketValueBRL + delta.dividendsDelta) / subDenom;
      }
      return {
        month,
        investedBRL: totalInvestedBRL,
        marketValueBRL: totalMarketValueBRL,
        dividendsBRL: totalDividendsBRL,
        appreciationBRL: totalAppreciationBRL,
        fxEffectBRL: totalFxGainBRL,
      };
    }

    const subDenom = prevEndVal + delta.investedDelta;
    if (subDenom > 0 && prevInvested > 0) {
      twrCompound *= (estMarketValue + delta.dividendsDelta) / subDenom;
    }
    prevEndVal = estMarketValue;

    return {
      month,
      investedBRL: cumInvested,
      marketValueBRL: estMarketValue,
      dividendsBRL: cumDividends,
      appreciationBRL: estAppreciation,
      fxEffectBRL: estFx,
    };
  });

  const today = new Date().toISOString().slice(0, 10);
  if (totalMarketValueBRL > 0) {
    cashflowsBRL.push({ date: today, amount: totalMarketValueBRL });
  }
  const xirrPct = calculateXIRR(cashflowsBRL);
  const twrPct =
    months.length > 0 && totalInvestedBRL > 0
      ? Number(((twrCompound - 1) * 100).toFixed(2))
      : 0;

  return {
    totalInvestedBRL,
    totalMarketValueBRL,
    totalDividendsBRL,
    totalPnlBRL,
    totalReturnPctBRL,
    totalReturnWithDividendsPctBRL,
    twrPct,
    xirrPct,
    positions,
    bySector: toAllocation(sectorMap),
    byClass: toAllocation(classMap),
    byCountry: toAllocation(countryMap),
    byCurrency: toAllocation(currencyMap),
    monthlyEvolution,
  };
}
