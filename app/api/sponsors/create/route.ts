import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";
import {
  EventDeliverable,
  EVENT_DELIVERABLE_OPTIONS,
} from "@/types/event";

const ALLOWED_DELIVERABLES = new Set<string>(EVENT_DELIVERABLE_OPTIONS);

const MAX_BRAND_NAME_LENGTH = 120;
const MAX_COMPANY_NAME_LENGTH = 120;
const MAX_WEBSITE_LENGTH = 500;
const MAX_EMAIL_LENGTH = 320;
const MAX_PHONE_LENGTH = 20;
const MAX_INDUSTRY_LENGTH = 80;
const MAX_COMPANY_SIZE_LENGTH = 50;
const MAX_ABOUT_LENGTH = 3000;
const MAX_LOGO_URL_LENGTH = 2000;
const MAX_TARGET_AUDIENCE_LENGTH = 120;
const MAX_SOCIAL_URL_LENGTH = 500;
const MAX_ARRAY_ITEMS = 20;
const MAX_ARRAY_ITEM_LENGTH = 80;

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

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((v) => clean(v))
        .filter(
          (item) =>
            Boolean(item) && item.length > 0 && item.length <= MAX_ARRAY_ITEM_LENGTH
        )
    ),
  ].slice(0, MAX_ARRAY_ITEMS);
}

function normalizeDeliverables(value: unknown): EventDeliverable[] {
  const items = normalizeArray(value);

  return items.filter((item): item is EventDeliverable =>
    ALLOWED_DELIVERABLES.has(item)
  );
}

function isSafeLength(value: string, max: number) {
  return value.length <= max;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhoneNumber(value: string) {
  const normalized = value.replace(/[\s()+-]/g, "");
  return /^\d{7,15}$/.test(normalized);
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeSponsorForResponse(profile: any) {
  if (!profile) return null;

  const plain =
    typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

  plain.userId = undefined;

  return plain;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required" },
        401
      );
    }

    const user = await User.findById(currentUser._id).select(
      "_id role companyName phone bio"
    );

    if (!user) {
      return buildNoStoreResponse(
        { success: false, message: "User not found" },
        404
      );
    }

    if (user.role !== "SPONSOR") {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Only sponsors can create or update sponsor profiles",
        },
        403
      );
    }

    const body = await request.json();

    const brandName = clean(body.brandName);
    const companyName = clean(body.companyName);
    const website = clean(body.website);
    const officialEmail = clean(body.officialEmail).toLowerCase();
    const phone = clean(body.phone);
    const industry = clean(body.industry);
    const companySize = clean(body.companySize);
    const about = clean(body.about);
    const logoUrl = clean(body.logoUrl);
    const targetAudience = clean(body.targetAudience);
    const preferredCategories = normalizeArray(body.preferredCategories);
    const preferredLocations = normalizeArray(body.preferredLocations);
    const sponsorshipInterests = normalizeDeliverables(body.sponsorshipInterests);
    const instagramUrl = clean(body.instagramUrl);
    const linkedinUrl = clean(body.linkedinUrl);
    const isPublic = typeof body.isPublic === "boolean" ? body.isPublic : true;

    if (!brandName) {
      return buildNoStoreResponse(
        { success: false, message: "Brand name is required" },
        400
      );
    }

    if (!isSafeLength(brandName, MAX_BRAND_NAME_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Brand name cannot exceed ${MAX_BRAND_NAME_LENGTH} characters`,
        },
        400
      );
    }

    if (!companyName) {
      return buildNoStoreResponse(
        { success: false, message: "Company name is required" },
        400
      );
    }

    if (!isSafeLength(companyName, MAX_COMPANY_NAME_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Company name cannot exceed ${MAX_COMPANY_NAME_LENGTH} characters`,
        },
        400
      );
    }

    if (website) {
      if (!isSafeLength(website, MAX_WEBSITE_LENGTH) || !isValidHttpUrl(website)) {
        return buildNoStoreResponse(
          { success: false, message: "Website must be a valid URL" },
          400
        );
      }
    }

    if (!officialEmail) {
      return buildNoStoreResponse(
        { success: false, message: "Official email is required" },
        400
      );
    }

    if (!isSafeLength(officialEmail, MAX_EMAIL_LENGTH) || !isValidEmail(officialEmail)) {
      return buildNoStoreResponse(
        { success: false, message: "Official email must be a valid email address" },
        400
      );
    }

    if (!phone) {
      return buildNoStoreResponse(
        { success: false, message: "Phone number is required" },
        400
      );
    }

    if (!isSafeLength(phone, MAX_PHONE_LENGTH) || !isValidPhoneNumber(phone)) {
      return buildNoStoreResponse(
        { success: false, message: "Phone number must be valid" },
        400
      );
    }

    if (!industry) {
      return buildNoStoreResponse(
        { success: false, message: "Industry is required" },
        400
      );
    }

    if (!isSafeLength(industry, MAX_INDUSTRY_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Industry cannot exceed ${MAX_INDUSTRY_LENGTH} characters`,
        },
        400
      );
    }

    if (companySize && !isSafeLength(companySize, MAX_COMPANY_SIZE_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Company size cannot exceed ${MAX_COMPANY_SIZE_LENGTH} characters`,
        },
        400
      );
    }

    if (about && !isSafeLength(about, MAX_ABOUT_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `About cannot exceed ${MAX_ABOUT_LENGTH} characters`,
        },
        400
      );
    }

    if (logoUrl) {
      if (!isSafeLength(logoUrl, MAX_LOGO_URL_LENGTH) || !isValidHttpUrl(logoUrl)) {
        return buildNoStoreResponse(
          { success: false, message: "Logo URL must be a valid URL" },
          400
        );
      }
    }

    if (
      targetAudience &&
      !isSafeLength(targetAudience, MAX_TARGET_AUDIENCE_LENGTH)
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Target audience cannot exceed ${MAX_TARGET_AUDIENCE_LENGTH} characters`,
        },
        400
      );
    }

    if (instagramUrl) {
      if (
        !isSafeLength(instagramUrl, MAX_SOCIAL_URL_LENGTH) ||
        !isValidHttpUrl(instagramUrl)
      ) {
        return buildNoStoreResponse(
          { success: false, message: "Instagram URL must be a valid URL" },
          400
        );
      }
    }

    if (linkedinUrl) {
      if (
        !isSafeLength(linkedinUrl, MAX_SOCIAL_URL_LENGTH) ||
        !isValidHttpUrl(linkedinUrl)
      ) {
        return buildNoStoreResponse(
          { success: false, message: "LinkedIn URL must be a valid URL" },
          400
        );
      }
    }

    if (
      Array.isArray(body.sponsorshipInterests) &&
      sponsorshipInterests.length !==
        [
          ...new Set(
            body.sponsorshipInterests
              .map((item: unknown) => clean(item))
              .filter(Boolean)
          ),
        ].length
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "One or more sponsorshipInterests values are invalid",
        },
        400
      );
    }

    const profileData = {
      userId: user._id,
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

    return buildNoStoreResponse(
      {
        success: true,
        message: "Sponsor profile saved successfully",
        sponsor: sanitizeSponsorForResponse(sponsorProfile),
      },
      200
    );
  } catch (error) {
    console.error("Error saving sponsor profile:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      const firstError = Object.values(error.errors)[0];
      return buildNoStoreResponse(
        {
          success: false,
          message: firstError?.message || "Validation failed",
        },
        400
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: "A sponsor profile with these details already exists",
        },
        409
      );
    }

    return buildNoStoreResponse(
      { success: false, message: "Failed to save sponsor profile" },
      500
    );
  }
}