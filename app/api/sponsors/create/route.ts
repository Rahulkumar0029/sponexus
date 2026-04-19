import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";
import { EventDeliverable } from "@/types/event";

const ALLOWED_DELIVERABLES: EventDeliverable[] = [
  "STAGE_BRANDING",
  "STALL_SPACE",
  "SOCIAL_MEDIA_PROMOTION",
  "PRODUCT_DISPLAY",
  "ANNOUNCEMENTS",
  "EMAIL_PROMOTION",
  "TITLE_SPONSORSHIP",
  "CO_BRANDING",
];

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v).trim()).filter(Boolean))];
}

function normalizeDeliverables(value: unknown): EventDeliverable[] {
  const items = normalizeArray(value);
  return items.filter((item): item is EventDeliverable =>
    ALLOWED_DELIVERABLES.includes(item as EventDeliverable)
  );
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

    const user = await User.findById(currentUser._id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "SPONSOR") {
      return NextResponse.json(
        { success: false, message: "Only sponsors can create or update sponsor profiles" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      brandName,
      companyName,
      website,
      officialEmail,
      phone,
      industry,
      companySize,
      about,
      logoUrl,
      targetAudience,
      preferredCategories,
      preferredLocations,
      sponsorshipInterests,
      instagramUrl,
      linkedinUrl,
      isPublic,
    } = body;

    const normalizedBrandName = String(brandName || "").trim();
    const normalizedCompanyName = String(companyName || "").trim();
    const normalizedOfficialEmail = String(officialEmail || "").trim().toLowerCase();
    const normalizedPhone = String(phone || "").trim();
    const normalizedIndustry = String(industry || "").trim();

    if (!normalizedBrandName) {
      return NextResponse.json(
        { success: false, message: "Brand name is required" },
        { status: 400 }
      );
    }

    if (!normalizedCompanyName) {
      return NextResponse.json(
        { success: false, message: "Company name is required" },
        { status: 400 }
      );
    }

    if (!normalizedOfficialEmail) {
      return NextResponse.json(
        { success: false, message: "Official email is required" },
        { status: 400 }
      );
    }

    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, message: "Phone number is required" },
        { status: 400 }
      );
    }

    if (!normalizedIndustry) {
      return NextResponse.json(
        { success: false, message: "Industry is required" },
        { status: 400 }
      );
    }

    const profileData = {
      userId: user._id,
      brandName: normalizedBrandName,
      companyName: normalizedCompanyName,
      website: String(website || "").trim(),
      officialEmail: normalizedOfficialEmail,
      phone: normalizedPhone,
      industry: normalizedIndustry,
      companySize: String(companySize || "").trim(),
      about: String(about || "").trim(),
      logoUrl: String(logoUrl || "").trim(),
      targetAudience: String(targetAudience || "").trim(),
      preferredCategories: normalizeArray(preferredCategories),
      preferredLocations: normalizeArray(preferredLocations),
      sponsorshipInterests: normalizeDeliverables(sponsorshipInterests),
      instagramUrl: String(instagramUrl || "").trim(),
      linkedinUrl: String(linkedinUrl || "").trim(),
      isPublic: typeof isPublic === "boolean" ? isPublic : true,
    };

    const isProfileComplete = Boolean(
      profileData.brandName &&
        profileData.companyName &&
        profileData.officialEmail &&
        profileData.phone &&
        profileData.industry
    );

    const sponsorProfile = await Sponsor.findOneAndUpdate(
      { userId: user._id },
      {
        ...profileData,
        isProfileComplete,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    user.companyName = profileData.companyName || user.companyName || "";
    user.phone = profileData.phone || user.phone || "";
    user.bio = profileData.about || user.bio || "";
    await user.save();

    return NextResponse.json(
      {
        success: true,
        message: "Sponsor profile saved successfully",
        sponsor: sponsorProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving sponsor profile:", error);

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

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A sponsor profile with these details already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to save sponsor profile" },
      { status: 500 }
    );
  }
}