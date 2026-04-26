import mongoose from "mongoose";
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
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
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
function normalizeNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function normalizeVisibleToRoles(value: unknown): PlanRole[] {
  if (!Array.isArray(value)) return ["BOTH"];

  const allowed = new Set<PlanRole>(["ORGANIZER", "SPONSOR", "BOTH"]);

  const roles = value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toUpperCase() as PlanRole)
    .filter((v) => allowed.has(v));

  return roles.length > 0 ? Array.from(new Set(roles)) : ["BOTH"];
}

async function getPlanByIdOrFail(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return {
      ok: false as const,
      response: buildNoStoreResponse(
        { success: false, message: "Invalid plan id." },
        400
      ),
    };
  }

  const plan = await Plan.findById(id);

  if (!plan) {
    return {
      ok: false as const,
      response: buildNoStoreResponse(
        { success: false, message: "Plan not found." },
        404
      ),
    };
  }

  return { ok: true as const, plan };
}

/* ===============================
   GET
=================================*/
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();

  const access = await requirePaymentAdminAccess();
  if (!access.ok) return access.response;

  const result = await getPlanByIdOrFail(params.id);
  if (!result.ok) return result.response;

  return buildNoStoreResponse(
    {
      success: true,
      plan: sanitizePlan(result.plan),
    },
    200
  );
}

/* ===============================
   PATCH
=================================*/
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();

  const access = await requirePaymentAdminAccess();
  if (!access.ok) return access.response;

  const result = await getPlanByIdOrFail(params.id);
  if (!result.ok) return result.response;

  const plan = result.plan;
  const before = sanitizePlan(plan);
  const body = await request.json();

  if (typeof body.code === "string") {
    const code = body.code.trim().toUpperCase();

    if (!code) {
      return buildNoStoreResponse(
        { success: false, message: "Code cannot be empty." },
        400
      );
    }

    const exists = await Plan.findOne({
      code,
      _id: { $ne: plan._id },
    });

    if (exists) {
      return buildNoStoreResponse(
        { success: false, message: "Duplicate plan code." },
        409
      );
    }

    plan.code = code;
  }

  if (typeof body.name === "string") {
    const name = body.name.trim();

    if (!name) {
      return buildNoStoreResponse(
        { success: false, message: "Name cannot be empty." },
        400
      );
    }

    plan.name = name;
  }

  if (typeof body.description === "string") {
    plan.description = body.description.trim();
  }

  if (typeof body.role === "string") {
    const role = body.role.trim().toUpperCase() as PlanRole;

    if (!["ORGANIZER", "SPONSOR", "BOTH"].includes(role)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid role." },
        400
      );
    }

    plan.role = role;
  }

  if (typeof body.interval === "string") {
    const interval = body.interval.trim().toUpperCase();

    if (!["MONTHLY", "YEARLY", "CUSTOM"].includes(interval)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid interval." },
        400
      );
    }

    plan.interval = interval;
  }

  if (body.price !== undefined) {
    const price = Number(body.price);

    if (!Number.isFinite(price) || price < 0) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid price." },
        400
      );
    }

    plan.price = price;
  }

  if (body.durationInDays !== undefined) {
    const duration = Number(body.durationInDays);

    if (!Number.isFinite(duration) || duration < 1) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid duration." },
        400
      );
    }

    plan.durationInDays = duration;
  }

  if (body.extraDays !== undefined) {
    const extra = Number(body.extraDays);

    if (!Number.isFinite(extra) || extra < 0) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid extraDays." },
        400
      );
    }

    plan.extraDays = extra;
  }

  if (body.postingLimitPerDay !== undefined) {
    plan.postingLimitPerDay = normalizeNullableNumber(body.postingLimitPerDay);
  }

  if (body.dealRequestLimitPerDay !== undefined) {
    plan.dealRequestLimitPerDay = normalizeNullableNumber(
      body.dealRequestLimitPerDay
    );
  }

  if (body.budgetMin !== undefined) {
    plan.budgetMin = normalizeNullableNumber(body.budgetMin);
  }

  if (body.budgetMax !== undefined) {
    plan.budgetMax = normalizeNullableNumber(body.budgetMax);
  }

  if (
    plan.budgetMin != null &&
    plan.budgetMax != null &&
    plan.budgetMin > plan.budgetMax
  ) {
    return buildNoStoreResponse(
      { success: false, message: "Invalid budget range." },
      400
    );
  }

  if (body.canPublish !== undefined) plan.canPublish = Boolean(body.canPublish);
  if (body.canContact !== undefined) plan.canContact = Boolean(body.canContact);
  if (body.canUseMatch !== undefined) plan.canUseMatch = Boolean(body.canUseMatch);
  if (body.canRevealContact !== undefined) {
    plan.canRevealContact = Boolean(body.canRevealContact);
  }
if (body.features && typeof body.features === "object" && !Array.isArray(body.features)) {
  plan.features = {
    ...(plan.features || {}),
    ...(body.features.canPublishEvent !== undefined && {
      canPublishEvent: Boolean(body.features.canPublishEvent),
    }),
    ...(body.features.canPublishSponsorship !== undefined && {
      canPublishSponsorship: Boolean(body.features.canPublishSponsorship),
    }),
    ...(body.features.canUseMatch !== undefined && {
      canUseMatch: Boolean(body.features.canUseMatch),
    }),
    ...(body.features.canRevealContact !== undefined && {
      canRevealContact: Boolean(body.features.canRevealContact),
    }),
    ...(body.features.canSendDealRequest !== undefined && {
      canSendDealRequest: Boolean(body.features.canSendDealRequest),
    }),
  };
}

if (body.limits && typeof body.limits === "object" && !Array.isArray(body.limits)) {
  const nextLimits = {
    ...(plan.limits || {}),
  };

 const limitFields = [
  "eventPostsPerDay",
  "sponsorshipPostsPerDay",
  "dealRequestsPerDay",
  "contactRevealsPerDay",
  "matchUsesPerDay",
  "eventPostsPerMonth",
  "sponsorshipPostsPerMonth",
  "dealRequestsPerMonth",
  "contactRevealsPerMonth",
  "matchUsesPerMonth",
  "maxPostBudgetAmount",
  "maxVisibleBudgetAmount",
] as const;

  for (const field of limitFields) {
    if (body.limits[field] !== undefined) {
      nextLimits[field] = normalizeNullableNumber(body.limits[field]);
    }
  }

  if (
    nextLimits.maxPostBudgetAmount != null &&
    nextLimits.maxVisibleBudgetAmount != null &&
    nextLimits.maxPostBudgetAmount > nextLimits.maxVisibleBudgetAmount
  ) {
    return buildNoStoreResponse(
      {
        success: false,
        message: "maxPostBudgetAmount cannot exceed maxVisibleBudgetAmount.",
      },
      400
    );
  }

  plan.limits = nextLimits;
}

  if (body.isActive !== undefined) plan.isActive = Boolean(body.isActive);
  if (body.isArchived !== undefined) plan.isArchived = Boolean(body.isArchived);
  if (body.isVisible !== undefined) plan.isVisible = Boolean(body.isVisible);

  if (body.visibleToRoles !== undefined) {
    plan.visibleToRoles = normalizeVisibleToRoles(body.visibleToRoles);
  }

  if (body.visibleToLoggedOut !== undefined) {
    plan.visibleToLoggedOut = Boolean(body.visibleToLoggedOut);
  }

  if (body.sortOrder !== undefined) {
    const sort = Number(body.sortOrder);

    if (!Number.isFinite(sort) || sort < 0) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid sortOrder." },
        400
      );
    }

    plan.sortOrder = sort;
  }

  if (body.metadata !== undefined) {
    if (
      typeof body.metadata !== "object" ||
      body.metadata === null ||
      Array.isArray(body.metadata)
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid metadata." },
        400
      );
    }

    plan.metadata = body.metadata;
  }

  plan.updatedBy = access.adminUser._id;
  await plan.save();

  await safeLogAudit({
    actorId: access.adminUser._id,
    action: "PLAN_UPDATED",
    entityType: "PLAN",
    entityId: plan._id,
    severity: "INFO",
    request,
    metadata: {
      before,
      after: sanitizePlan(plan),
    },
  });

  return buildNoStoreResponse(
    {
      success: true,
      message: "Plan updated.",
      plan: sanitizePlan(plan),
    },
    200
  );
}

/* ===============================
   DELETE (ARCHIVE)
=================================*/
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDB();

  const access = await requirePaymentAdminAccess();
  if (!access.ok) return access.response;

  const result = await getPlanByIdOrFail(params.id);
  if (!result.ok) return result.response;

  const plan = result.plan;

  plan.isArchived = true;
  plan.isActive = false;
  plan.isVisible = false;
  plan.updatedBy = access.adminUser._id;

  await plan.save();

  await safeLogAudit({
    actorId: access.adminUser._id,
    action: "PLAN_ARCHIVED",
    entityType: "PLAN",
    entityId: plan._id,
    severity: "WARN",
    request,
  });

  return buildNoStoreResponse(
    {
      success: true,
      message: "Plan archived.",
      plan: sanitizePlan(plan),
    },
    200
  );
}