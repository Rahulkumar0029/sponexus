import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Coupon from "@/lib/models/Coupon";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";
import { safeLogAudit } from "@/lib/audit/log";

type CouponType = "PERCENTAGE" | "FLAT";
type CouponRole = "ORGANIZER" | "SPONSOR" | "BOTH";

/* ===============================
   RESPONSE
=================================*/
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

/* ===============================
   SANITIZE
=================================*/
function sanitizeCoupon(coupon: any) {
  return {
    _id: String(coupon._id),
    code: coupon.code,
    name: coupon.name,
    description: coupon.description ?? "",
    type: coupon.type,
    value: coupon.value,
    maxDiscountAmount: coupon.maxDiscountAmount ?? null,
    minOrderAmount: coupon.minOrderAmount ?? null,
    totalUsageLimit: coupon.totalUsageLimit ?? null,
    perUserUsageLimit: coupon.perUserUsageLimit ?? null,
    applicableRoles: Array.isArray(coupon.applicableRoles)
      ? coupon.applicableRoles
      : [],
    applicablePlanIds: Array.isArray(coupon.applicablePlanIds)
      ? coupon.applicablePlanIds.map((id: any) => String(id))
      : [],
    startsAt: coupon.startsAt ?? null,
    expiresAt: coupon.expiresAt ?? null,
    isActive: Boolean(coupon.isActive),
    isArchived: Boolean(coupon.isArchived),
    usedCount: coupon.usedCount ?? 0,
    reservedCount: coupon.reservedCount ?? 0,
    createdBy: coupon.createdBy ? String(coupon.createdBy) : null,
    updatedBy: coupon.updatedBy ? String(coupon.updatedBy) : null,
    metadata: coupon.metadata ?? {},
    createdAt: coupon.createdAt || null,
    updatedAt: coupon.updatedAt || null,
  };
}

function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeApplicableRoles(value: unknown): CouponRole[] {
  if (!Array.isArray(value)) return ["BOTH"];

  const allowed = new Set<CouponRole>(["ORGANIZER", "SPONSOR", "BOTH"]);

  const roles = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toUpperCase() as CouponRole)
    .filter((v) => allowed.has(v));

  return roles.length > 0 ? Array.from(new Set(roles)) : ["BOTH"];
}

function normalizeApplicablePlanIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (id): id is string =>
        typeof id === "string" && /^[a-f\d]{24}$/i.test(id)
    )
    .map((id) => id);
}

/* ===============================
   CREATE COUPON
=================================*/
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const body = await request.json();

    const code =
      typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

    const name =
      typeof body.name === "string" ? body.name.trim() : code;

    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    const typeRaw =
      typeof body.type === "string"
        ? body.type.trim().toUpperCase()
        : typeof body.discountType === "string"
        ? body.discountType.trim().toUpperCase()
        : "";

    const type: CouponType | "" =
      typeRaw === "PERCENTAGE"
        ? "PERCENTAGE"
        : typeRaw === "FLAT" || typeRaw === "FIXED"
        ? "FLAT"
        : "";

    const value = Number(
      body.value !== undefined ? body.value : body.discountValue
    );

    const maxDiscountAmount = normalizeNullableNumber(
      body.maxDiscountAmount !== undefined ? body.maxDiscountAmount : body.maxDiscount
    );

    const minOrderAmount = normalizeNullableNumber(body.minOrderAmount);

    const totalUsageLimit = normalizeNullableNumber(
      body.totalUsageLimit !== undefined ? body.totalUsageLimit : body.usageLimit
    );

    const perUserUsageLimit = normalizeNullableNumber(
      body.perUserUsageLimit !== undefined
        ? body.perUserUsageLimit
        : body.perUserLimit
    );

    const applicableRoles = normalizeApplicableRoles(body.applicableRoles);
    const applicablePlanIds = normalizeApplicablePlanIds(body.applicablePlanIds);

    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    if (!code || !type || !Number.isFinite(value)) {
      return buildNoStoreResponse(
        { success: false, message: "Missing required fields." },
        400
      );
    }

    if (!["PERCENTAGE", "FLAT"].includes(type)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid coupon type." },
        400
      );
    }

    if (value <= 0) {
      return buildNoStoreResponse(
        { success: false, message: "Coupon value must be greater than 0." },
        400
      );
    }

    if (type === "PERCENTAGE" && value > 100) {
      return buildNoStoreResponse(
        { success: false, message: "Percentage cannot exceed 100." },
        400
      );
    }

    if (startsAt && expiresAt && startsAt >= expiresAt) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid coupon date range." },
        400
      );
    }

    if (expiresAt && expiresAt.getTime() < Date.now()) {
      return buildNoStoreResponse(
        { success: false, message: "Expiry must be in the future." },
        400
      );
    }

    if (totalUsageLimit !== null && totalUsageLimit < 1) {
      return buildNoStoreResponse(
        { success: false, message: "Total usage limit must be at least 1." },
        400
      );
    }

    if (perUserUsageLimit !== null && perUserUsageLimit < 1) {
      return buildNoStoreResponse(
        { success: false, message: "Per-user usage limit must be at least 1." },
        400
      );
    }

if (maxDiscountAmount !== null && maxDiscountAmount < 0) {
  return buildNoStoreResponse(
    { success: false, message: "Max discount amount cannot be negative." },
    400
  );
}

if (minOrderAmount !== null && minOrderAmount < 0) {
  return buildNoStoreResponse(
    { success: false, message: "Minimum order amount cannot be negative." },
    400
  );
}

if (type === "FLAT" && maxDiscountAmount !== null && maxDiscountAmount < value) {
  return buildNoStoreResponse(
    {
      success: false,
      message: "For flat coupons, max discount cannot be less than coupon value.",
    },
    400
  );
}

    const exists = await Coupon.findOne({ code });
    if (exists) {
      return buildNoStoreResponse(
        { success: false, message: "Coupon already exists." },
        409
      );
    }

    const coupon = await Coupon.create({
      code,
      name,
      description,
      type,
      value,
      maxDiscountAmount,
      minOrderAmount,
      totalUsageLimit,
      perUserUsageLimit,
      applicableRoles,
      applicablePlanIds,
      startsAt,
      expiresAt,
      isActive: body.isActive !== false,
      isArchived: false,
      usedCount: 0,
      reservedCount: 0,
      createdBy: access.adminUser._id,
      updatedBy: access.adminUser._id,
      metadata:
        body.metadata &&
        typeof body.metadata === "object" &&
        !Array.isArray(body.metadata)
          ? body.metadata
          : {},
    });

    await safeLogAudit({
      actorId: access.adminUser._id,
      action: "COUPON_CREATED",
      entityType: "COUPON",
      entityId: coupon._id,
      severity: "INFO",
      request,
      metadata: {
        code,
        type,
        value,
        totalUsageLimit,
        perUserUsageLimit,
      },
    });

    return buildNoStoreResponse(
      {
        success: true,
        message: "Coupon created successfully.",
        coupon: sanitizeCoupon(coupon),
      },
      201
    );
  } catch (e) {
    console.error("POST /api/admin/coupons error:", e);

    return buildNoStoreResponse(
      { success: false, message: "Error creating coupon." },
      500
    );
  }
}

/* ===============================
   GET ALL COUPONS
=================================*/
export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();

    return buildNoStoreResponse(
      {
        success: true,
        data: coupons.map(sanitizeCoupon),
      },
      200
    );
  } catch (e) {
    console.error("GET /api/admin/coupons error:", e);

    return buildNoStoreResponse(
      { success: false, message: "Error fetching coupons." },
      500
    );
  }
}