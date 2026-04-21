import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Sponsor from "@/lib/models/Sponsor";
import { getCurrentUser } from "@/lib/current-user";

const MAX_NAME_LENGTH = 60;
const MAX_PHONE_LENGTH = 20;
const MAX_BIO_LENGTH = 1000;
const MAX_ORGANIZATION_NAME_LENGTH = 120;
const MAX_EVENT_FOCUS_LENGTH = 120;
const MAX_TARGET_AUDIENCE_LENGTH = 120;
const MAX_LOCATION_LENGTH = 120;
const MAX_BRAND_NAME_LENGTH = 120;
const MAX_COMPANY_NAME_LENGTH = 120;
const MAX_WEBSITE_LENGTH = 500;
const MAX_EMAIL_LENGTH = 320;
const MAX_INDUSTRY_LENGTH = 80;
const MAX_COMPANY_SIZE_LENGTH = 50;
const MAX_ABOUT_LENGTH = 3000;
const MAX_LOGO_URL_LENGTH = 2000;
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
        .map((item) => clean(item))
        .filter(
          (item) =>
            Boolean(item) && item.length > 0 && item.length <= MAX_ARRAY_ITEM_LENGTH
        )
    ),
  ].slice(0, MAX_ARRAY_ITEMS);
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

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required" },
        401
      );
    }

    const user = await User.findById(currentUser._id).select(
      "_id email role firstName lastName name phone bio companyName organizationName eventFocus organizerTargetAudience organizerLocation isProfileComplete"
    );

    if (!user) {
      return buildNoStoreResponse(
        { success: false, message: "User not found" },
        404
      );
    }

    const body = await request.json();

    const role = clean(body.role);
    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const phone = clean(body.phone);
    const bio = clean(body.bio);
    const organizationName = clean(body.organizationName);
    const eventFocus = clean(body.eventFocus);
    const organizerTargetAudience = clean(body.organizerTargetAudience);
    const organizerLocation = clean(body.organizerLocation);
    const brandName = clean(body.brandName);
    const companyName = clean(body.companyName);
    const website = clean(body.website);
    const officialEmail = clean(body.officialEmail).toLowerCase();
    const industry = clean(body.industry);
    const companySize = clean(body.companySize);
    const about = clean(body.about);
    const logoUrl = clean(body.logoUrl);
    const targetAudience = clean(body.targetAudience);
    const preferredCategories = normalizeArray(body.preferredCategories);
    const preferredLocations = normalizeArray(body.preferredLocations);
    const sponsorshipInterests = normalizeArray(body.sponsorshipInterests);
    const instagramUrl = clean(body.instagramUrl);
    const linkedinUrl = clean(body.linkedinUrl);
    const isPublic =
      typeof body.isPublic === "boolean" ? body.isPublic : true;

    if (!role) {
      return buildNoStoreResponse(
        { success: false, message: "User role is required" },
        400
      );
    }

    if (role !== user.role) {
      return buildNoStoreResponse(
        { success: false, message: "Role mismatch is not allowed" },
        400
      );
    }

    if (firstName && !isSafeLength(firstName, MAX_NAME_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `First name cannot exceed ${MAX_NAME_LENGTH} characters`,
        },
        400
      );
    }

    if (lastName && !isSafeLength(lastName, MAX_NAME_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Last name cannot exceed ${MAX_NAME_LENGTH} characters`,
        },
        400
      );
    }

    if (phone) {
      if (!isSafeLength(phone, MAX_PHONE_LENGTH) || !isValidPhoneNumber(phone)) {
        return buildNoStoreResponse(
          {
            success: false,
            message: "Phone must be a valid phone number",
          },
          400
        );
      }
    }

    if (bio && !isSafeLength(bio, MAX_BIO_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Bio cannot exceed ${MAX_BIO_LENGTH} characters`,
        },
        400
      );
    }

    if (
      organizationName &&
      !isSafeLength(organizationName, MAX_ORGANIZATION_NAME_LENGTH)
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Organization name cannot exceed ${MAX_ORGANIZATION_NAME_LENGTH} characters`,
        },
        400
      );
    }

    if (eventFocus && !isSafeLength(eventFocus, MAX_EVENT_FOCUS_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Event focus cannot exceed ${MAX_EVENT_FOCUS_LENGTH} characters`,
        },
        400
      );
    }

    if (
      organizerTargetAudience &&
      !isSafeLength(organizerTargetAudience, MAX_TARGET_AUDIENCE_LENGTH)
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Organizer target audience cannot exceed ${MAX_TARGET_AUDIENCE_LENGTH} characters`,
        },
        400
      );
    }

    if (
      organizerLocation &&
      !isSafeLength(organizerLocation, MAX_LOCATION_LENGTH)
    ) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Organizer location cannot exceed ${MAX_LOCATION_LENGTH} characters`,
        },
        400
      );
    }

    if (brandName && !isSafeLength(brandName, MAX_BRAND_NAME_LENGTH)) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `Brand name cannot exceed ${MAX_BRAND_NAME_LENGTH} characters`,
        },
        400
      );
    }

    if (companyName && !isSafeLength(companyName, MAX_COMPANY_NAME_LENGTH)) {
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
          {
            success: false,
            message: "Website must be a valid URL",
          },
          400
        );
      }
    }

    if (officialEmail) {
      if (!isSafeLength(officialEmail, MAX_EMAIL_LENGTH) || !isValidEmail(officialEmail)) {
        return buildNoStoreResponse(
          {
            success: false,
            message: "Official email must be a valid email address",
          },
          400
        );
      }
    }

    if (industry && !isSafeLength(industry, MAX_INDUSTRY_LENGTH)) {
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
          {
            success: false,
            message: "Logo URL must be a valid URL",
          },
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
          {
            success: false,
            message: "Instagram URL must be a valid URL",
          },
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
          {
            success: false,
            message: "LinkedIn URL must be a valid URL",
          },
          400
        );
      }
    }

    user.firstName = firstName || user.firstName || "";
    user.lastName = lastName || user.lastName || "";
    user.name = `${user.firstName} ${user.lastName}`.trim();
    user.phone = phone || "";
    user.bio = bio || "";

    if (companyName) {
      user.companyName = companyName;
    }

    let sponsorProfile = null;

    if (role === "ORGANIZER") {
      user.organizationName = organizationName || "";
      user.eventFocus = eventFocus || "";
      user.organizerTargetAudience = organizerTargetAudience || "";
      user.organizerLocation = organizerLocation || "";

      user.isProfileComplete =
        Boolean(user.firstName) &&
        Boolean(user.lastName) &&
        Boolean(user.phone) &&
        Boolean(user.organizationName) &&
        Boolean(user.eventFocus) &&
        Boolean(user.organizerTargetAudience) &&
        Boolean(user.organizerLocation);
    }

    if (role === "SPONSOR") {
      const sponsorPayload = {
        userId: user._id,
        brandName: brandName || "",
        companyName: companyName || user.companyName || "",
        website: website || "",
        officialEmail: officialEmail || user.email,
        phone: phone || "",
        industry: industry || "",
        companySize: companySize || "",
        about: about || bio || "",
        logoUrl: logoUrl || "",
        targetAudience: targetAudience || "",
        preferredCategories,
        preferredLocations,
        sponsorshipInterests,
        instagramUrl: instagramUrl || "",
        linkedinUrl: linkedinUrl || "",
        isPublic,
      };

      const isSponsorProfileComplete =
        Boolean(sponsorPayload.brandName) &&
        Boolean(sponsorPayload.companyName) &&
        Boolean(sponsorPayload.officialEmail) &&
        Boolean(sponsorPayload.phone) &&
        Boolean(sponsorPayload.industry);

      sponsorProfile = await Sponsor.findOneAndUpdate(
        { userId: user._id },
        {
          ...sponsorPayload,
          isProfileComplete: isSponsorProfileComplete,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      )
        .select("-officialEmail -phone")
        .lean();

      user.isProfileComplete =
        Boolean(user.firstName) &&
        Boolean(user.lastName) &&
        Boolean(user.phone) &&
        isSponsorProfileComplete;
    }

    await user.save();

    const safeUser = {
      _id: String(user._id),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      phone: user.phone || "",
      bio: user.bio || "",
      companyName: user.companyName || "",
      organizationName: user.organizationName || "",
      eventFocus: user.eventFocus || "",
      organizerTargetAudience: user.organizerTargetAudience || "",
      organizerLocation: user.organizerLocation || "",
      isProfileComplete: user.isProfileComplete,
    };

    return buildNoStoreResponse(
      {
        success: true,
        message: "Settings updated successfully",
        user: safeUser,
        sponsorProfile,
      },
      200
    );
  } catch (error) {
    console.error("Settings update error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to update settings" },
      500
    );
  }
}