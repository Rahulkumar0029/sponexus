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
      const existingSponsor = await Sponsor.findOne({ userId: user._id });

      const finalBrandName = brandName || existingSponsor?.brandName || "";
      const finalCompanyName =
        companyName || existingSponsor?.companyName || user.companyName || "";
      const finalOfficialEmail =
        officialEmail || existingSponsor?.officialEmail || user.email;
      const finalPhone = phone || existingSponsor?.phone || user.phone || "";
      const finalWebsite = website || existingSponsor?.website || "";
      const finalIndustry = industry || existingSponsor?.industry || "";
      const finalCompanySize = companySize || existingSponsor?.companySize || "";
      const finalAbout = about || existingSponsor?.about || bio || "";
      const finalLogoUrl = logoUrl || existingSponsor?.logoUrl || "";
      const finalInstagramUrl =
        instagramUrl || existingSponsor?.instagramUrl || "";
      const finalLinkedinUrl = linkedinUrl || existingSponsor?.linkedinUrl || "";

      const isComplete = Boolean(
        finalBrandName &&
          finalCompanyName &&
          finalOfficialEmail &&
          finalPhone
      );

      sponsorProfile = await Sponsor.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          brandName: finalBrandName,
          companyName: finalCompanyName,
          website: finalWebsite,
          officialEmail: finalOfficialEmail,
          phone: finalPhone,
          industry: finalIndustry,
          companySize: finalCompanySize,
          about: finalAbout,
          logoUrl: finalLogoUrl,
          instagramUrl: finalInstagramUrl,
          linkedinUrl: finalLinkedinUrl,
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

      user.companyName = finalCompanyName;
      user.phone = finalPhone;
      user.bio = finalAbout;
      user.isProfileComplete = Boolean(
        user.firstName && user.lastName && finalPhone && isComplete
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
          error instanceof Error
            ? error.message
            : "Failed to update settings",
      },
      500
    );
  }
}