type DiscountType = "PERCENTAGE" | "FLAT";

type CalculateDiscountInput = {
  baseAmount: number;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
};

type CalculatePayableAmountInput = {
  baseAmount: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  maxDiscountAmount?: number | null;
};

export type CalculatedAmountResult = {
  amountBeforeDiscount: number;
  couponDiscountAmount: number;
  finalAmount: number;
};

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

export function normalizeAmount(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Invalid amount.");
  }

  return roundToTwo(value);
}

export function calculatePercentageDiscount(params: {
  baseAmount: number;
  percentage: number;
  maxDiscountAmount?: number | null;
}) {
  const baseAmount = normalizeAmount(params.baseAmount);
  const percentage = normalizeAmount(params.percentage);

  if (percentage < 0 || percentage > 100) {
    throw new Error("Percentage discount must be between 0 and 100.");
  }

  let discount = roundToTwo((baseAmount * percentage) / 100);

  if (
    params.maxDiscountAmount != null &&
    Number.isFinite(params.maxDiscountAmount)
  ) {
    discount = Math.min(discount, normalizeAmount(params.maxDiscountAmount));
  }

  return Math.min(discount, baseAmount);
}

export function calculateFlatDiscount(params: {
  baseAmount: number;
  flatAmount: number;
}) {
  const baseAmount = normalizeAmount(params.baseAmount);
  const flatAmount = normalizeAmount(params.flatAmount);

  return Math.min(flatAmount, baseAmount);
}

export function calculateDiscountAmount(
  params: CalculateDiscountInput
) {
  const baseAmount = normalizeAmount(params.baseAmount);
  const discountValue = normalizeAmount(params.discountValue);

  if (params.discountType === "PERCENTAGE") {
    return calculatePercentageDiscount({
      baseAmount,
      percentage: discountValue,
      maxDiscountAmount: params.maxDiscountAmount ?? null,
    });
  }

  if (params.discountType === "FLAT") {
    return calculateFlatDiscount({
      baseAmount,
      flatAmount: discountValue,
    });
  }

  throw new Error("Unsupported discount type.");
}

export function calculatePayableAmount(
  params: CalculatePayableAmountInput
): CalculatedAmountResult {
  const amountBeforeDiscount = normalizeAmount(params.baseAmount);

  if (
    !params.discountType ||
    params.discountValue == null ||
    params.discountValue <= 0
  ) {
    return {
      amountBeforeDiscount,
      couponDiscountAmount: 0,
      finalAmount: amountBeforeDiscount,
    };
  }

  const couponDiscountAmount = calculateDiscountAmount({
    baseAmount: amountBeforeDiscount,
    discountType: params.discountType,
    discountValue: params.discountValue,
    maxDiscountAmount: params.maxDiscountAmount ?? null,
  });

  const finalAmount = roundToTwo(
    Math.max(0, amountBeforeDiscount - couponDiscountAmount)
  );

  return {
    amountBeforeDiscount,
    couponDiscountAmount,
    finalAmount,
  };
}