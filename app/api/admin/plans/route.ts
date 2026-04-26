import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Plan from "@/lib/models/Plan";
import { requirePaymentAdminAccess } from "@/lib/security/payment-admin-access";
import { safeLogAudit } from "@/lib/audit/log";

type PlanRole = "ORGANIZER" | "SPONSOR" | "BOTH";

/* ===============================
   RESPONSE
=================================*/
function buildNoStoreResponse(
  body: Record<string, unknown>,
  status: number
) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

/* ===============================
   SANITIZE
=================================*/
function sanitizePlan(plan: any) {
  return {
    _id: String(plan._id),
    code: plan.code,
    role: plan.role,
    name: plan.name,
    description: plan.description ?? "",
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    durationInDays: plan.durationInDays,
    extraDays: plan.extraDays ?? 0,

    postingLimitPerDay: plan.postingLimitPerDay ?? null,
    dealRequestLimitPerDay: plan.dealRequestLimitPerDay ?? null,

    canPublish: Boolean(plan.canPublish),
    canContact: Boolean(plan.canContact),
    canUseMatch: Boolean(plan.canUseMatch),
    canRevealContact: Boolean(plan.canRevealContact),

    budgetMin: plan.budgetMin ?? null,
    budgetMax: plan.budgetMax ?? null,

features: plan.features ?? {},
limits: plan.limits ?? {},

    isActive: Boolean(plan.isActive),
    isArchived: Boolean(plan.isArchived),
    isVisible: Boolean(plan.isVisible),

    visibleToRoles: Array.isArray(plan.visibleToRoles)
      ? plan.visibleToRoles
      : [],

    visibleToLoggedOut: Boolean(plan.visibleToLoggedOut),
    sortOrder: typeof plan.sortOrder === "number" ? plan.sortOrder : 0,

    metadata: plan.metadata ?? {},
    createdAt: plan.createdAt || null,
    updatedAt: plan.updatedAt || null,
  };
}

/* ===============================
   HELPERS
=================================*/
function normalizeVisibleToRoles(value: unknown): PlanRole[] {
  if (!Array.isArray(value)) return ["BOTH"];

  const allowed = new Set<PlanRole>(["ORGANIZER", "SPONSOR", "BOTH"]);

  const roles = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toUpperCase() as PlanRole)
    .filter((v) => allowed.has(v));

  return roles.length ? Array.from(new Set(roles)) : ["BOTH"];
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

/* ===============================
   GET ALL PLANS
=================================*/
export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    const access = await requirePaymentAdminAccess();
    if (!access.ok) return access.response;

    const plans = await Plan.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return buildNoStoreResponse(
      {
        success: true,
        data: plans.map(sanitizePlan),
      },
      200
    );
  } catch (error) {
    console.error("GET /api/admin/plans error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch plans." },
      500
    );
  }
}

/* ===============================
   CREATE PLAN
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
      typeof body.name === "string" ? body.name.trim() : "";

    const role =
      typeof body.role === "string"
        ? body.role.trim().toUpperCase()
        : "";

    const interval =
      typeof body.interval === "string"
        ? body.interval.trim().toUpperCase()
        : "CUSTOM";

    const price = Number(body.price);
    const durationInDays = Number(body.durationInDays);

    const extraDays =
      typeof body.extraDays === "number" && body.extraDays >= 0
        ? body.extraDays
        : typeof body.extraDays === "string" && Number(body.extraDays) >= 0
        ? Number(body.extraDays)
        : 0;

    if (!code || !name || !role) {
      return buildNoStoreResponse(
        { success: false, message: "Missing required fields." },
        400
      );
    }

    if (!["ORGANIZER", "SPONSOR", "BOTH"].includes(role)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid role." },
        400
      );
    }

    if (!["MONTHLY", "YEARLY", "CUSTOM"].includes(interval)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid interval." },
        400
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid price." },
        400
      );
    }

    if (!Number.isFinite(durationInDays) || durationInDays < 1) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid duration." },
        400
      );
    }

    const exists = await Plan.findOne({ code });
    if (exists) {
      return buildNoStoreResponse(
        { success: false, message: "Plan code already exists." },
        409
      );
    }

    const budgetMin = normalizeNullableNumber(body.budgetMin);
    const budgetMax = normalizeNullableNumber(body.budgetMax);

    if (
      budgetMin !== null &&
      budgetMax !== null &&
      budgetMin > budgetMax
    ) {
      return buildNoStoreResponse(
        { success: false, message: "budgetMin cannot exceed budgetMax." },
        400
      );
    }

    const features = {
  canPublishEvent: body.features?.canPublishEvent !== false,
  canPublishSponsorship: body.features?.canPublishSponsorship !== false,
  canUseMatch: body.features?.canUseMatch !== false,
  canRevealContact: body.features?.canRevealContact !== false,
  canSendDealRequest: body.features?.canSendDealRequest !== false,
};

const limits = {
  eventPostsPerDay: normalizeNullableNumber(body.limits?.eventPostsPerDay),
  sponsorshipPostsPerDay: normalizeNullableNumber(
    body.limits?.sponsorshipPostsPerDay
  ),
  dealRequestsPerDay: normalizeNullableNumber(body.limits?.dealRequestsPerDay),
  contactRevealsPerDay: normalizeNullableNumber(
    body.limits?.contactRevealsPerDay
  ),

  matchUsesPerDay: normalizeNullableNumber(body.limits?.matchUsesPerDay),

  eventPostsPerMonth: normalizeNullableNumber(body.limits?.eventPostsPerMonth),
  sponsorshipPostsPerMonth: normalizeNullableNumber(
    body.limits?.sponsorshipPostsPerMonth
  ),
  dealRequestsPerMonth: normalizeNullableNumber(
    body.limits?.dealRequestsPerMonth
  ),
  contactRevealsPerMonth: normalizeNullableNumber(
    body.limits?.contactRevealsPerMonth
  ),

matchUsesPerMonth: normalizeNullableNumber(body.limits?.matchUsesPerMonth),

  maxPostBudgetAmount: normalizeNullableNumber(body.limits?.maxPostBudgetAmount),
  maxVisibleBudgetAmount: normalizeNullableNumber(
    body.limits?.maxVisibleBudgetAmount
  ),
};

if (
  limits.maxPostBudgetAmount !== null &&
  limits.maxVisibleBudgetAmount !== null &&
  limits.maxPostBudgetAmount > limits.maxVisibleBudgetAmount
) {
  return buildNoStoreResponse(
    {
      success: false,
      message: "maxPostBudgetAmount cannot exceed maxVisibleBudgetAmount.",
    },
    400
  );
}

    const plan = await Plan.create({
      code,
      role,
      name,
      description:
        typeof body.description === "string" ? body.description.trim() : "",

      price,
      currency: "INR",
      interval,
      durationInDays,
      extraDays,

      postingLimitPerDay: normalizeNullableNumber(body.postingLimitPerDay),
      dealRequestLimitPerDay: normalizeNullableNumber(
        body.dealRequestLimitPerDay
      ),

      canPublish: body.canPublish !== false,
      canContact: body.canContact !== false,
      canUseMatch: body.canUseMatch !== false,
      canRevealContact: body.canRevealContact !== false,

      budgetMin,
      budgetMax,
      features,
limits,

      isActive: body.isActive !== false,
      isArchived: false,
      isVisible: body.isVisible !== false,

      visibleToRoles: normalizeVisibleToRoles(body.visibleToRoles),
      visibleToLoggedOut: Boolean(body.visibleToLoggedOut),

      sortOrder:
        typeof body.sortOrder === "number" && body.sortOrder >= 0
          ? body.sortOrder
          : typeof body.sortOrder === "string" && Number(body.sortOrder) >= 0
          ? Number(body.sortOrder)
          : 0,

      metadata:
        body.metadata &&
        typeof body.metadata === "object" &&
        !Array.isArray(body.metadata)
          ? body.metadata
          : {},

      createdBy: access.adminUser._id,
      updatedBy: access.adminUser._id,
    });

    await safeLogAudit({
      actorId: access.adminUser._id,
      action: "PLAN_CREATED",
      entityType: "PLAN",
      entityId: plan._id,
      severity: "INFO",
      request,
    });

    return buildNoStoreResponse(
      {
        success: true,
        message: "Plan created successfully.",
        plan: sanitizePlan(plan),
      },
      201
    );
  } catch (error) {
    console.error("POST /api/admin/plans error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to create plan." },
      500
    );
  }
}