import React, { useMemo, useState } from 'react';
import type { ScreenerEntry } from '../server/valuationEngine.ts';
import { formatCurrency, formatPercent } from '../utils/formatters.ts';

interface RadarSonarCanvasProps {
  items: ScreenerEntry[];
  onSelectAsset: (ticker: string) => void;
}

export const RadarSonarCanvas: React.FC<RadarSonarCanvasProps> = ({
  items,
  onSelectAsset,
}) => {
  const [hovered, setHovered] = useState<ScreenerEntry | null>(null);

  // Map items onto polar coordinates:
  // Radius = closer to center means higher valuation discount (center = >= 45% discount)
  // Angle = deterministic spread across sectors
  const blips = useMemo(() => {
    const sectors = Array.from(new Set(items.map((i) => i.asset.sector))).sort();
    return items.slice(0, 48).map((item, idx) => {
      const sectorIdx = Math.max(0, sectors.indexOf(item.asset.sector));
      const sectorCount = Math.max(1, sectors.length);
      const baseAngle = (sectorIdx / sectorCount) * Math.PI * 2;
      const jitter = ((idx * 37) % 100) / 100 - 0.5;
      const angle = baseAngle + jitter * (Math.PI / Math.max(3, sectorCount));

      const disc = item.discountPercent ?? -10;
      const clampedDisc = Math.max(-20, Math.min(55, disc));
      // Higher discount => closer to center (radius 36..210)
      const norm = (55 - clampedDisc) / 75;
      const radius = 34 + norm * 172;

      const cx = 250 + Math.cos(angle) * radius;
      const cy = 250 + Math.sin(angle) * radius;

      const is5x = item.consensusLabel === '5X';
      const is4x = item.consensusLabel === '4X';
      const is3x = item.consensusLabel === '3X';

      const fill = is5x
        ? '#F59E0B'
        : is4x
          ? '#34D399'
          : is3x
            ? '#10B981'
            : disc > 0
              ? '#64748B'
              : '#475569';

      const size = is5x ? 6.5 : is4x ? 5.5 : is3x ? 4.8 : 3.5;

      return { item, cx, cy, fill, size };
    });
  }, [items]);

  return (
    <div className="relative flex flex-col items-center">
      <svg
        viewBox="0 0 500 500"
        className="w-full max-w-[490px] aspect-square select-none"
        role="img"
        aria-label="Radar Sonar de oportunidades de valuation"
      >
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.14)" />
            <stop offset="55%" stopColor="rgba(15, 23, 42, 0.55)" />
            <stop offset="100%" stopColor="rgba(6, 9, 19, 0.96)" />
          </radialGradient>
          <linearGradient id="sweepBeam" x1="50%" y1="50%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.38)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
          </linearGradient>
        </defs>

        <circle cx="250" cy="250" r="222" fill="url(#radarBg)" stroke="rgba(148,163,184,0.18)" strokeWidth="1" />

        {/* Concentric Discount Rings */}
        {[55, 110, 165, 220].map((r, i) => (
          <circle
            key={r}
            cx="250"
            cy="250"
            r={r}
            fill="none"
            stroke={i === 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.18)'}
            strokeDasharray={i % 2 === 1 ? '4 4' : undefined}
            strokeWidth="1"
          />
        ))}

        {/* Crosshair Axes */}
        <line x1="28" y1="250" x2="472" y2="250" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
        <line x1="250" y1="28" x2="250" y2="472" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />

        {/* Ring Discount Labels */}
        <text x="255" y="198" fill="#F59E0B" fontSize="9" fontFamily="JetBrains Mono">+40% Desc.</text>
        <text x="255" y="143" fill="#10B981" fontSize="9" fontFamily="JetBrains Mono">+25% Desc.</text>
        <text x="255" y="88" fill="#94A3B8" fontSize="9" fontFamily="JetBrains Mono">+10% Desc.</text>

        {/* Animated Sweeping Beam */}
        <g className="animate-radar-sweep" style={{ transformOrigin: '250px 250px' }}>
          <path
            d="M250 250 L250 28 A222 222 0 0 1 407 93 Z"
            fill="url(#sweepBeam)"
          />
          <line
            x1="250"
            y1="250"
            x2="250"
            y2="28"
            stroke="rgba(16, 185, 129, 0.65)"
            strokeWidth="1.4"
          />
        </g>

        {/* Luminous Asset Blips */}
        {blips.map(({ item, cx, cy, fill, size }) => {
          const isHigh = item.consensusCount >= 3;
          return (
            <g
              key={item.asset.ticker}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(item)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectAsset(item.asset.ticker)}
            >
              {isHigh && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={size + 4.5}
                  fill={fill}
                  fillOpacity="0.18"
                />
              )}
              <circle
                cx={cx}
                cy={cy}
                r={size}
                fill={fill}
                stroke="#060913"
                strokeWidth="1.2"
              />
              {(isHigh || hovered?.asset.ticker === item.asset.ticker) && (
                <text
                  x={cx + size + 4}
                  y={cy + 3}
                  fill="#F8FAFC"
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="JetBrains Mono"
                >
                  {item.asset.ticker}
                </text>
              )}
            </g>
          );
        })}

        <circle cx="250" cy="250" r="3.5" fill="#F59E0B" />
      </svg>

      {/* Interactive Tooltip / Legend Footer */}
      <div className="w-full mt-2 min-h-[56px] rounded-xl bg-slate-900/75 border border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {hovered ? (
          <>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-slate-100 text-sm">
                {hovered.asset.ticker}
              </span>
              <span className="text-slate-400 truncate max-w-[200px]">
                {hovered.asset.name}
              </span>
              <span className="text-slate-500">· {hovered.asset.sector}</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <span>
                Preço: <strong className="text-slate-100">{formatCurrency(hovered.asset.price, hovered.asset.currency)}</strong>
              </span>
              <span>
                Justo Médio: <strong className="text-amber-300">{formatCurrency(hovered.averageFairValue, hovered.asset.currency)}</strong>
              </span>
              <span className={hovered.discountPercent != null && hovered.discountPercent >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                {formatPercent(hovered.discountPercent)}
              </span>
              <span className="text-amber-300 font-semibold">{hovered.consensusLabel}</span>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-wrap items-center justify-between gap-3 text-slate-400">
            <span>Passe o mouse ou clique em um ponto luminoso para abrir o valuation completo.</span>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span className="text-amber-400">● Consenso 5X</span>
              <span className="text-emerald-300">● Consenso 3X/4X</span>
              <span className="text-slate-400">● Monitorado</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
