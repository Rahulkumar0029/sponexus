import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Sponsor from "@/lib/models/Sponsor";
import { getCurrentUser } from "@/lib/current-user";

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhoneNumber(value: string) {
  return /^\d{7,15}$/.test(value);
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeLength(value: string, max: number) {
  return value.length <= max;
}

const MAX_BRAND_NAME_LENGTH = 120;
const MAX_COMPANY_NAME_LENGTH = 120;
const MAX_WEBSITE_LENGTH = 500;
const MAX_EMAIL_LENGTH = 320;
const MAX_PHONE_LENGTH = 20;
const MAX_INDUSTRY_LENGTH = 80;
const MAX_COMPANY_SIZE_LENGTH = 50;
const MAX_BASE_LOCATION_LENGTH = 120;
const MAX_ABOUT_LENGTH = 3000;
const MAX_LOGO_URL_LENGTH = 2000;
const MAX_SOCIAL_URL_LENGTH = 500;

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

    const user = await User.findById(currentUser._id);

    if (!user || user.isDeleted) {
      return buildNoStoreResponse(
        { success: false, message: "User not found" },
        404
      );
    }

    if (
      user.accountStatus === "DISABLED" ||
      user.accountStatus === "SUSPENDED"
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Account access restricted" },
        403
      );
    }

    const body = await request.json();
    const role = clean(body.role);

    if (!role || role !== user.role) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid role" },
        400
      );
    }

    const firstName = clean(body.firstName);
    const lastName = clean(body.lastName);
    const phone = cleanPhone(clean(body.phone));
    const bio = clean(body.bio);
    const companyName = clean(body.companyName);

    const organizationName = clean(body.organizationName);
    const organizerLocation = clean(body.organizerLocation);

    const brandName = clean(body.brandName);
    const website = clean(body.website);
    const officialEmail = clean(body.officialEmail).toLowerCase();
    const industry = clean(body.industry);
    const companySize = clean(body.companySize);
    const baseLocation = clean(body.baseLocation);
    const about = clean(body.about);
    const logoUrl = clean(body.logoUrl);
    const instagramUrl = clean(body.instagramUrl);
    const linkedinUrl = clean(body.linkedinUrl);
    const isPublic = typeof body.isPublic === "boolean" ? body.isPublic : true;

    if (phone && !isValidPhoneNumber(phone)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid phone number" },
        400
      );
    }

    if (officialEmail && !isValidEmail(officialEmail)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid email" },
        400
      );
    }

    if (website && !isValidHttpUrl(website)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid website URL" },
        400
      );
    }

    if (logoUrl && !isValidHttpUrl(logoUrl)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid logo URL" },
        400
      );
    }

    if (instagramUrl && !isValidHttpUrl(instagramUrl)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid Instagram URL" },
        400
      );
    }

    if (linkedinUrl && !isValidHttpUrl(linkedinUrl)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid LinkedIn URL" },
        400
      );
    }

    user.firstName = firstName || user.firstName || "";
    user.lastName = lastName || user.lastName || "";
    user.name = `${user.firstName} ${user.lastName}`.trim();
    user.phone = phone || user.phone || "";
    user.bio = bio || user.bio || "";
    user.companyName = companyName || user.companyName || "";
    user.lastActiveAt = new Date();

    let sponsorProfile = null;

    if (role === "ORGANIZER") {
      user.organizationName = organizationName || user.organizationName || "";
      user.organizerLocation = organizerLocation || user.organizerLocation || "";

      user.isProfileComplete = Boolean(
        user.firstName &&
          user.lastName &&
          user.phone &&
          user.organizationName &&
          user.organizerLocation
      );
    }

    if (role === "SPONSOR") {
      if (!firstName) {
        return buildNoStoreResponse(
          { success: false, message: "First name is required" },
          400
        );
      }

      if (!lastName) {
        return buildNoStoreResponse(
          { success: false, message: "Last name is required" },
          400
        );
      }

      if (!brandName) {
        return buildNoStoreResponse(
          { success: false, message: "Brand name is required" },
          400
        );
      }

      if (!companyName) {
        return buildNoStoreResponse(
          { success: false, message: "Company name is required" },
          400
        );
      }

      if (!officialEmail) {
        return buildNoStoreResponse(
          { success: false, message: "Official email is required" },
          400
        );
      }

      if (!phone) {
        return buildNoStoreResponse(
          { success: false, message: "Phone number is required" },
          400
        );
      }

      if (!baseLocation) {
        return buildNoStoreResponse(
          { success: false, message: "Sponsor base location is required" },
          400
        );
      }

      if (!logoUrl) {
        return buildNoStoreResponse(
          { success: false, message: "Logo / brand image is required" },
          400
        );
      }

      if (!about) {
        return buildNoStoreResponse(
          { success: false, message: "About brand is required" },
          400
        );
      }

      if (!isSafeLength(brandName, MAX_BRAND_NAME_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "Brand name is too long" },
          400
        );
      }

      if (!isSafeLength(companyName, MAX_COMPANY_NAME_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "Company name is too long" },
          400
        );
      }

      if (!isSafeLength(officialEmail, MAX_EMAIL_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "Official email is too long" },
          400
        );
      }

      if (!isSafeLength(phone, MAX_PHONE_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "Phone number is too long" },
          400
        );
      }

      if (!isSafeLength(baseLocation, MAX_BASE_LOCATION_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "Sponsor base location is too long" },
          400
        );
      }

      if (!isSafeLength(about, MAX_ABOUT_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "About brand is too long" },
          400
        );
      }

      if (!isSafeLength(logoUrl, MAX_LOGO_URL_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "Logo URL is too long" },
          400
        );
      }

      if (website && !isSafeLength(website, MAX_WEBSITE_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "Website URL is too long" },
          400
        );
      }

      if (industry && !isSafeLength(industry, MAX_INDUSTRY_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "Industry is too long" },
          400
        );
      }

      if (companySize && !isSafeLength(companySize, MAX_COMPANY_SIZE_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "Company size is too long" },
          400
        );
      }

      if (instagramUrl && !isSafeLength(instagramUrl, MAX_SOCIAL_URL_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "Instagram URL is too long" },
          400
        );
      }

      if (linkedinUrl && !isSafeLength(linkedinUrl, MAX_SOCIAL_URL_LENGTH)) {
        return buildNoStoreResponse(
          { success: false, message: "LinkedIn URL is too long" },
          400
        );
      }

      const isComplete = Boolean(
        brandName &&
          companyName &&
          officialEmail &&
          phone &&
          baseLocation &&
          logoUrl &&
          about
      );

      sponsorProfile = await Sponsor.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          brandName,
          companyName,
          website,
          officialEmail,
          phone,
          industry,
          companySize,
          baseLocation,
          about,
          logoUrl,
          instagramUrl,
          linkedinUrl,
          isPublic,
          isProfileComplete: isComplete,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      ).lean();

      user.companyName = companyName;
      user.phone = phone;
      user.bio = about;
      user.isProfileComplete = Boolean(
        user.firstName && user.lastName && phone && isComplete
      );
    }

    await user.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Settings updated successfully",
        user: {
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
          organizerLocation: user.organizerLocation || "",
          isProfileComplete: user.isProfileComplete,
        },
        sponsorProfile,
      },
      200
    );
  } catch (error) {
    console.error("Settings update error:", error);

    return buildNoStoreResponse(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to update settings",
      },
      500
    );
  }
}