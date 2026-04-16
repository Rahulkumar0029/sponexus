import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Sponsor from "@/models/Sponsor";
import { authOptions } from "@/lib/nextAuthOptions";

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const {
      role,
      firstName,
      lastName,
      phone,
      bio,
      organizationName,
      eventFocus,
      organizerTargetAudience,
      organizerLocation,
      brandName,
      companyName,
      website,
      officialEmail,
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

    if (!role) {
      return NextResponse.json(
        { success: false, message: "User role is required" },
        { status: 400 }
      );
    }

    if (role !== user.role) {
      return NextResponse.json(
        { success: false, message: "Role mismatch is not allowed" },
        { status: 400 }
      );
    }

    user.firstName = firstName?.trim() || user.firstName || "";
    user.lastName = lastName?.trim() || user.lastName || "";
    user.name = `${user.firstName} ${user.lastName}`.trim();
    user.phone = phone?.trim() || "";
    user.bio = bio?.trim() || "";

    if (role === "ORGANIZER") {
      user.organizationName = organizationName?.trim() || "";
      user.eventFocus = eventFocus?.trim() || "";
      user.organizerTargetAudience = organizerTargetAudience?.trim() || "";
      user.organizerLocation = organizerLocation?.trim() || "";
    }

    if (companyName?.trim()) {
      user.companyName = companyName.trim();
    }

    await user.save();

    let sponsorProfile = null;

    if (role === "SPONSOR") {
      const sponsorPayload = {
        userId: user._id,
        brandName: brandName?.trim() || "",
        companyName: companyName?.trim() || user.companyName || "",
        website: website?.trim() || "",
        officialEmail: officialEmail?.trim()?.toLowerCase() || user.email,
        phone: phone?.trim() || "",
        industry: industry?.trim() || "",
        companySize: companySize?.trim() || "",
        about: about?.trim() || bio?.trim() || "",
        logoUrl: logoUrl?.trim() || "",
        targetAudience: targetAudience?.trim() || "",
        preferredCategories: normalizeArray(preferredCategories),
        preferredLocations: normalizeArray(preferredLocations),
        sponsorshipInterests: normalizeArray(sponsorshipInterests),
        instagramUrl: instagramUrl?.trim() || "",
        linkedinUrl: linkedinUrl?.trim() || "",
        isPublic: typeof isPublic === "boolean" ? isPublic : true,
      };

      const isProfileComplete =
        Boolean(sponsorPayload.brandName) &&
        Boolean(sponsorPayload.companyName) &&
        Boolean(sponsorPayload.officialEmail) &&
        Boolean(sponsorPayload.phone) &&
        Boolean(sponsorPayload.industry);

      sponsorProfile = await Sponsor.findOneAndUpdate(
        { userId: user._id },
        {
          ...sponsorPayload,
          isProfileComplete,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Settings updated successfully",
        user,
        sponsorProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Settings update error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update settings" },
      { status: 500 }
    );
  }
}