import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import User from "@/lib/models/User";
import Plan from "@/lib/models/Plan";
import { validateCouponForPlan } from "@/lib/payments/coupon-engine";
import { safeLogAudit } from "@/lib/audit/log";
import { detectAndRecordSuspiciousPattern } from "@/lib/security/suspicious-patterns";
import {
  rateLimit,
  buildRateLimitKey,
} from "@/lib/security/rate-limit";

function buildNoStoreResponse(
  body: Record<string, unknown>,
  status: number
) {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required." },
        401
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded?.userId) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid session." },
        401
      );
    }

    /* =========================================
       🔐 RATE LIMIT (IMPROVED)
    ========================================= */
    const rl = await rateLimit({
      key: buildRateLimitKey({
        request,
        userId: decoded.userId,
        route: "coupon-validate",
      }),
      limit: 20,
      windowMs: 60 * 1000,
    });

    if (!rl.allowed) {
      return buildNoStoreResponse(
        { success: false, message: "Too many requests. Try later." },
        429
      );
    }

    const body = await request.json();

    const rawCode =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

    const rawPlanId =
      typeof body.planId === "string" ? body.planId.trim() : "";

    if (!rawCode || !rawPlanId) {
      return buildNoStoreResponse(
        { success: false, message: "Coupon code and planId required." },
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(rawPlanId)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid planId." },
        400
      );
    }

    const user = await User.findById(decoded.userId).select(
      "_id role accountStatus"
    );

    if (!user) {
      return buildNoStoreResponse(
        { success: false, message: "User not found." },
        404
      );
    }

    if (
      user.accountStatus === "DISABLED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Account not allowed." },
        403
      );
    }

    const plan = await Plan.findOne({
      _id: rawPlanId,
      isActive: true,
      isArchived: false,
      isVisible: true,
    }).select("_id price role currency");

    if (!plan) {
      return buildNoStoreResponse(
        { success: false, message: "Plan not found." },
        404
      );
    }
    
    if (plan.role !== "BOTH" && plan.role !== user.role) {
  return buildNoStoreResponse(
    { success: false, message: "This plan is not available for your role." },
    403
  );
}

    /* =========================================
       🎯 COUPON VALIDATION
    ========================================= */
    if (user.role !== "ORGANIZER" && user.role !== "SPONSOR") {
  return buildNoStoreResponse(
    { success: false, message: "Coupon is only available for paid user roles." },
    403
  );
}

const result = await validateCouponForPlan({
  code: rawCode,
  userId: String(user._id),
  role: user.role,
  planId: String(plan._id),
  amountBeforeDiscount: Number(plan.price),
});

    /* =========================================
       ❌ INVALID COUPON
    ========================================= */
    if (!result.valid) {
      await safeLogAudit({
        actorId: user._id,
        action: "COUPON_VALIDATE_FAILED",
        entityType: "COUPON",
        entityId: null,
        severity: "WARN",
        request,
        metadata: {
          code: rawCode,
          planId: String(plan._id),
          reason: result.message,
        },
      });

      await detectAndRecordSuspiciousPattern({
        request,
        userId: user._id,
        title: "Invalid coupon attempt",
        reason: result.message || "Coupon validation failed.",
        securityEventType: "COUPON_ABUSE",
        entityType: "COUPON",
        recentFailureCount: 1,
        couponAbusePattern: true,
        metadata: {
          code: rawCode,
          planId: String(plan._id),
        },
      });

      return buildNoStoreResponse(
        {
          success: false,
          valid: false,
          message: result.message,
        },
        400
      );
    }

    /* =========================================
       ✅ SUCCESS LOG
    ========================================= */
    await safeLogAudit({
      actorId: user._id,
      action: "COUPON_VALIDATED",
      entityType: "COUPON",
      entityId: result.coupon.id,
      severity: "INFO",
      request,
      metadata: {
       code: result.coupon.code,
planId: String(plan._id),
discountAmount: result.pricing.discountAmount,
finalAmount: result.pricing.finalAmount,
      },
    });

    return buildNoStoreResponse(
      {
        success: true,
        valid: true,
        coupon: {
  _id: result.coupon.id,
  code: result.coupon.code,
  name: result.coupon.name,
  type: result.coupon.type,
  value: result.coupon.value,
  maxDiscountAmount: result.coupon.maxDiscountAmount,
  minOrderAmount: result.coupon.minOrderAmount,
},
pricing: {
  amountBeforeDiscount: result.pricing.amountBeforeDiscount,
  discountAmount: result.pricing.discountAmount,
  finalAmount: result.pricing.finalAmount,
  currency: plan.currency,
},
      },
      200
    );
  } catch (error) {
    console.error("POST /api/payments/coupons/validate error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to validate coupon.",
      },
      500
    );
  }
}