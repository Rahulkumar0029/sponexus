import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";

// 🧠 Helper
function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const MIN_AUDIENCE = 50;
const MIN_BUDGET = 2000;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // ✅ AUTH (FIXED)
    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await User.findById(currentUser._id);

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

    // ✅ GET SPONSOR PROFILE
    const sponsorProfile = await Sponsor.findOne({ userId: user._id });

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

    const targetAudienceValue = Number(body.targetAudience);
    const budgetValue = Number(body.budget);

    const applicationDeadline = body.applicationDeadline;

    // 🔴 VALIDATION

    if (!sponsorshipTitle) {
      return NextResponse.json(
        { success: false, message: "Sponsorship title is required" },
        { status: 400 }
      );
    }

    if (!sponsorshipType) {
      return NextResponse.json(
        { success: false, message: "Sponsorship type is required" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category is required" },
        { status: 400 }
      );
    }

    if (!locationPreference) {
      return NextResponse.json(
        { success: false, message: "Location preference is required" },
        { status: 400 }
      );
    }

    if (!campaignGoal) {
      return NextResponse.json(
        { success: false, message: "Campaign goal is required" },
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
      Number.isNaN(targetAudienceValue) ||
      targetAudienceValue < MIN_AUDIENCE
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum audience must be at least ${MIN_AUDIENCE}`,
        },
        { status: 400 }
      );
    }

    if (Number.isNaN(budgetValue) || budgetValue < MIN_BUDGET) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum budget must be at least ₹${MIN_BUDGET}`,
        },
        { status: 400 }
      );
    }

    if (!applicationDeadline) {
      return NextResponse.json(
        { success: false, message: "Application deadline is required" },
        { status: 400 }
      );
    }

    const selectedDate = new Date(applicationDeadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(selectedDate.getTime()) || selectedDate <= today) {
      return NextResponse.json(
        {
          success: false,
          message: "Application deadline must be after today",
        },
        { status: 400 }
      );
    }

    // ✅ CREATE
    const sponsorship = await Sponsorship.create({
      sponsorOwnerId: user._id,
      sponsorProfileId: sponsorProfile._id,

      sponsorshipTitle,
      sponsorshipType,
      budget: budgetValue,

      // ⚠️ KEEP CONSISTENT TYPE
      targetAudience: String(targetAudienceValue),

      category,
      city: clean(body.city),
      locationPreference,
      campaignGoal,

      deliverablesExpected: clean(body.deliverablesExpected),
      customMessage: clean(body.customMessage),

      bannerRequirement: Boolean(body.bannerRequirement),
      stallRequirement: Boolean(body.stallRequirement),
      mikeAnnouncement: Boolean(body.mikeAnnouncement),
      socialMediaMention: Boolean(body.socialMediaMention),
      productDisplay: Boolean(body.productDisplay),

      contactPersonName: clean(body.contactPersonName),
      contactPhone,

      status: "active",
      expiresAt: selectedDate,
    });

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