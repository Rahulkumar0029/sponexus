export function classNames(
  ...classes: Array<string | undefined | null | false>
): string {
  return classes.filter(Boolean).join(" ");
}

export function safeNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === "string" ? Number(value) : value;

  if (typeof numeric === "number" && Number.isFinite(numeric)) {
    return numeric;
  }

  return fallback;
}

export function formatCurrency(
  value: unknown,
  currency: "INR" | "USD" = "INR"
): string {
  const amount = safeNumber(value, 0);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}