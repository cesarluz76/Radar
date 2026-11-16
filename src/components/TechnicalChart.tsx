import React, { useEffect, useMemo, useState } from 'react';
import type { TechnicalSnapshot } from '../shared/types.ts';
import { formatCurrency, formatCompact, formatNumber } from '../utils/formatters.ts';

interface TechnicalChartProps {
  ticker: string;
  currency?: 'BRL' | 'USD';
}

const RANGES = [
  { id: '1d', label: '1D' },
  { id: '5d', label: '5D' },
  { id: '1mo', label: '1M' },
  { id: '3mo', label: '3M' },
  { id: '6mo', label: '6M' },
  { id: '1y', label: '1A' },
  { id: '5y', label: '5A' },
  { id: 'max', label: 'Máx' },
];

export const TechnicalChart: React.FC<TechnicalChartProps> = ({
  ticker,
  currency = 'BRL',
}) => {
  const [range, setRange] = useState('6mo');
  const [chartMode, setChartMode] = useState<'CANDLE' | 'LINE'>('CANDLE');
  const [snapshot, setSnapshot] = useState<TechnicalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const [overlays, setOverlays] = useState({
    sma20: true,
    sma50: true,
    sma200: false,
    ema9: false,
    ema21: false,
    bollinger: false,
    vwap: true,
    sr: true,
    fibonacci: false,
    rsi: true,
    macd: false,
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/assets/${encodeURIComponent(ticker)}/technical?range=${range}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: TechnicalSnapshot | null) => {
        if (active) {
          setSnapshot(data);
          setHoverIdx(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ticker, range]);

  const toggle = (key: keyof typeof overlays) =>
    setOverlays((prev) => ({ ...prev, [key]: !prev[key] }));

  const geom = useMemo(() => {
    if (!snapshot || snapshot.bars.length === 0) return null;
    const bars = snapshot.bars.slice(-140);
    const inds = snapshot.indicators.slice(-140);
    const w = 960;
    const h = 340;
    const padL = 12;
    const padR = 72;
    const padT = 16;
    const padB = 26;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    let minP = Math.min(...bars.map((b) => b.low));
    let maxP = Math.max(...bars.map((b) => b.high));
    if (overlays.bollinger) {
      for (const ind of inds) {
        if (ind.bbLower != null) minP = Math.min(minP, ind.bbLower);
        if (ind.bbUpper != null) maxP = Math.max(maxP, ind.bbUpper);
      }
    }
    const padSpan = Math.max(0.01, (maxP - minP) * 0.06);
    minP -= padSpan;
    maxP += padSpan;
    const span = maxP - minP;

    const xAt = (i: number) =>
      padL + ((i + 0.5) / Math.max(1, bars.length)) * plotW;
    const yAt = (p: number) => padT + ((maxP - p) / span) * plotH;
    const candleW = Math.max(2, Math.min(9, (plotW / bars.length) * 0.65));

    const maxVol = Math.max(1, ...bars.map((b) => b.volume));

    const buildPath = (getter: (i: number) => number | null) => {
      let d = '';
      for (let i = 0; i < inds.length; i++) {
        const val = getter(i);
        if (val == null) continue;
        d += `${d ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(val).toFixed(1)} `;
      }
      return d;
    };

    return {
      bars,
      inds,
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      plotW,
      plotH,
      minP,
      maxP,
      xAt,
      yAt,
      candleW,
      maxVol,
      buildPath,
    };
  }, [snapshot, overlays.bollinger]);

  const activeBar =
    geom && hoverIdx != null
      ? geom.bars[hoverIdx]
      : geom
        ? geom.bars[geom.bars.length - 1]
        : null;
  const activeInd =
    geom && hoverIdx != null
      ? geom.inds[hoverIdx]
      : geom
        ? geom.inds[geom.inds.length - 1]
        : null;

  return (
    <div className="terminal-glass rounded-xl p-4 lg:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-800">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
                range === r.id
                  ? 'bg-emerald-500 text-[#060913] font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-800">
            <button
              type="button"
              onClick={() => setChartMode('CANDLE')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                chartMode === 'CANDLE'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Candles
            </button>
            <button
              type="button"
              onClick={() => setChartMode('LINE')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                chartMode === 'LINE'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Linha
            </button>
          </div>
        </div>
      </div>

      {/* Indicator toggles */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {(
          [
            ['sma20', 'SMA 20'],
            ['sma50', 'SMA 50'],
            ['sma200', 'SMA 200'],
            ['ema9', 'EMA 9'],
            ['ema21', 'EMA 21'],
            ['bollinger', 'Bollinger'],
            ['vwap', 'VWAP'],
            ['sr', 'Suporte / Resistência'],
            ['fibonacci', 'Fibonacci'],
            ['rsi', 'RSI (14)'],
            ['macd', 'MACD'],
          ] as Array<[keyof typeof overlays, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`px-2.5 py-1 rounded-md border text-xs transition-colors whitespace-nowrap ${
              overlays[key]
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* OHLCV Hover Telemetry Line */}
      {activeBar && (
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 border-y border-slate-800/70 py-2">
          <span className="text-slate-400">{activeBar.time}</span>
          <span>A: {formatCurrency(activeBar.open, currency)}</span>
          <span>M: {formatCurrency(activeBar.high, currency)}</span>
          <span>m: {formatCurrency(activeBar.low, currency)}</span>
          <span>F: <strong className="text-white">{formatCurrency(activeBar.close, currency)}</strong></span>
          <span>Vol: {formatCompact(activeBar.volume)}</span>
          {activeInd?.rsi14 != null && (
            <span className="text-amber-300">RSI: {formatNumber(activeInd.rsi14, 1)}</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="h-[340px] rounded-xl bg-slate-900/50 animate-pulse flex items-center justify-center text-xs text-slate-500">
          Carregando série histórica e indicadores técnicos...
        </div>
      ) : !geom || !snapshot ? (
        <div className="h-[260px] rounded-xl bg-slate-900/40 flex items-center justify-center text-xs text-slate-400">
          Histórico de cotações indisponível para este intervalo no provedor.
        </div>
      ) : (
        <div className="space-y-3">
          <svg
            viewBox={`0 0 ${geom.w} ${geom.h}`}
            className="w-full h-auto bg-[#070B17] rounded-xl border border-slate-800/80"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Horizontal Price Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const p = geom.minP + (geom.maxP - geom.minP) * t;
              const y = geom.yAt(p);
              return (
                <g key={t}>
                  <line
                    x1={geom.padL}
                    y1={y}
                    x2={geom.w - geom.padR}
                    y2={y}
                    stroke="rgba(148,163,184,0.09)"
                    strokeWidth="1"
                  />
                  <text
                    x={geom.w - geom.padR + 6}
                    y={y + 3}
                    fill="#94A3B8"
                    fontSize="10"
                    fontFamily="JetBrains Mono"
                  >
                    {p.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Support & Resistance Levels */}
            {overlays.sr &&
              snapshot.supports.map((s) => (
                <line
                  key={`sup-${s}`}
                  x1={geom.padL}
                  y1={geom.yAt(s)}
                  x2={geom.w - geom.padR}
                  y2={geom.yAt(s)}
                  stroke="rgba(16, 185, 129, 0.45)"
                  strokeDasharray="5 4"
                  strokeWidth="1"
                />
              ))}
            {overlays.sr &&
              snapshot.resistances.map((r) => (
                <line
                  key={`res-${r}`}
                  x1={geom.padL}
                  y1={geom.yAt(r)}
                  x2={geom.w - geom.padR}
                  y2={geom.yAt(r)}
                  stroke="rgba(244, 63, 94, 0.45)"
                  strokeDasharray="5 4"
                  strokeWidth="1"
                />
              ))}

            {/* Fibonacci Levels */}
            {overlays.fibonacci &&
              snapshot.fibonacci?.levels.map((lv) => (
                <g key={lv.label}>
                  <line
                    x1={geom.padL}
                    y1={geom.yAt(lv.price)}
                    x2={geom.w - geom.padR}
                    y2={geom.yAt(lv.price)}
                    stroke="rgba(245, 158, 11, 0.35)"
                    strokeDasharray="2 3"
                    strokeWidth="1"
                  />
                  <text
                    x={geom.padL + 6}
                    y={geom.yAt(lv.price) - 3}
                    fill="#FBBF24"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                  >
                    {lv.label} ({lv.price.toFixed(2)})
                  </text>
                </g>
              ))}

            {/* Volume Histogram (Bottom 18% of chart) */}
            {geom.bars.map((b, i) => {
              const vh = (b.volume / geom.maxVol) * (geom.plotH * 0.18);
              const y = geom.padT + geom.plotH - vh;
              const isUp = b.close >= b.open;
              return (
                <rect
                  key={`vol-${i}`}
                  x={geom.xAt(i) - geom.candleW / 2}
                  y={y}
                  width={geom.candleW}
                  height={Math.max(1, vh)}
                  fill={isUp ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}
                />
              );
            })}

            {/* Bollinger Bands */}
            {overlays.bollinger && (
              <>
                <path
                  d={geom.buildPath((i) => geom.inds[i]?.bbUpper ?? null)}
                  fill="none"
                  stroke="rgba(148,163,184,0.5)"
                  strokeWidth="1"
                />
                <path
                  d={geom.buildPath((i) => geom.inds[i]?.bbLower ?? null)}
                  fill="none"
                  stroke="rgba(148,163,184,0.5)"
                  strokeWidth="1"
                />
              </>
            )}

            {/* Price Candles or Line */}
            {chartMode === 'CANDLE' ? (
              geom.bars.map((b, i) => {
                const x = geom.xAt(i);
                const isUp = b.close >= b.open;
                const color = isUp ? '#10B981' : '#F43F5E';
                const topBody = geom.yAt(Math.max(b.open, b.close));
                const botBody = geom.yAt(Math.min(b.open, b.close));
                return (
                  <g key={`c-${i}`}>
                    <line
                      x1={x}
                      y1={geom.yAt(b.high)}
                      x2={x}
                      y2={geom.yAt(b.low)}
                      stroke={color}
                      strokeWidth="1.1"
                    />
                    <rect
                      x={x - geom.candleW / 2}
                      y={topBody}
                      width={geom.candleW}
                      height={Math.max(1.5, botBody - topBody)}
                      fill={color}
                      rx="0.5"
                    />
                  </g>
                );
              })
            ) : (
              <path
                d={geom.buildPath((i) => geom.bars[i]?.close ?? null)}
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
              />
            )}

            {/* Moving Averages & VWAP */}
            {overlays.sma20 && (
              <path d={geom.buildPath((i) => geom.inds[i]?.sma20 ?? null)} fill="none" stroke="#F59E0B" strokeWidth="1.3" />
            )}
            {overlays.sma50 && (
              <path d={geom.buildPath((i) => geom.inds[i]?.sma50 ?? null)} fill="none" stroke="#38BDF8" strokeWidth="1.3" />
            )}
            {overlays.sma200 && (
              <path d={geom.buildPath((i) => geom.inds[i]?.sma200 ?? null)} fill="none" stroke="#A78BFA" strokeWidth="1.3" />
            )}
            {overlays.ema9 && (
              <path d={geom.buildPath((i) => geom.inds[i]?.ema9 ?? null)} fill="none" stroke="#2DD4BF" strokeWidth="1.2" />
            )}
            {overlays.ema21 && (
              <path d={geom.buildPath((i) => geom.inds[i]?.ema21 ?? null)} fill="none" stroke="#FB923C" strokeWidth="1.2" />
            )}
            {overlays.vwap && (
              <path d={geom.buildPath((i) => geom.inds[i]?.vwap ?? null)} fill="none" stroke="#E879F9" strokeWidth="1.3" />
            )}

            {/* Hover vertical guide & interactive hit strips */}
            {hoverIdx != null && (
              <line
                x1={geom.xAt(hoverIdx)}
                y1={geom.padT}
                x2={geom.xAt(hoverIdx)}
                y2={geom.padT + geom.plotH}
                stroke="rgba(226,232,240,0.35)"
                strokeDasharray="3 3"
              />
            )}
            {geom.bars.map((_, i) => (
              <rect
                key={`hit-${i}`}
                x={geom.xAt(i) - geom.plotW / geom.bars.length / 2}
                y={geom.padT}
                width={geom.plotW / geom.bars.length}
                height={geom.plotH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            ))}
          </svg>

          {/* RSI Subchart */}
          {overlays.rsi && (
            <div className="rounded-lg bg-[#070B17] border border-slate-800/80 p-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>RSI (14) — Sobrecompra 70 / Sobrevenda 30</span>
                <span>
                  Atual:{' '}
                  <strong className="text-amber-300">
                    {snapshot.summary.latestRsi != null
                      ? snapshot.summary.latestRsi.toFixed(1)
                      : '—'}
                  </strong>
                </span>
              </div>
              <svg viewBox="0 0 960 72" className="w-full h-16">
                <line x1="12" y1="21" x2="888" y2="21" stroke="rgba(244,63,94,0.3)" strokeDasharray="3 3" />
                <line x1="12" y1="50" x2="888" y2="50" stroke="rgba(16,185,129,0.3)" strokeDasharray="3 3" />
                <path
                  d={(() => {
                    let d = '';
                    geom.inds.forEach((ind, i) => {
                      if (ind.rsi14 == null) return;
                      const y = 6 + ((100 - ind.rsi14) / 100) * 60;
                      d += `${d ? 'L' : 'M'}${geom.xAt(i).toFixed(1)},${y.toFixed(1)} `;
                    });
                    return d;
                  })()}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          )}

          {/* MACD Subchart */}
          {overlays.macd && (
            <div className="rounded-lg bg-[#070B17] border border-slate-800/80 p-3">
              <div className="text-[11px] font-mono text-slate-400 mb-1">
                MACD (12, 26, 9)
              </div>
              <svg viewBox="0 0 960 72" className="w-full h-16">
                <line x1="12" y1="36" x2="888" y2="36" stroke="rgba(148,163,184,0.2)" />
                {(() => {
                  const vals = geom.inds
                    .map((i) => i.macd ?? 0)
                    .concat(geom.inds.map((i) => i.macdSignal ?? 0));
                  const maxAbs = Math.max(0.01, ...vals.map((v) => Math.abs(v)));
                  const yM = (v: number) => 36 - (v / maxAbs) * 28;
                  let d1 = '';
                  let d2 = '';
                  geom.inds.forEach((ind, i) => {
                    const x = geom.xAt(i).toFixed(1);
                    if (ind.macd != null) d1 += `${d1 ? 'L' : 'M'}${x},${yM(ind.macd).toFixed(1)} `;
                    if (ind.macdSignal != null) d2 += `${d2 ? 'L' : 'M'}${x},${yM(ind.macdSignal).toFixed(1)} `;
                  });
                  return (
                    <>
                      <path d={d1} fill="none" stroke="#38BDF8" strokeWidth="1.4" />
                      <path d={d2} fill="none" stroke="#F59E0B" strokeWidth="1.2" />
                    </>
                  );
                })()}
              </svg>
            </div>
          )}

          {/* Automated Technical Diagnostic */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-3.5 text-xs space-y-1.5">
            <div className="flex flex-wrap items-center gap-4 font-mono">
              <span>
                Tendência: <strong className={snapshot.summary.trend === 'ALTA' ? 'text-emerald-400' : snapshot.summary.trend === 'BAIXA' ? 'text-rose-400' : 'text-amber-300'}>{snapshot.summary.trend}</strong>
              </span>
              <span>
                Volatilidade Anual: <strong className="text-slate-100">{snapshot.summary.volatilityAnnualized != null ? `${snapshot.summary.volatilityAnnualized}%` : '—'}</strong>
              </span>
              <span>
                RSI: <strong className="text-slate-100">{snapshot.summary.rsiState}</strong>
              </span>
              {snapshot.supports.length > 0 && (
                <span>
                  Suportes: <strong className="text-emerald-300">{snapshot.supports.join(' · ')}</strong>
                </span>
              )}
              {snapshot.resistances.length > 0 && (
                <span>
                  Resistências: <strong className="text-rose-300">{snapshot.resistances.join(' · ')}</strong>
                </span>
              )}
            </div>
            <p className="text-slate-400">{snapshot.summary.note}</p>
          </div>
        </div>
      )}
    </div>
  );
};
