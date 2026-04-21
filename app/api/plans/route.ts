import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import Plan from "@/lib/models/Plan";
import { PLAN_CODES, PLAN_PRICING } from "@/lib/subscription/constants";

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
    description: plan.description,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    durationInDays: plan.durationInDays,
    postingLimit: plan.postingLimit,
    canPublish: Boolean(plan.canPublish),
    canContact: Boolean(plan.canContact),
    canUseMatch: Boolean(plan.canUseMatch),
    canRevealContact: Boolean(plan.canRevealContact),
    isActive: Boolean(plan.isActive),
    sortOrder: typeof plan.sortOrder === "number" ? plan.sortOrder : 0,
    createdAt: plan.createdAt || null,
    updatedAt: plan.updatedAt || null,
  };
}

export async function GET() {
  try {
    await connectDB();

    let plans = await Plan.find({ isActive: true })
      .sort({ sortOrder: 1, price: 1, createdAt: 1 })
      .select(
        "_id code role name description price currency interval durationInDays postingLimit canPublish canContact canUseMatch canRevealContact isActive sortOrder createdAt updatedAt"
      )
      .lean();

    if (!plans || plans.length === 0) {
      const defaultPlans = [
        {
          code: PLAN_CODES.ORGANIZER_MONTHLY,
          role: "ORGANIZER",
          name: "Organizer Pro Monthly",
          description:
            "Publish unlimited events, appear in sponsor discovery, and unlock organizer-side paid actions.",
          price: PLAN_PRICING[PLAN_CODES.ORGANIZER_MONTHLY],
          currency: "INR",
          interval: "MONTHLY",
          durationInDays: 30,
          postingLimit: null,
          canPublish: true,
          canContact: true,
          canUseMatch: true,
          canRevealContact: true,
          isActive: true,
          sortOrder: 1,
        },
        {
          code: PLAN_CODES.SPONSOR_MONTHLY,
          role: "SPONSOR",
          name: "Sponsor Pro Monthly",
          description:
            "Publish unlimited sponsor posts, contact organizers, and unlock sponsor-side paid actions.",
          price: PLAN_PRICING[PLAN_CODES.SPONSOR_MONTHLY],
          currency: "INR",
          interval: "MONTHLY",
          durationInDays: 30,
          postingLimit: null,
          canPublish: true,
          canContact: true,
          canUseMatch: true,
          canRevealContact: true,
          isActive: true,
          sortOrder: 2,
        },
        {
          code: PLAN_CODES.ORGANIZER_YEARLY,
          role: "ORGANIZER",
          name: "Organizer Pro Yearly",
          description:
            "Yearly access for organizers with 12 months value at 11 months pricing.",
          price: PLAN_PRICING[PLAN_CODES.ORGANIZER_YEARLY],
          currency: "INR",
          interval: "YEARLY",
          durationInDays: 365,
          postingLimit: null,
          canPublish: true,
          canContact: true,
          canUseMatch: true,
          canRevealContact: true,
          isActive: true,
          sortOrder: 3,
        },
        {
          code: PLAN_CODES.SPONSOR_YEARLY,
          role: "SPONSOR",
          name: "Sponsor Pro Yearly",
          description:
            "Yearly access for sponsors with 12 months value at 11 months pricing.",
          price: PLAN_PRICING[PLAN_CODES.SPONSOR_YEARLY],
          currency: "INR",
          interval: "YEARLY",
          durationInDays: 365,
          postingLimit: null,
          canPublish: true,
          canContact: true,
          canUseMatch: true,
          canRevealContact: true,
          isActive: true,
          sortOrder: 4,
        },
      ];

      await Plan.insertMany(defaultPlans, { ordered: false });

      plans = await Plan.find({ isActive: true })
        .sort({ sortOrder: 1, price: 1, createdAt: 1 })
        .select(
          "_id code role name description price currency interval durationInDays postingLimit canPublish canContact canUseMatch canRevealContact isActive sortOrder createdAt updatedAt"
        )
        .lean();
    }

    return buildNoStoreResponse(
      {
        success: true,
        plans: plans.map((plan) => sanitizePlan(plan)),
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