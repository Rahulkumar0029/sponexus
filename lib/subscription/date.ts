export function addDays(baseDate: Date | string, days: number): Date {
  const date = new Date(baseDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid base date");
  }

  if (!Number.isFinite(days)) {
    throw new Error("Days must be a valid number");
  }

  date.setDate(date.getDate() + days);
  return date;
}

export function isDateExpired(date?: Date | string | null): boolean {
  if (!date) return false;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed.getTime() < Date.now();
}

export function isDateInFuture(date?: Date | string | null): boolean {
  if (!date) return false;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;

  return parsed.getTime() > Date.now();
}

export function getSubscriptionRenewalBaseDate(
  endDate?: Date | string | null
): Date {
  const now = new Date();

  if (!endDate) return now;

  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return now;

  return parsed > now ? parsed : now;
}

export function getGraceEndDate(
  endDate: Date | string,
  graceDays: number
): Date {
  return addDays(new Date(endDate), graceDays);
}

export function formatSubscriptionDate(
  value?: Date | string | null,
  locale: string = "en-IN"
): string {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}