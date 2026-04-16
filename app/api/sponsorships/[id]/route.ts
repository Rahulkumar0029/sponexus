import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/models/Sponsorship";
import Sponsor from "@/models/Sponsor";
import User from "@/models/User";
import { authOptions } from "@/lib/nextAuthOptions";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid sponsorship ID" },
        { status: 400 }
      );
    }

    const sponsorship = await Sponsorship.findById(id)
      .populate({
        path: "sponsorOwnerId",
        select: "name email",
      })
      .lean();

    if (!sponsorship) {
      return NextResponse.json(
        { success: false, message: "Sponsorship not found" },
        { status: 404 }
      );
    }

    const sponsorProfile = await Sponsor.findOne({
      userId: (sponsorship as any).sponsorOwnerId?._id,
    })
      .select("brandName companyName logoUrl website industry about")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...sponsorship,
        sponsorProfile: sponsorProfile || null,
      },
    });
  } catch (error) {
    console.error("Get sponsorship error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch sponsorship" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid sponsorship ID" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const sponsorship = await Sponsorship.findById(id);

    if (!sponsorship) {
      return NextResponse.json(
        { success: false, message: "Sponsorship not found" },
        { status: 404 }
      );
    }

    if (String(sponsorship.sponsorOwnerId) !== String(user._id)) {
      return NextResponse.json(
        { success: false, message: "Not allowed" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const updateData: Record<string, any> = {};

    if (body.sponsorshipTitle !== undefined) {
      updateData.sponsorshipTitle = clean(body.sponsorshipTitle);
    }

    if (body.sponsorshipType !== undefined) {
      updateData.sponsorshipType = clean(body.sponsorshipType);
    }

    if (body.budget !== undefined) {
      updateData.budget = Number(body.budget);
    }

    if (body.category !== undefined) {
      updateData.category = clean(body.category);
    }

    if (body.targetAudience !== undefined) {
      updateData.targetAudience = clean(body.targetAudience);
    }

    if (body.city !== undefined) {
      updateData.city = clean(body.city);
    }

    if (body.locationPreference !== undefined) {
      updateData.locationPreference = clean(body.locationPreference);
    }

    if (body.campaignGoal !== undefined) {
      updateData.campaignGoal = clean(body.campaignGoal);
    }

    if (body.deliverablesExpected !== undefined) {
      updateData.deliverablesExpected = clean(body.deliverablesExpected);
    }

    if (body.customMessage !== undefined) {
      updateData.customMessage = clean(body.customMessage);
    }

    if (body.contactPersonName !== undefined) {
      updateData.contactPersonName = clean(body.contactPersonName);
    }

    if (body.contactPhone !== undefined) {
      updateData.contactPhone = clean(body.contactPhone);
    }

    if (body.bannerRequirement !== undefined) {
      updateData.bannerRequirement = Boolean(body.bannerRequirement);
    }

    if (body.stallRequirement !== undefined) {
      updateData.stallRequirement = Boolean(body.stallRequirement);
    }

    if (body.mikeAnnouncement !== undefined) {
      updateData.mikeAnnouncement = Boolean(body.mikeAnnouncement);
    }

    if (body.socialMediaMention !== undefined) {
      updateData.socialMediaMention = Boolean(body.socialMediaMention);
    }

    if (body.productDisplay !== undefined) {
      updateData.productDisplay = Boolean(body.productDisplay);
    }

    if (body.status !== undefined) {
      updateData.status = body.status;
    }

    const updated = await Sponsorship.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json({
      success: true,
      message: "Sponsorship updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update sponsorship error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update sponsorship" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid sponsorship ID" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const sponsorship = await Sponsorship.findById(id);

    if (!sponsorship) {
      return NextResponse.json(
        { success: false, message: "Sponsorship not found" },
        { status: 404 }
      );
    }

    if (String(sponsorship.sponsorOwnerId) !== String(user._id)) {
      return NextResponse.json(
        { success: false, message: "Not allowed" },
        { status: 403 }
      );
    }

    sponsorship.status = "closed";
    await sponsorship.save();

    return NextResponse.json({
      success: true,
      message: "Sponsorship closed successfully",
    });
  } catch (error) {
    console.error("Delete sponsorship error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete sponsorship" },
      { status: 500 }
    );
  }
}