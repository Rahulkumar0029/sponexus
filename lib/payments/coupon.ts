import mongoose, { Types } from "mongoose";

import Coupon from "@/lib/models/Coupon";
import CouponRedemption from "@/lib/models/CouponRedemption";
import { calculatePayableAmount } from "@/lib/payments/amounts";

type UserRole = "ORGANIZER" | "SPONSOR";
type CouponDiscountType = "PERCENTAGE" | "FLAT";
type CouponRole = "ORGANIZER" | "SPONSOR" | "BOTH";

type CouponLike = {
  _id: Types.ObjectId;
  code: string;
  isActive: boolean;
  isArchived: boolean;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  applicableRoles?: CouponRole[];
  applicablePlanIds?: Array<Types.ObjectId | string>;
  minOrderAmount?: number | null;
  totalUsageLimit?: number | null;
  perUserUsageLimit?: number | null;
  usedCount?: number | null;
  type?: CouponDiscountType;
  value?: number;
  maxDiscountAmount?: number | null;
};

type ValidateCouponInput = {
  code: string;
  userId: string | Types.ObjectId;
  role: UserRole;
  planId: string | Types.ObjectId;
  baseAmount: number;
};

type ReserveCouponInput = {
  couponId: string | Types.ObjectId;
  paymentTransactionId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  planId: string | Types.ObjectId;
  role: UserRole;
  codeSnapshot: string;
  discountType: CouponDiscountType;
  discountValue: number;
  amountBeforeDiscount: number;
  discountAmount: number;
  finalAmount: number;
  session?: mongoose.ClientSession;
};

type UpdateCouponRedemptionStatusInput = {
  paymentTransactionId: string | Types.ObjectId;
  failureReason?: string | null;
  notes?: string | null;
  session?: mongoose.ClientSession;
};

export type ValidatedCouponResult = {
  valid: true;
  coupon: CouponLike;
  discountAmount: number;
  finalAmount: number;
  amountBeforeDiscount: number;
};

export type InvalidCouponResult = {
  valid: false;
  message: string;
};

export type CouponValidationResult =
  | ValidatedCouponResult
  | InvalidCouponResult;

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function toObjectId(value: string | Types.ObjectId) {
  if (value instanceof Types.ObjectId) {
    return value;
  }

  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error("Invalid ObjectId value.");
  }

  return new mongoose.Types.ObjectId(value);
}

function isCouponAllowedForRole(
  applicableRoles: CouponRole[] | undefined,
  role: UserRole
) {
  if (!Array.isArray(applicableRoles) || applicableRoles.length === 0) {
    return true;
  }

  return applicableRoles.includes("BOTH") || applicableRoles.includes(role);
}

function isCouponAllowedForPlan(
  applicablePlanIds: Array<Types.ObjectId | string> | undefined,
  planId: Types.ObjectId
) {
  if (!Array.isArray(applicablePlanIds) || applicablePlanIds.length === 0) {
    return true;
  }

  return applicablePlanIds.some((id) => String(id) === String(planId));
}

export async function getCouponByCode(code: string) {
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode) {
    return null;
  }

  return Coupon.findOne({
    code: normalizedCode,
    isArchived: false,
  });
}

export async function validateCoupon(
  input: ValidateCouponInput
): Promise<CouponValidationResult> {
  const normalizedCode = normalizeCode(input.code);

  if (!normalizedCode) {
    return {
      valid: false,
      message: "Coupon code is required.",
    };
  }

  if (
    typeof input.baseAmount !== "number" ||
    !Number.isFinite(input.baseAmount) ||
    input.baseAmount < 0
  ) {
    return {
      valid: false,
      message: "Invalid base amount.",
    };
  }

  const userId = toObjectId(input.userId);
  const planId = toObjectId(input.planId);

  const coupon = (await Coupon.findOne({
    code: normalizedCode,
    isArchived: false,
  })) as CouponLike | null;

  if (!coupon) {
    return {
      valid: false,
      message: "Coupon not found.",
    };
  }

  if (!coupon.isActive) {
    return {
      valid: false,
      message: "Coupon is inactive.",
    };
  }

  const now = new Date();

  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return {
      valid: false,
      message: "Coupon is not active yet.",
    };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return {
      valid: false,
      message: "Coupon has expired.",
    };
  }

  if (!isCouponAllowedForRole(coupon.applicableRoles, input.role)) {
    return {
      valid: false,
      message: "Coupon is not applicable for this account type.",
    };
  }

  if (!isCouponAllowedForPlan(coupon.applicablePlanIds, planId)) {
    return {
      valid: false,
      message: "Coupon is not applicable for this plan.",
    };
  }

  if (
    coupon.minOrderAmount != null &&
    Number(input.baseAmount) < Number(coupon.minOrderAmount)
  ) {
    return {
      valid: false,
      message: `Coupon requires a minimum order amount of ₹${coupon.minOrderAmount}.`,
    };
  }

  if (
    coupon.totalUsageLimit != null &&
    Number(coupon.usedCount || 0) >= Number(coupon.totalUsageLimit)
  ) {
    return {
      valid: false,
      message: "Coupon usage limit has been reached.",
    };
  }

  const completedUserRedemptionCount = await CouponRedemption.countDocuments({
    couponId: coupon._id,
    userId,
    status: "COMPLETED",
  });

  if (
    coupon.perUserUsageLimit != null &&
    completedUserRedemptionCount >= Number(coupon.perUserUsageLimit)
  ) {
    return {
      valid: false,
      message: "You have already used this coupon the maximum number of times.",
    };
  }

  const existingReservedRedemption = await CouponRedemption.findOne({
    couponId: coupon._id,
    userId,
    planId,
    status: "RESERVED",
  }).sort({ createdAt: -1 });

  if (existingReservedRedemption) {
    return {
      valid: false,
      message: "You already have a pending coupon checkout attempt.",
    };
  }

  const couponType = coupon.type ?? null;
  const couponValue =
    typeof coupon.value === "number" ? coupon.value : null;
  const couponMaxDiscount = coupon.maxDiscountAmount ?? null;

  if (
    !couponType ||
    !["PERCENTAGE", "FLAT"].includes(couponType) ||
    couponValue == null
  ) {
    return {
      valid: false,
      message: "Coupon configuration is invalid.",
    };
  }

  const amountResult = calculatePayableAmount({
    baseAmount: input.baseAmount,
    discountType: couponType,
    discountValue: couponValue,
    maxDiscountAmount: couponMaxDiscount,
  });

  if (amountResult.couponDiscountAmount <= 0) {
    return {
      valid: false,
      message: "Coupon does not apply to this order.",
    };
  }

  return {
    valid: true,
    coupon,
    discountAmount: amountResult.couponDiscountAmount,
    finalAmount: amountResult.finalAmount,
    amountBeforeDiscount: amountResult.amountBeforeDiscount,
  };
}

export async function reserveCouponRedemption(input: ReserveCouponInput) {
  const existing = await CouponRedemption.findOne({
    paymentTransactionId: toObjectId(input.paymentTransactionId),
  }).session(input.session || null);

  if (existing) {
    return existing;
  }

  const redemption = await CouponRedemption.create(
    [
      {
        couponId: toObjectId(input.couponId),
        paymentTransactionId: toObjectId(input.paymentTransactionId),
        userId: toObjectId(input.userId),
        planId: toObjectId(input.planId),
        codeSnapshot: normalizeCode(input.codeSnapshot),
        role: input.role,
        discountType: input.discountType,
        discountValue: input.discountValue,
        amountBeforeDiscount: input.amountBeforeDiscount,
        discountAmount: input.discountAmount,
        finalAmount: input.finalAmount,
        status: "RESERVED",
        reservedAt: new Date(),
        notes: "Coupon reserved for checkout attempt.",
      },
    ],
    input.session ? { session: input.session } : undefined
  );

  return redemption[0];
}

export async function completeCouponRedemption(
  input: UpdateCouponRedemptionStatusInput
) {
  const paymentTransactionId = toObjectId(input.paymentTransactionId);

  const redemption = await CouponRedemption.findOne({
    paymentTransactionId,
  }).session(input.session || null);

  if (!redemption) {
    return null;
  }

  if (redemption.status === "COMPLETED") {
    return redemption;
  }

  if (redemption.status === "FAILED" || redemption.status === "RELEASED") {
    return redemption;
  }

  redemption.status = "COMPLETED";
  redemption.completedAt = redemption.completedAt || new Date();
  redemption.notes =
    input.notes || "Coupon redemption completed after successful payment.";

  await redemption.save(input.session ? { session: input.session } : undefined);

  await Coupon.updateOne(
    { _id: redemption.couponId },
    { $inc: { usedCount: 1 } },
    input.session ? { session: input.session } : undefined
  );

  return redemption;
}

export async function failCouponRedemption(
  input: UpdateCouponRedemptionStatusInput
) {
  const paymentTransactionId = toObjectId(input.paymentTransactionId);

  const redemption = await CouponRedemption.findOne({
    paymentTransactionId,
  }).session(input.session || null);

  if (!redemption) {
    return null;
  }

  if (redemption.status === "COMPLETED") {
    return redemption;
  }

  if (redemption.status === "FAILED") {
    return redemption;
  }

  redemption.status = "FAILED";
  redemption.failedAt = redemption.failedAt || new Date();
  redemption.failureReason =
    input.failureReason || "Coupon redemption failed.";
  redemption.notes = input.notes || "Coupon redemption marked failed.";

  await redemption.save(input.session ? { session: input.session } : undefined);

  return redemption;
}

export async function releaseCouponRedemption(
  input: UpdateCouponRedemptionStatusInput
) {
  const paymentTransactionId = toObjectId(input.paymentTransactionId);

  const redemption = await CouponRedemption.findOne({
    paymentTransactionId,
  }).session(input.session || null);

  if (!redemption) {
    return null;
  }

  if (redemption.status === "COMPLETED") {
    return redemption;
  }

  if (redemption.status === "RELEASED") {
    return redemption;
  }

  redemption.status = "RELEASED";
  redemption.releasedAt = redemption.releasedAt || new Date();
  redemption.notes =
    input.notes || "Coupon reservation released without successful payment.";

  await redemption.save(input.session ? { session: input.session } : undefined);

  return redemption;
}