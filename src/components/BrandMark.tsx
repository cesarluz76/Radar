import React, { useState } from 'react';
import type { ConsensusLevel } from '../shared/types.ts';

export const BrandLogo: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div className="flex items-center gap-2.5 select-none whitespace-nowrap shrink-0">
      <svg
        width="32"
        height="32"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="10"
          fill="#0B1120"
          stroke="rgba(16, 185, 129, 0.35)"
          strokeWidth="1.2"
        />
        <circle cx="20" cy="20" r="13" stroke="rgba(16, 185, 129, 0.28)" strokeWidth="1" />
        <circle cx="20" cy="20" r="8" stroke="rgba(245, 158, 11, 0.35)" strokeWidth="1" />
        <path d="M20 20L30 11" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M20 20L30 11A13 13 0 0 1 33 20Z"
          fill="rgba(16, 185, 129, 0.22)"
        />
        <circle cx="20" cy="20" r="2.4" fill="#F59E0B" />
        <circle cx="26.5" cy="14" r="1.8" fill="#10B981" />
      </svg>
      {!compact && (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="font-display font-bold tracking-tight text-slate-50 text-base">
            RADAR VALUATION
          </span>
          <span className="font-mono text-xs font-semibold text-amber-400">
            PRO
          </span>
        </div>
      )}
    </div>
  );
};

export const AssetLogo: React.FC<{
  ticker: string;
  name?: string;
  size?: number;
}> = ({ ticker, name, size = 34 }) => {
  const [failed, setFailed] = useState(false);
  const clean = ticker.toUpperCase().replace(/\.SA$/, '');
  const initials = clean.replace(/[^A-Z0-9]/g, '').slice(0, 4);

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-lg bg-slate-800/90 border border-slate-700/80 flex items-center justify-center font-mono text-[10px] font-bold text-emerald-300 shrink-0"
        title={name || ticker}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`/api/logos/${encodeURIComponent(clean)}`}
      alt={name ? `Logo ${name}` : `Logo ${clean}`}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="rounded-lg object-contain bg-slate-900/90 border border-slate-800/90 p-0.5 shrink-0"
    />
  );
};

export const ConsensusSeal: React.FC<{ level: ConsensusLevel }> = ({ level }) => {
  if (level === 'NONE' || level === '1X' || level === '2X') {
    return (
      <span className="font-mono text-xs text-slate-400 whitespace-nowrap">
        {level === 'NONE' ? 'Sem consenso' : `Consenso ${level}`}
      </span>
    );
  }
  const is5x = level === '5X';
  const is4x = level === '4X';
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${
        is5x
          ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
          : is4x
            ? 'bg-emerald-500/15 border-amber-400/35 text-emerald-300'
            : 'bg-emerald-500/12 border-emerald-500/35 text-emerald-300'
      }`}
    >
      <span>CONSENSO {level}</span>
    </span>
  );
};
