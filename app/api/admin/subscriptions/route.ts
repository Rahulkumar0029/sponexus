import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import User from "@/lib/models/User";
import Subscription from "@/lib/models/Subscription";

import { isAdminBypass } from "@/lib/subscription/isAdminBypass";
import { SUBSCRIPTION_STATUS } from "@/lib/subscription/constants";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set(["ORGANIZER", "SPONSOR"]);
const ALLOWED_STATUSES = new Set<
  | typeof SUBSCRIPTION_STATUS.ACTIVE
  | typeof SUBSCRIPTION_STATUS.GRACE
  | typeof SUBSCRIPTION_STATUS.EXPIRED
  | typeof SUBSCRIPTION_STATUS.CANCELLED
  | typeof SUBSCRIPTION_STATUS.SUSPENDED
>([
  SUBSCRIPTION_STATUS.ACTIVE,
  SUBSCRIPTION_STATUS.GRACE,
  SUBSCRIPTION_STATUS.EXPIRED,
  SUBSCRIPTION_STATUS.CANCELLED,
  SUBSCRIPTION_STATUS.SUSPENDED,
]);

type AllowedSubscriptionStatus =
  | typeof SUBSCRIPTION_STATUS.ACTIVE
  | typeof SUBSCRIPTION_STATUS.GRACE
  | typeof SUBSCRIPTION_STATUS.EXPIRED
  | typeof SUBSCRIPTION_STATUS.CANCELLED
  | typeof SUBSCRIPTION_STATUS.SUSPENDED;

const MAX_LIMIT = 100;
const MAX_QUERY_LENGTH = 120;
const MAX_NOTES_LENGTH = 2000;

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

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeSubscriptionAdminView(item: any) {
  if (!item) return null;

  const plain =
    typeof item?.toObject === "function" ? item.toObject() : { ...item };

  if (plain.userId && typeof plain.userId === "object") {
    plain.userId = {
      _id: plain.userId._id ? String(plain.userId._id) : undefined,
      firstName: plain.userId.firstName || "",
      lastName: plain.userId.lastName || "",
      name: plain.userId.name || "",
      email: plain.userId.email || "",
      companyName: plain.userId.companyName || "",
      role: plain.userId.role || "",
      adminRole: plain.userId.adminRole || "NONE",
    };
  }

  if (plain.planId && typeof plain.planId === "object") {
    plain.planId = {
      _id: plain.planId._id ? String(plain.planId._id) : undefined,
      code: plain.planId.code || "",
      name: plain.planId.name || "",
      role: plain.planId.role || "",
      price: plain.planId.price ?? null,
      currency: plain.planId.currency || "",
      interval: plain.planId.interval || "",
      durationInDays: plain.planId.durationInDays ?? null,
      isActive: Boolean(plain.planId.isActive),
    };
  }

  plain._id = plain._id ? String(plain._id) : plain._id;
  plain.userId =
    plain.userId && typeof plain.userId === "object"
      ? plain.userId
      : plain.userId
      ? String(plain.userId)
      : null;
  plain.planId =
    plain.planId && typeof plain.planId === "object"
      ? plain.planId
      : plain.planId
      ? String(plain.planId)
      : null;
  plain.lastPaymentId = plain.lastPaymentId ? String(plain.lastPaymentId) : null;

  return plain;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required." },
        401
      );
    }

    const adminUser = await User.findById(currentUser._id).select(
      "_id role adminRole accountStatus"
    );

    if (!adminUser || !isAdminBypass(adminUser)) {
      return buildNoStoreResponse(
        { success: false, message: "Admin access required." },
        403
      );
    }

    if (
      adminUser.accountStatus === "DISABLED" ||
      adminUser.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Admin access restricted." },
        403
      );
    }

    const { searchParams } = new URL(request.url);

    const role = clean(searchParams.get("role"));
    const status = clean(searchParams.get("status"));
    const q = clean(searchParams.get("q"));

    const rawPage = Number(searchParams.get("page") || 1);
    const rawLimit = Number(searchParams.get("limit") || 20);

    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit =
      Number.isNaN(rawLimit) || rawLimit < 1
        ? 20
        : Math.min(rawLimit, MAX_LIMIT);

    if (role && role !== "ALL" && !ALLOWED_ROLES.has(role)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid role filter." },
        400
      );
    }

    if (status && status !== "ALL" && !ALLOWED_STATUSES.has(status as AllowedSubscriptionStatus)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid status filter." },
        400
      );
    }

    if (q.length > MAX_QUERY_LENGTH) {
      return buildNoStoreResponse(
        { success: false, message: "Search query is too long." },
        400
      );
    }

    const query: Record<string, any> = {};

    if (role && role !== "ALL") {
      query.role = role;
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    const subscriptions = await Subscription.find(query)
      .populate(
        "planId",
        "_id code name role price currency interval durationInDays isActive"
      )
      .populate(
        "userId",
        "_id firstName lastName name email companyName role adminRole"
      )
      .sort({ updatedAt: -1, endDate: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    let filtered = subscriptions;

    if (q) {
      const search = q.toLowerCase();

      filtered = subscriptions.filter((item: any) => {
        const user = item.userId || {};
        const plan = item.planId || {};

        return (
          String(user.firstName || "").toLowerCase().includes(search) ||
          String(user.lastName || "").toLowerCase().includes(search) ||
          String(user.name || "").toLowerCase().includes(search) ||
          String(user.email || "").toLowerCase().includes(search) ||
          String(user.companyName || "").toLowerCase().includes(search) ||
          String(plan.name || "").toLowerCase().includes(search) ||
          String(plan.code || "").toLowerCase().includes(search)
        );
      });
    }

    const total = q
      ? filtered.length
      : await Subscription.countDocuments(query);

    return buildNoStoreResponse(
      {
        success: true,
        data: filtered.map((item) => sanitizeSubscriptionAdminView(item)),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      200
    );
  } catch (error) {
    console.error("GET /api/admin/subscriptions error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch subscriptions." },
      500
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required." },
        401
      );
    }

    const adminUser = await User.findById(currentUser._id).select(
      "_id role adminRole accountStatus"
    );

    if (!adminUser || !isAdminBypass(adminUser)) {
      return buildNoStoreResponse(
        { success: false, message: "Admin access required." },
        403
      );
    }

    if (
      adminUser.accountStatus === "DISABLED" ||
      adminUser.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Admin access restricted." },
        403
      );
    }

    const body = await request.json();

    const subscriptionId = clean(body.subscriptionId);
    const status = clean(body.status);
    const endDate = clean(body.endDate);
    const notes = typeof body.notes === "string" ? body.notes.trim() : undefined;

    if (!subscriptionId) {
      return buildNoStoreResponse(
        { success: false, message: "Subscription ID is required." },
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid subscription ID." },
        400
      );
    }

    if (status && !ALLOWED_STATUSES.has(status as AllowedSubscriptionStatus)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid status." },
        400
      );
    }

    if (typeof notes === "string" && notes.length > MAX_NOTES_LENGTH) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Notes cannot exceed ${MAX_NOTES_LENGTH} characters.`,
        },
        400
      );
    }

    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      return buildNoStoreResponse(
        { success: false, message: "Subscription not found." },
        404
      );
    }

    if (status) {
      subscription.status = status as AllowedSubscriptionStatus;
    }

    if (endDate) {
      const parsedEndDate = new Date(endDate);

      if (Number.isNaN(parsedEndDate.getTime())) {
        return buildNoStoreResponse(
          { success: false, message: "Invalid end date." },
          400
        );
      }

      subscription.endDate = parsedEndDate;
    }

    if (
      subscription.startDate &&
      subscription.endDate &&
      new Date(subscription.endDate) < new Date(subscription.startDate)
    ) {
      return buildNoStoreResponse(
        { success: false, message: "End date cannot be before start date." },
        400
      );
    }

    if (typeof notes === "string") {
      subscription.notes = notes;
    }

    if (
      subscription.status === SUBSCRIPTION_STATUS.ACTIVE ||
      subscription.status === SUBSCRIPTION_STATUS.GRACE
    ) {
      subscription.graceEndDate = null;
    }

    await subscription.save();

    const updated = await Subscription.findById(subscription._id)
      .populate(
        "planId",
        "_id code name role price currency interval durationInDays isActive"
      )
      .populate(
        "userId",
        "_id firstName lastName name email companyName role adminRole"
      )
      .lean();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Subscription updated successfully.",
        data: sanitizeSubscriptionAdminView(updated),
      },
      200
    );
  } catch (error) {
    console.error("PATCH /api/admin/subscriptions error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to update subscription." },
      500
    );
  }
}