import type {
  HistoricalBar,
  TechnicalIndicatorPoint,
  TechnicalSnapshot,
} from '../shared/types.ts';
import { fetchYahooChart, resolveCatalogEntry } from './providers.ts';

function computeSma(values: number[], period: number, idx: number): number | null {
  if (idx + 1 < period) return null;
  let sum = 0;
  for (let i = idx - period + 1; i <= idx; i++) sum += values[i];
  return Number((sum / period).toFixed(2));
}

function computeEmaSeries(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let ema =
    values.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
  out[period - 1] = Number(ema.toFixed(2));
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = Number(ema.toFixed(2));
  }
  return out;
}

function computeRsiSeries(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : Number((100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : Number((100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
  }
  return out;
}

export async function getTechnicalSnapshot(
  rawTicker: string,
  range = '6mo'
): Promise<TechnicalSnapshot | null> {
  const entry = resolveCatalogEntry(rawTicker);

  const rangeMap: Record<string, { range: string; interval: string; intraday: boolean }> = {
    '1d': { range: '1d', interval: '5m', intraday: true },
    '5d': { range: '5d', interval: '15m', intraday: true },
    '1mo': { range: '1mo', interval: '1d', intraday: false },
    '3mo': { range: '3mo', interval: '1d', intraday: false },
    '6mo': { range: '6mo', interval: '1d', intraday: false },
    '1y': { range: '1y', interval: '1d', intraday: false },
    '5y': { range: '5y', interval: '1wk', intraday: false },
    max: { range: 'max', interval: '1mo', intraday: false },
  };
  const cfg = rangeMap[range] ?? rangeMap['6mo'];

  const chart = await fetchYahooChart(
    entry.yahooSymbol,
    cfg.range,
    cfg.interval,
    false
  );
  if (!chart || chart.bars.length === 0) return null;

  const bars: HistoricalBar[] = chart.bars;
  const closes = bars.map((b) => b.close);
  const ema9 = computeEmaSeries(closes, 9);
  const ema12 = computeEmaSeries(closes, 12);
  const ema21 = computeEmaSeries(closes, 21);
  const ema26 = computeEmaSeries(closes, 26);
  const rsi14 = computeRsiSeries(closes, 14);

  // MACD line and Signal(9)
  const macdLine: (number | null)[] = closes.map((_, i) =>
    ema12[i] != null && ema26[i] != null
      ? Number(((ema12[i] as number) - (ema26[i] as number)).toFixed(3))
      : null
  );
  const validMacd = macdLine.map((v) => v ?? 0);
  const firstMacdIdx = macdLine.findIndex((v) => v != null);
  const macdSignal: (number | null)[] = new Array(closes.length).fill(null);
  if (firstMacdIdx >= 0 && closes.length - firstMacdIdx >= 9) {
    const subEma = computeEmaSeries(validMacd.slice(firstMacdIdx), 9);
    for (let i = 0; i < subEma.length; i++) {
      macdSignal[firstMacdIdx + i] = subEma[i];
    }
  }

  let cumPV = 0;
  let cumVol = 0;

  const indicators = bars.map((b, i) => {
    const sma20 = computeSma(closes, 20, i);
    const sma50 = computeSma(closes, 50, i);
    const sma200 = computeSma(closes, 200, i);

    let bbUpper: number | null = null;
    let bbLower: number | null = null;
    if (sma20 != null) {
      const slice = closes.slice(i - 19, i + 1);
      const variance =
        slice.reduce((acc, v) => acc + Math.pow(v - sma20, 2), 0) / 20;
      const std = Math.sqrt(variance);
      bbUpper = Number((sma20 + 2 * std).toFixed(2));
      bbLower = Number((sma20 - 2 * std).toFixed(2));
    }

    let vwap: number | null = null;
    if (cfg.intraday && b.volume > 0) {
      const typical = (b.high + b.low + b.close) / 3;
      cumPV += typical * b.volume;
      cumVol += b.volume;
      vwap = cumVol > 0 ? Number((cumPV / cumVol).toFixed(2)) : null;
    }

    const macdVal = macdLine[i];
    const sigVal = macdSignal[i];
    const macdHistogram =
      macdVal != null && sigVal != null
        ? Number((macdVal - sigVal).toFixed(3))
        : null;

    return {
      time: b.time,
      close: b.close,
      sma20,
      sma50,
      sma200,
      ema9: ema9[i],
      ema21: ema21[i],
      bbUpper,
      bbMiddle: sma20,
      bbLower,
      rsi14: rsi14[i],
      macd: macdVal,
      macdSignal: sigVal,
      macdHistogram,
      vwap,
    };
  });

  // Supports & resistances from swing pivots in recent window
  const recent = bars.slice(-90);
  const swingLows: number[] = [];
  const swingHighs: number[] = [];
  for (let i = 2; i < recent.length - 2; i++) {
    if (
      recent[i].low <= recent[i - 1].low &&
      recent[i].low <= recent[i - 2].low &&
      recent[i].low <= recent[i + 1].low &&
      recent[i].low <= recent[i + 2].low
    ) {
      swingLows.push(Number(recent[i].low.toFixed(2)));
    }
    if (
      recent[i].high >= recent[i - 1].high &&
      recent[i].high >= recent[i - 2].high &&
      recent[i].high >= recent[i + 1].high &&
      recent[i].high >= recent[i + 2].high
    ) {
      swingHighs.push(Number(recent[i].high.toFixed(2)));
    }
  }
  const latestPrice = closes[closes.length - 1];
  const supports = Array.from(new Set(swingLows.filter((v) => v < latestPrice)))
    .sort((a, b) => b - a)
    .slice(0, 3);
  const resistances = Array.from(new Set(swingHighs.filter((v) => v > latestPrice)))
    .sort((a, b) => a - b)
    .slice(0, 3);

  const high = Math.max(...recent.map((b) => b.high));
  const low = Math.min(...recent.map((b) => b.low));
  const span = high - low;
  const fibonacci =
    span > 0
      ? {
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          levels: [
            { label: '0.0% (Topo)', price: Number(high.toFixed(2)) },
            { label: '23.6%', price: Number((high - span * 0.236).toFixed(2)) },
            { label: '38.2%', price: Number((high - span * 0.382).toFixed(2)) },
            { label: '50.0%', price: Number((high - span * 0.5).toFixed(2)) },
            { label: '61.8%', price: Number((high - span * 0.618).toFixed(2)) },
            { label: '100.0% (Fundo)', price: Number(low.toFixed(2)) },
          ],
        }
      : null;

  // Annualized volatility from log returns
  let volatilityAnnualized: number | null = null;
  if (!cfg.intraday && closes.length >= 21) {
    const rets: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > 0 && closes[i - 1] > 0) {
        rets.push(Math.log(closes[i] / closes[i - 1]));
      }
    }
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const varDaily =
      rets.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / Math.max(1, rets.length - 1);
    const periodsPerYear = cfg.interval === '1wk' ? 52 : cfg.interval === '1mo' ? 12 : 252;
    volatilityAnnualized = Number((Math.sqrt(varDaily * periodsPerYear) * 100).toFixed(2));
  }

  const lastInd = indicators[indicators.length - 1];
  const latestRsi = lastInd?.rsi14 ?? null;
  const rsiState =
    latestRsi == null
      ? 'INDISPONIVEL'
      : latestRsi >= 70
        ? 'SOBRECOMPRADO'
        : latestRsi <= 30
          ? 'SOBREVENDIDO'
          : 'NEUTRO';

  let trend: TechnicalSnapshot['summary']['trend'] = 'LATERAL';
  if (lastInd?.sma20 != null && lastInd?.sma50 != null) {
    if (latestPrice > lastInd.sma20 && lastInd.sma20 > lastInd.sma50) trend = 'ALTA';
    else if (latestPrice < lastInd.sma20 && lastInd.sma20 < lastInd.sma50) trend = 'BAIXA';
  } else if (closes.length >= 10) {
    const pct = (latestPrice - closes[0]) / closes[0];
    if (pct > 0.04) trend = 'ALTA';
    else if (pct < -0.04) trend = 'BAIXA';
  }

  return {
    ticker: entry.ticker,
    range: cfg.range,
    interval: cfg.interval,
    bars,
    indicators,
    supports,
    resistances,
    fibonacci,
    summary: {
      trend,
      volatilityAnnualized,
      latestRsi,
      rsiState,
      note:
        'Leitura quantitativa descritiva de médias móveis, RSI, volatilidade e regiões históricas de preço. Indicadores técnicos não constituem garantia de movimentos futuros.',
    },
  };
}
