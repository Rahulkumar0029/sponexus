import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";
import { checkUsageLimit } from "@/lib/subscription/checkUsageLimit";
import { incrementUsage } from "@/lib/subscription/enforceLimits";
import { ACTIONS } from "@/lib/subscription/constants";
import { createNotification } from "@/lib/notifications/createNotification";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const MIN_AUDIENCE = 50;
const MIN_BUDGET = 2000;
const MAX_TITLE_LENGTH = 150;
const MAX_TYPE_LENGTH = 80;
const MAX_CATEGORY_LENGTH = 80;
const MAX_LOCATION_LENGTH = 120;
const MAX_CITY_LENGTH = 120;
const MAX_CAMPAIGN_GOAL_LENGTH = 500;
const MAX_DELIVERABLES_LENGTH = 2000;
const MAX_CUSTOM_MESSAGE_LENGTH = 3000;
const MAX_CONTACT_PERSON_LENGTH = 120;
const MAX_PHONE_LENGTH = 20;
const MAX_BUDGET = 100000000;
const MAX_TARGET_AUDIENCE = 100000000;

function isSafeLength(value: string, max: number) {
  return value.length <= max;
}

function isValidPhoneNumber(value: string) {
  const normalized = value.replace(/[\s()+-]/g, "");
  return /^\d{7,15}$/.test(normalized);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await User.findById(currentUser._id).select(
      "_id role email adminRole"
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "SPONSOR") {
      return NextResponse.json(
        { success: false, message: "Only sponsors can create sponsorships" },
        { status: 403 }
      );
    }

    const sponsorProfile = await Sponsor.findOne({ userId: user._id }).select(
      "_id userId isProfileComplete"
    );

    if (!sponsorProfile || !sponsorProfile.isProfileComplete) {
      return NextResponse.json(
        { success: false, message: "Complete your sponsor profile first" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const sponsorshipTitle = clean(body.sponsorshipTitle);
    const sponsorshipType = clean(body.sponsorshipType);
    const category = clean(body.category);
    const locationPreference = clean(body.locationPreference);
    const campaignGoal = clean(body.campaignGoal);
    const contactPhone = clean(body.contactPhone);
    const city = clean(body.city);
    const deliverablesExpected = clean(body.deliverablesExpected);
    const customMessage = clean(body.customMessage);
    const contactPersonName = clean(body.contactPersonName);

    const targetAudienceValue = Number(body.targetAudience);
    const budgetValue = Number(body.budget);
    const applicationDeadline = body.applicationDeadline;

    if (!sponsorshipTitle) {
      return NextResponse.json(
        { success: false, message: "Sponsorship title is required" },
        { status: 400 }
      );
    }

    if (!isSafeLength(sponsorshipTitle, MAX_TITLE_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `Sponsorship title cannot exceed ${MAX_TITLE_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (!sponsorshipType) {
      return NextResponse.json(
        { success: false, message: "Sponsorship type is required" },
        { status: 400 }
      );
    }

    if (!isSafeLength(sponsorshipType, MAX_TYPE_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `Sponsorship type cannot exceed ${MAX_TYPE_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category is required" },
        { status: 400 }
      );
    }

    if (!isSafeLength(category, MAX_CATEGORY_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `Category cannot exceed ${MAX_CATEGORY_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (!locationPreference) {
      return NextResponse.json(
        { success: false, message: "Location preference is required" },
        { status: 400 }
      );
    }

    if (!isSafeLength(locationPreference, MAX_LOCATION_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `Location preference cannot exceed ${MAX_LOCATION_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (!campaignGoal) {
      return NextResponse.json(
        { success: false, message: "Campaign goal is required" },
        { status: 400 }
      );
    }

    if (!isSafeLength(campaignGoal, MAX_CAMPAIGN_GOAL_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `Campaign goal cannot exceed ${MAX_CAMPAIGN_GOAL_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (city && !isSafeLength(city, MAX_CITY_LENGTH)) {
      return NextResponse.json(
        {
          success: false,
          message: `City cannot exceed ${MAX_CITY_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (
      deliverablesExpected &&
      !isSafeLength(deliverablesExpected, MAX_DELIVERABLES_LENGTH)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Deliverables expected cannot exceed ${MAX_DELIVERABLES_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (
      customMessage &&
      !isSafeLength(customMessage, MAX_CUSTOM_MESSAGE_LENGTH)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Custom message cannot exceed ${MAX_CUSTOM_MESSAGE_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (
      contactPersonName &&
      !isSafeLength(contactPersonName, MAX_CONTACT_PERSON_LENGTH)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Contact person name cannot exceed ${MAX_CONTACT_PERSON_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (!contactPhone) {
      return NextResponse.json(
        { success: false, message: "Contact phone is required" },
        { status: 400 }
      );
    }

    if (
      !isSafeLength(contactPhone, MAX_PHONE_LENGTH) ||
      !isValidPhoneNumber(contactPhone)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact phone must be a valid phone number",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(targetAudienceValue) ||
      !Number.isInteger(targetAudienceValue) ||
      targetAudienceValue < MIN_AUDIENCE ||
      targetAudienceValue > MAX_TARGET_AUDIENCE
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum audience must be at least ${MIN_AUDIENCE}`,
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(budgetValue) ||
      budgetValue < MIN_BUDGET ||
      budgetValue > MAX_BUDGET
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum budget must be at least ₹${MIN_BUDGET}`,
        },
        { status: 400 }
      );
    }

    const usage = await checkUsageLimit({
      userId: String(user._id),
      role: "SPONSOR",
      action: ACTIONS.PUBLISH_SPONSORSHIP,
      amount: budgetValue,
    });

    if (!usage.allowed) {
      return NextResponse.json(
        {
          success: false,
          message:
            usage.message ||
            "Upgrade your subscription to create sponsorship posts on Sponexus.",
          requiresUpgrade: true,
          usage: {
            dailyLimit: usage.dailyLimit ?? null,
            monthlyLimit: usage.monthlyLimit ?? null,
            dailyUsed: usage.dailyUsed ?? null,
            monthlyUsed: usage.monthlyUsed ?? null,
          },
        },
        { status: 403 }
      );
    }

    if (!applicationDeadline) {
      return NextResponse.json(
        { success: false, message: "Application deadline is required" },
        { status: 400 }
      );
    }

    const selectedDate = new Date(applicationDeadline);
    const now = new Date();

    if (Number.isNaN(selectedDate.getTime()) || selectedDate <= now) {
      return NextResponse.json(
        {
          success: false,
          message: "Application deadline must be in the future",
        },
        { status: 400 }
      );
    }

    const sponsorship = await Sponsorship.create({
      sponsorOwnerId: user._id,
      sponsorProfileId: sponsorProfile._id,
      sponsorshipTitle,
      sponsorshipType,
      budget: budgetValue,
      targetAudience: String(targetAudienceValue),
      category,
      city,
      locationPreference,
      campaignGoal,
      deliverablesExpected,
      customMessage,
      bannerRequirement: Boolean(body.bannerRequirement),
      stallRequirement: Boolean(body.stallRequirement),
      mikeAnnouncement: Boolean(body.mikeAnnouncement),
      socialMediaMention: Boolean(body.socialMediaMention),
      productDisplay: Boolean(body.productDisplay),
      contactPersonName,
      contactPhone,
      status: "active",
      expiresAt: selectedDate,
    });

    await incrementUsage({
      userId: String(user._id),
      role: "SPONSOR",
      action: ACTIONS.PUBLISH_SPONSORSHIP,
      subscriptionId: usage.subscriptionId || null,
      planId: usage.planId || null,
    });

try {
  await createNotification({
    userId: user._id,
    type: "SPONSORSHIP_CREATED",
    title: "Sponsorship published",
    message: "Your sponsorship opportunity is now live on Sponexus.",
    link: `/sponsorships/${sponsorship._id}`,
    metadata: {
      sponsorshipId: String(sponsorship._id),
    },
  });
} catch (notificationError) {
  console.error("Sponsorship created notification error:", notificationError);
}

    return NextResponse.json(
      {
        success: true,
        message: "Sponsorship created successfully",
        data: sponsorship,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating sponsorship:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const firstError = Object.values(error.errors)[0];
      return NextResponse.json(
        {
          success: false,
          message: firstError?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create sponsorship",
      },
      { status: 500 }
    );
  }
}