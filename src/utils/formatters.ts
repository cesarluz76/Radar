export function formatCurrency(
  val: number | null | undefined,
  currency: 'BRL' | 'USD' = 'BRL',
  decimals = 2
): string {
  if (val == null || !Number.isFinite(val)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatNumber(
  val: number | null | undefined,
  decimals = 2
): string {
  if (val == null || !Number.isFinite(val)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(
  val: number | null | undefined,
  withSign = true
): string {
  if (val == null || !Number.isFinite(val)) return '—';
  const sign = withSign && val > 0 ? '+' : '';
  return `${sign}${val.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function formatCompact(
  val: number | null | undefined,
  currency?: 'BRL' | 'USD'
): string {
  if (val == null || !Number.isFinite(val)) return '—';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  const prefix = currency === 'BRL' ? 'R$ ' : currency === 'USD' ? 'US$ ' : '';
  if (abs >= 1e12) return `${sign}${prefix}${(abs / 1e12).toFixed(2)} tri`;
  if (abs >= 1e9) return `${sign}${prefix}${(abs / 1e9).toFixed(2)} bi`;
  if (abs >= 1e6) return `${sign}${prefix}${(abs / 1e6).toFixed(2)} mi`;
  if (abs >= 1e3) return `${sign}${prefix}${(abs / 1e3).toFixed(1)} mil`;
  return `${sign}${prefix}${abs.toFixed(2)}`;
}

export function formatDateTimeBr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
