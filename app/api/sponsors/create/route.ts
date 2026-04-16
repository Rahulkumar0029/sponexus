import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { connectDB } from "@/lib/db";
import Sponsor from "@/models/Sponsor";
import User from "@/models/User";
import { authOptions } from "@/lib/nextAuthOptions";

function normalizeArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // 🔐 AUTH CHECK
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // 🔍 GET USER FROM DB (DO NOT TRUST SESSION ONLY)
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.role !== "SPONSOR") {
      return NextResponse.json(
        { success: false, message: "Only sponsors can create profile" },
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
    } = body;

    // 🔴 VALIDATION
    if (!brandName?.trim()) {
      return NextResponse.json(
        { success: false, message: "Brand name is required" },
        { status: 400 }
      );
    }

    if (!companyName?.trim()) {
      return NextResponse.json(
        { success: false, message: "Company name is required" },
        { status: 400 }
      );
    }

    if (!officialEmail?.trim()) {
      return NextResponse.json(
        { success: false, message: "Official email is required" },
        { status: 400 }
      );
    }

    if (!phone?.trim()) {
      return NextResponse.json(
        { success: false, message: "Phone number is required" },
        { status: 400 }
      );
    }

    if (!industry?.trim()) {
      return NextResponse.json(
        { success: false, message: "Industry is required" },
        { status: 400 }
      );
    }

    // 🧠 CHECK IF PROFILE EXISTS (UPSERT LOGIC)
    let sponsorProfile = await Sponsor.findOne({ userId: user._id });

    const profileData = {
      userId: user._id,

      brandName: brandName.trim(),
      companyName: companyName.trim(),
      website: website?.trim() || "",
      officialEmail: officialEmail.trim().toLowerCase(),
      phone: phone.trim(),
      industry: industry.trim(),
      companySize: companySize?.trim() || "",
      about: about?.trim() || "",
      logoUrl: logoUrl?.trim() || "",

      targetAudience: targetAudience?.trim() || "",

      preferredCategories: normalizeArray(preferredCategories),
      preferredLocations: normalizeArray(preferredLocations),
      sponsorshipInterests: normalizeArray(sponsorshipInterests),

      instagramUrl: instagramUrl?.trim() || "",
      linkedinUrl: linkedinUrl?.trim() || "",

      isProfileComplete: true,
      isPublic: true,
    };

    if (sponsorProfile) {
      // 🔄 UPDATE
      sponsorProfile = await Sponsor.findOneAndUpdate(
        { userId: user._id },
        profileData,
        { new: true, runValidators: true }
      );
    } else {
      // 🆕 CREATE
      sponsorProfile = await Sponsor.create(profileData);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Sponsor profile saved successfully",
        sponsor: sponsorProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating sponsor profile:", error);

    return NextResponse.json(
      { success: false, message: "Failed to save sponsor profile" },
      { status: 500 }
    );
  }
}