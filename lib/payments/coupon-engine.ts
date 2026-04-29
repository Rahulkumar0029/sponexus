import mongoose from "mongoose";

import Coupon from "@/lib/models/Coupon";
import CouponRedemption from "@/lib/models/CouponRedemption";

/* ===============================
   TYPES
=================================*/
type Role = "ORGANIZER" | "SPONSOR";

type ValidateCouponInput = {
  code: string;
  userId: string;
  planId: string;
  role: Role;
  amountBeforeDiscount: number;
};

type CouponValidationResult =
  | {
      valid: false;
      message: string;
    }
  | {
      valid: true;
      message: string;
      coupon: {
        id: string;
        code: string;
        name: string;
        type: "PERCENTAGE" | "FLAT";
        value: number;
        maxDiscountAmount: number | null;
        minOrderAmount: number | null;
      };
      pricing: {
        amountBeforeDiscount: number;
        discountAmount: number;
        finalAmount: number;
        currency: "INR";
      };
    };

/* ===============================
   HELPERS
=================================*/
function roundMoney(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function roleAllowed(applicableRoles: string[], role: Role) {
  return applicableRoles.includes("BOTH") || applicableRoles.includes(role);
}

/* ===============================
   MAIN FUNCTION
=================================*/
export async function validateCouponForPlan({
  code,
  userId,
  planId,
  role,
  amountBeforeDiscount,
}: ValidateCouponInput): Promise<CouponValidationResult> {
  const cleanCode = code.trim().toUpperCase();

  if (!cleanCode) {
    return {
      valid: false,
      message: "Enter a coupon code.",
    };
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      valid: false,
      message: "Invalid user.",
    };
  }

  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return {
      valid: false,
      message: "Invalid plan.",
    };
  }

  if (!Number.isFinite(amountBeforeDiscount) || amountBeforeDiscount <= 0) {
    return {
      valid: false,
      message: "Invalid order amount.",
    };
  }

  const coupon = await Coupon.findOne({
    code: cleanCode,
    isArchived: false,
  });

  if (!coupon) {
    return {
      valid: false,
      message: "Invalid coupon code.",
    };
  }

  if (!coupon.isActive) {
    return {
      valid: false,
      message: "This coupon is not active.",
    };
  }

  const now = new Date();

  if (coupon.startsAt && coupon.startsAt > now) {
    return {
      valid: false,
      message: "This coupon is not active yet.",
    };
  }

  if (coupon.expiresAt && coupon.expiresAt <= now) {
    return {
      valid: false,
      message: "This coupon has expired.",
    };
  }

  if (!roleAllowed(coupon.applicableRoles || ["BOTH"], role)) {
    return {
      valid: false,
      message: "This coupon is not applicable for your account type.",
    };
  }

  const applicablePlanIds = Array.isArray(coupon.applicablePlanIds)
    ? coupon.applicablePlanIds.map((id) => String(id))
    : [];

  if (applicablePlanIds.length > 0 && !applicablePlanIds.includes(planId)) {
    return {
      valid: false,
      message: "This coupon is not applicable on this plan.",
    };
  }

  if (
    coupon.minOrderAmount != null &&
    amountBeforeDiscount < coupon.minOrderAmount
  ) {
    return {
      valid: false,
      message: `Minimum order amount is ₹${coupon.minOrderAmount}.`,
    };
  }

  /* ===============================
     USAGE LIMIT CHECK
  =================================*/
  const activeStatuses = ["RESERVED", "COMPLETED"];

  const totalUsed = await CouponRedemption.countDocuments({
    couponId: coupon._id,
    status: { $in: activeStatuses },
  });

  if (coupon.totalUsageLimit != null && totalUsed >= coupon.totalUsageLimit) {
    return {
      valid: false,
      message: "Coupon usage limit reached.",
    };
  }

  const userUsed = await CouponRedemption.countDocuments({
    couponId: coupon._id,
    userId: new mongoose.Types.ObjectId(userId),
    status: { $in: activeStatuses },
  });

  if (coupon.perUserUsageLimit != null && userUsed >= coupon.perUserUsageLimit) {
    return {
      valid: false,
      message: "You already used this coupon maximum times.",
    };
  }

  /* ===============================
     DISCOUNT CALCULATION
  =================================*/
  if (
  coupon.type !== "PERCENTAGE" &&
  coupon.type !== "FLAT"
) {
  return {
    valid: false,
    message: "Coupon configuration is invalid.",
  };
}

if (
  typeof coupon.value !== "number" ||
  !Number.isFinite(coupon.value) ||
  coupon.value <= 0
) {
  return {
    valid: false,
    message: "Coupon value is invalid.",
  };
}

  let discountAmount = 0;

  if (coupon.type === "PERCENTAGE") {
    discountAmount = roundMoney((amountBeforeDiscount * coupon.value) / 100);

    if (
      coupon.maxDiscountAmount != null &&
      discountAmount > coupon.maxDiscountAmount
    ) {
      discountAmount = coupon.maxDiscountAmount;
    }
  }

  if (coupon.type === "FLAT") {
    discountAmount = coupon.value;

    if (
      coupon.maxDiscountAmount != null &&
      discountAmount > coupon.maxDiscountAmount
    ) {
      discountAmount = coupon.maxDiscountAmount;
    }
  }

  discountAmount = roundMoney(Math.min(discountAmount, amountBeforeDiscount));

  if (discountAmount <= 0) {
  return {
    valid: false,
    message: "Coupon does not apply to this order.",
  };
}

  const finalAmount = roundMoney(amountBeforeDiscount - discountAmount);

  return {
    valid: true,
    message: "Coupon applied successfully.",
    coupon: {
      id: String(coupon._id),
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      maxDiscountAmount: coupon.maxDiscountAmount ?? null,
      minOrderAmount: coupon.minOrderAmount ?? null,
    },
    pricing: {
      amountBeforeDiscount,
      discountAmount,
      finalAmount,
      currency: "INR",
    },
  };
}