import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Coupon from "@/lib/models/Coupon";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";
import { safeLogAudit } from "@/lib/audit/log";

type CouponRole = "ORGANIZER" | "SPONSOR" | "BOTH";
type CouponType = "PERCENTAGE" | "FLAT";

/* ===============================
   RESPONSE
=================================*/
function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
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
    applicableRoles: Array.isArray(coupon.applicableRoles)
      ? coupon.applicableRoles
      : [],
    applicablePlanIds: Array.isArray(coupon.applicablePlanIds)
      ? coupon.applicablePlanIds.map((id: any) => String(id))
      : [],
    startsAt: coupon.startsAt || null,
    expiresAt: coupon.expiresAt || null,
    totalUsageLimit: coupon.totalUsageLimit ?? null,
    perUserUsageLimit: coupon.perUserUsageLimit ?? null,
    usedCount: coupon.usedCount ?? 0,
    reservedCount: coupon.reservedCount ?? 0,
    isActive: Boolean(coupon.isActive),
    isArchived: Boolean(coupon.isArchived),
    createdBy: coupon.createdBy ? String(coupon.createdBy) : null,
    updatedBy: coupon.updatedBy ? String(coupon.updatedBy) : null,
    metadata: coupon.metadata ?? {},
    createdAt: coupon.createdAt || null,
    updatedAt: coupon.updatedAt || null,
  };
}

/* ===============================
   HELPERS
=================================*/
async function getCouponByIdOrFail(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      ok: false as const,
      response: buildNoStoreResponse(
        { success: false, message: "Invalid coupon id." },
        400
      ),
    };
  }

  const coupon = await Coupon.findById(id);

  if (!coupon) {
    return {
      ok: false as const,
      response: buildNoStoreResponse(
        { success: false, message: "Coupon not found." },
        404
      ),
    };
  }

  return { ok: true as const, coupon };
}

function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function normalizeApplicableRoles(value: unknown): CouponRole[] {
  if (!Array.isArray(value)) return ["BOTH"];

  const allowed = new Set<CouponRole>(["ORGANIZER", "SPONSOR", "BOTH"]);

  const roles = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toUpperCase() as CouponRole)
    .filter((v) => allowed.has(v));

  return roles.length ? Array.from(new Set(roles)) : ["BOTH"];
}

function normalizeApplicablePlanIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (id): id is string =>
        typeof id === "string" && mongoose.Types.ObjectId.isValid(id)
    )
    .map((id) => new mongoose.Types.ObjectId(id));
}

/* ===============================
   GET
=================================*/
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const result = await getCouponByIdOrFail(params.id);
    if (!result.ok) return result.response;

    return buildNoStoreResponse(
      {
        success: true,
        coupon: sanitizeCoupon(result.coupon),
        paymentAccessSession: {
          id: String(access.paymentAccessSession._id),
          sessionExpiresAt: access.paymentAccessSession.sessionExpiresAt ?? null,
        },
      },
      200
    );
  } catch (error) {
    console.error("GET /api/admin/coupons/[id] error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch coupon." },
      500
    );
  }
}

/* ===============================
   PATCH
=================================*/
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const result = await getCouponByIdOrFail(params.id);
    if (!result.ok) return result.response;

    const coupon = result.coupon;
    const body = await request.json();

    if (typeof body.code === "string") {
      const code = body.code.trim().toUpperCase();

      if (!code) {
        return buildNoStoreResponse(
          { success: false, message: "Code cannot be empty." },
          400
        );
      }

      const exists = await Coupon.findOne({
        code,
        _id: { $ne: coupon._id },
      });

      if (exists) {
        return buildNoStoreResponse(
          { success: false, message: "Duplicate code." },
          409
        );
      }

      coupon.code = code;
    }

    if (typeof body.name === "string") {
      const name = body.name.trim();

      if (!name) {
        return buildNoStoreResponse(
          { success: false, message: "Name cannot be empty." },
          400
        );
      }

      coupon.name = name;
    }

    if (typeof body.description === "string") {
      coupon.description = body.description.trim();
    }

    if (typeof body.type === "string") {
      const type = body.type.trim().toUpperCase() as CouponType;

      if (!["PERCENTAGE", "FLAT"].includes(type)) {
        return buildNoStoreResponse(
          { success: false, message: "Invalid type." },
          400
        );
      }

      coupon.type = type;
    }

    if (body.value !== undefined) {
      const value = Number(body.value);

      if (!Number.isFinite(value) || value <= 0) {
        return buildNoStoreResponse(
          { success: false, message: "Invalid value." },
          400
        );
      }

      const effectiveType: CouponType =
        typeof body.type === "string"
          ? (body.type.trim().toUpperCase() as CouponType)
          : coupon.type;

      if (effectiveType === "PERCENTAGE" && value > 100) {
        return buildNoStoreResponse(
          { success: false, message: "Max 100% allowed." },
          400
        );
      }

      coupon.value = value;
    }

    if (body.maxDiscountAmount !== undefined) {
      coupon.maxDiscountAmount = normalizeNullableNumber(body.maxDiscountAmount);
    }

    if (body.minOrderAmount !== undefined) {
      coupon.minOrderAmount = normalizeNullableNumber(body.minOrderAmount);
    }


const maxDiscountAmount = coupon.maxDiscountAmount ?? null;
const minOrderAmount = coupon.minOrderAmount ?? null;

if (maxDiscountAmount != null && maxDiscountAmount < 0) {
  return buildNoStoreResponse(
    { success: false, message: "Max discount amount cannot be negative." },
    400
  );
}

if (minOrderAmount != null && minOrderAmount < 0) {
  return buildNoStoreResponse(
    { success: false, message: "Minimum order amount cannot be negative." },
    400
  );
}

if (
  coupon.type === "FLAT" &&
  maxDiscountAmount != null &&
  maxDiscountAmount < coupon.value
) {
  return buildNoStoreResponse(
    {
      success: false,
      message: "For flat coupons, max discount cannot be less than coupon value.",
    },
    400
  );
}
    if (body.applicableRoles !== undefined) {
      coupon.applicableRoles = normalizeApplicableRoles(body.applicableRoles);
    }

    if (body.applicablePlanIds !== undefined) {
      coupon.applicablePlanIds = normalizeApplicablePlanIds(
        body.applicablePlanIds
      );
    }

    if (body.startsAt !== undefined) {
      coupon.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    }

    if (body.expiresAt !== undefined) {
      coupon.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }

    if (
      coupon.startsAt &&
      coupon.expiresAt &&
      coupon.expiresAt <= coupon.startsAt
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid date range." },
        400
      );
    }

    if (body.totalUsageLimit !== undefined) {
  const val = normalizeNullableNumber(body.totalUsageLimit);

  if (val !== null && val < 1) {
    return buildNoStoreResponse(
      { success: false, message: "totalUsageLimit must be at least 1." },
      400
    );
  }

  const used = Number(coupon.usedCount || 0);
  const reserved = Number(coupon.reservedCount || 0);

  if (val !== null && val < used + reserved) {
    return buildNoStoreResponse(
      {
        success: false,
        message: "Limit cannot be less than used + reserved coupons.",
      },
      400
    );
  }

  coupon.totalUsageLimit = val;
}


    if (body.perUserUsageLimit !== undefined) {
      const val = normalizeNullableNumber(body.perUserUsageLimit);

      if (val !== null && val < 1) {
        return buildNoStoreResponse(
          { success: false, message: "perUserUsageLimit must be at least 1." },
          400
        );
      }

      coupon.perUserUsageLimit = val;
    }

    if (body.isActive !== undefined) coupon.isActive = Boolean(body.isActive);
    if (body.isArchived !== undefined) coupon.isArchived = Boolean(body.isArchived);

    if (body.metadata !== undefined) {
      if (
        !body.metadata ||
        typeof body.metadata !== "object" ||
        Array.isArray(body.metadata)
      ) {
        return buildNoStoreResponse(
          { success: false, message: "metadata must be an object." },
          400
        );
      }

      coupon.metadata = body.metadata;
    }

    coupon.updatedBy = access.adminUser._id;
    await coupon.save();

    await safeLogAudit({
      actorId: access.adminUser._id,
      action: "COUPON_UPDATED",
      entityType: "COUPON",
      entityId: coupon._id,
      severity: "INFO",
      request,
    });

    return buildNoStoreResponse(
      {
        success: true,
        message: "Coupon updated.",
        coupon: sanitizeCoupon(coupon),
      },
      200
    );
  } catch (error) {
    console.error("PATCH /api/admin/coupons/[id] error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to update coupon." },
      500
    );
  }
}

/* ===============================
   DELETE (ARCHIVE)
=================================*/
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const result = await getCouponByIdOrFail(params.id);
    if (!result.ok) return result.response;

    const coupon = result.coupon;

    coupon.isArchived = true;
    coupon.isActive = false;
    coupon.updatedBy = access.adminUser._id;

    await coupon.save();

    await safeLogAudit({
      actorId: access.adminUser._id,
      action: "COUPON_ARCHIVED",
      entityType: "COUPON",
      entityId: coupon._id,
      severity: "WARN",
      request,
    });

    return buildNoStoreResponse(
      {
        success: true,
        message: "Coupon archived.",
        coupon: sanitizeCoupon(coupon),
      },
      200
    );
  } catch (error) {
    console.error("DELETE /api/admin/coupons/[id] error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to archive coupon." },
      500
    );
  }
}