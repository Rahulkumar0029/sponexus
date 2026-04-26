export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";
import Plan from "@/lib/models/Plan";

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

    isActive: Boolean(plan.isActive),
    isArchived: Boolean(plan.isArchived),
    isVisible: Boolean(plan.isVisible),
    visibleToRoles: Array.isArray(plan.visibleToRoles) ? plan.visibleToRoles : [],
    visibleToLoggedOut: Boolean(plan.visibleToLoggedOut),

    sortOrder: typeof plan.sortOrder === "number" ? plan.sortOrder : 0,
    metadata: plan.metadata ?? {},

    createdAt: plan.createdAt || null,
    updatedAt: plan.updatedAt || null,
  };
}

function isAllowedRole(role: string | null): role is "ORGANIZER" | "SPONSOR" {
  return role === "ORGANIZER" || role === "SPONSOR";
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const requestedRoleRaw = searchParams.get("role");
    const requestedRole = requestedRoleRaw?.trim().toUpperCase() ?? null;

    if (requestedRole && !isAllowedRole(requestedRole)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Invalid role filter.",
        },
        400
      );
    }

    const token = request.cookies.get("auth-token")?.value;
    const decoded = token ? verifyAccessToken(token) : null;
    const isAuthenticated = Boolean(decoded?.userId);

    const query: Record<string, any> = {
      isActive: true,
      isArchived: false,
      isVisible: true,
    };

    if (!isAuthenticated) {
      query.visibleToLoggedOut = true;
    }

    if (requestedRole) {
      query.role = { $in: [requestedRole, "BOTH"] };
    }

    const plans = await Plan.find(query)
      .sort({ sortOrder: 1, price: 1, createdAt: 1 })
      .select(
        "_id code role name description price currency interval durationInDays extraDays postingLimitPerDay dealRequestLimitPerDay canPublish canContact canUseMatch canRevealContact budgetMin budgetMax isActive isArchived isVisible visibleToRoles visibleToLoggedOut sortOrder metadata createdAt updatedAt"
      )
      .lean();

    return buildNoStoreResponse(
      {
        success: true,
        data: plans.map((plan) => sanitizePlan(plan)),
      },
      200
    );
  } catch (error) {
    console.error("GET /api/plans error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message: "Failed to fetch plans.",
      },
      500
    );
  }
}