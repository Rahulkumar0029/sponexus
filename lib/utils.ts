export function classNames(...classes: Array<string | undefined | null | false>): string {
  return classes.filter(Boolean).join(' ');
}

export function safeNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (typeof numeric === 'number' && Number.isFinite(numeric)) {
    return numeric;
  }
  return fallback;
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
