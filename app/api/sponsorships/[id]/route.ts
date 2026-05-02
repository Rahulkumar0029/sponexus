import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsorship from "@/lib/models/Sponsorship";
import Sponsor from "@/lib/models/Sponsor";
import User from "@/lib/models/User";
import { getCurrentUser } from "@/lib/current-user";

const PUBLIC_VISIBLE_STATUS = "active";

const MIN_AUDIENCE = 50;
const MIN_BUDGET = 2000;
const MAX_BUDGET = 100000000;
const MAX_TARGET_AUDIENCE = 100000000;

const ALLOWED_DELIVERABLES = new Set([
  "Stage Branding",
  "Stall Space",
  "Social Media Promotion",
  "Product Display",
  "Announcements / Stage Mentions",
  "Email Promotion",
  "Title Sponsorship",
  "Co-Branding",
]);

const REQUIRED_DELIVERABLE_COUNT = 3;

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

function isValidPhoneNumber(value: string) {
  const normalized = value.replace(/[\s()+-]/g, "");
  return /^\d{7,15}$/.test(normalized);
}

function isValidFutureDate(value: unknown) {
  if (!value) return false;

  const selectedDate = new Date(String(value));
  selectedDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return !Number.isNaN(selectedDate.getTime()) && selectedDate > today;
}

function isSponsorshipExpired(sponsorship: any) {
  if (!sponsorship?.expiresAt) return false;

  const expiryDate = new Date(sponsorship.expiresAt);
  expiryDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return !Number.isNaN(expiryDate.getTime()) && expiryDate < today;
}

async function markExpiredIfNeeded(sponsorship: any) {
  if (
    sponsorship.status === "active" &&
    isSponsorshipExpired(sponsorship)
  ) {
    sponsorship.status = "expired";
    await sponsorship.save();
  }

  return sponsorship;
}

function sanitizePublicSponsorProfile(profile: any) {
  if (!profile) return null;

  const plain =
    typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

  delete plain.officialEmail;
  delete plain.phone;
  delete plain.userId;

  return plain;
}

function sanitizeOwnerSponsorProfile(profile: any) {
  if (!profile) return null;

  const plain =
    typeof profile?.toObject === "function" ? profile.toObject() : { ...profile };

  delete plain.userId;

  return plain;
}

function sanitizePublicSponsorshipData(sponsorship: any) {
  if (!sponsorship) return null;

  const plain =
    typeof sponsorship?.toObject === "function"
      ? sponsorship.toObject()
      : { ...sponsorship };

  delete plain.sponsorOwnerId;
  delete plain.sponsorProfileId;
  delete plain.contactPersonName;
  delete plain.contactPhone;
  delete plain.visibilityStatus;
  delete plain.moderationStatus;
  delete plain.isDeleted;
  delete plain.deletedAt;
  delete plain.deletedBy;
  delete plain.flagReason;
  delete plain.adminNotes;

  return plain;
}

function getUniqueValidDeliverables(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function validateCoreEditFields(body: any) {
  const sponsorshipTitle = clean(body.sponsorshipTitle);
  const sponsorshipType = clean(body.sponsorshipType);
  const category = clean(body.category);
  const locationPreference = clean(body.locationPreference);
  const campaignGoal = clean(body.campaignGoal);
  const coverImage = clean(body.coverImage);
  const customMessage = clean(body.customMessage);
  const contactPersonName = clean(body.contactPersonName);
  const contactPhone = clean(body.contactPhone);
  const targetAudienceValue = Number(body.targetAudience);
  const budgetValue = Number(body.budget);
  const applicationDeadline = body.applicationDeadline;
  const uniqueDeliverables = getUniqueValidDeliverables(body.deliverablesExpected);

  if (!sponsorshipTitle) return { error: "Sponsorship title is required" };
  if (!sponsorshipType) return { error: "Sponsorship type is required" };
  if (!category) return { error: "Category is required" };
  if (!locationPreference) return { error: "Location preference is required" };
  if (!campaignGoal) return { error: "Campaign goal is required" };

  if (
    uniqueDeliverables.length !== REQUIRED_DELIVERABLE_COUNT ||
    !uniqueDeliverables.every((item) => ALLOWED_DELIVERABLES.has(item))
  ) {
    return { error: "Select exactly 3 valid sponsor deliverables." };
  }

  if (!contactPersonName) {
    return { error: "Contact person name is required" };
  }

  if (!contactPhone || !isValidPhoneNumber(contactPhone)) {
    return { error: "Contact phone must be a valid phone number" };
  }

  if (
    !Number.isFinite(targetAudienceValue) ||
    !Number.isInteger(targetAudienceValue) ||
    targetAudienceValue < MIN_AUDIENCE ||
    targetAudienceValue > MAX_TARGET_AUDIENCE
  ) {
    return { error: `Minimum audience must be at least ${MIN_AUDIENCE}` };
  }

  if (
    !Number.isFinite(budgetValue) ||
    budgetValue < MIN_BUDGET ||
    budgetValue > MAX_BUDGET
  ) {
    return { error: `Minimum budget must be at least ₹${MIN_BUDGET}` };
  }

  if (!isValidFutureDate(applicationDeadline)) {
    return { error: "Application deadline must be from tomorrow onwards" };
  }

  const selectedDate = new Date(String(applicationDeadline));
  selectedDate.setHours(0, 0, 0, 0);

  return {
    data: {
      sponsorshipTitle,
      sponsorshipType,
      category,
      locationPreference,
      campaignGoal,
      coverImage,
      customMessage,
      contactPersonName,
      contactPhone,
      targetAudienceValue,
      budgetValue,
      selectedDate,
      uniqueDeliverables,
    },
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid sponsorship ID" },
        400
      );
    }

    await connectDB();

    const currentUser = await getCurrentUser();

    const foundSponsorship = await Sponsorship.findById(id);

    if (!foundSponsorship || foundSponsorship.isDeleted) {
      return buildNoStoreResponse(
        { success: false, message: "Sponsorship not found" },
        404
      );
    }

    const sponsorship = await markExpiredIfNeeded(foundSponsorship);
    const sponsorshipData = sponsorship.toObject();

    const sponsorProfile = await Sponsor.findById(
      sponsorshipData.sponsorProfileId
    ).lean();

    const isPubliclyVisible =
      sponsorshipData.status === PUBLIC_VISIBLE_STATUS &&
      !!sponsorProfile?.isPublic &&
      !!sponsorProfile?.isProfileComplete;

    if (!currentUser?._id) {
      if (!isPubliclyVisible) {
        return buildNoStoreResponse(
          { success: false, message: "Sponsorship not available" },
          404
        );
      }

     return buildNoStoreResponse(
  {
    success: true,
    mode: "public_view",
    data: {
      ...sanitizePublicSponsorshipData(sponsorshipData),
      sponsorProfile: sanitizePublicSponsorProfile(sponsorProfile),
    },
  },
  200
);
    }

    const user = await User.findById(currentUser._id).select("_id role");

    if (!user) {
      return buildNoStoreResponse(
        { success: false, message: "User not found" },
        404
      );
    }

    if (user.role === "SPONSOR") {
      if (String(sponsorshipData.sponsorOwnerId) !== String(user._id)) {
        return buildNoStoreResponse(
          { success: false, message: "Access denied" },
          403
        );
      }

      return buildNoStoreResponse(
        {
          success: true,
          mode: "owner_view",
          data: {
            ...sponsorshipData,
            sponsorProfile: sanitizeOwnerSponsorProfile(sponsorProfile),
          },
        },
        200
      );
    }

    if (user.role === "ORGANIZER") {
      if (!isPubliclyVisible) {
        return buildNoStoreResponse(
          { success: false, message: "Sponsorship not available" },
          404
        );
      }

      return buildNoStoreResponse(
        {
          success: true,
          mode: "organizer_view",
          data: {
            ...sponsorshipData,
            sponsorProfile: sanitizePublicSponsorProfile(sponsorProfile),
          },
        },
        200
      );
    }

    return buildNoStoreResponse(
      { success: false, message: "Unauthorized role" },
      403
    );
  } catch (error) {
    console.error("Error fetching sponsorship:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to fetch sponsorship" },
      500
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid sponsorship ID" },
        400
      );
    }

    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required" },
        401
      );
    }

    const user = await User.findById(currentUser._id).select("_id role");

    if (!user || user.role !== "SPONSOR") {
      return buildNoStoreResponse(
        { success: false, message: "Only sponsors can update sponsorships" },
        403
      );
    }

    const foundSponsorship = await Sponsorship.findById(id);

    if (!foundSponsorship || foundSponsorship.isDeleted) {
      return buildNoStoreResponse(
        { success: false, message: "Sponsorship not found" },
        404
      );
    }

    const sponsorship = await markExpiredIfNeeded(foundSponsorship);

    if (String(sponsorship.sponsorOwnerId) !== String(user._id)) {
      return buildNoStoreResponse(
        { success: false, message: "Access denied" },
        403
      );
    }

    const body = await request.json();
    const action = clean(body.action);

    if (action === "pause") {
      if (sponsorship.status !== "active") {
        return buildNoStoreResponse(
          { success: false, message: "Only active sponsorships can be paused" },
          400
        );
      }

      sponsorship.status = "paused";
      sponsorship.pausedAt = new Date();
      sponsorship.resumedAt = null;
      await sponsorship.save();

      return buildNoStoreResponse(
        {
          success: true,
          message: "Sponsorship paused successfully",
          data: sponsorship,
        },
        200
      );
    }

    if (action === "resume") {
      if (sponsorship.status !== "paused") {
        return buildNoStoreResponse(
          { success: false, message: "Only paused sponsorships can be resumed" },
          400
        );
      }

      if (isSponsorshipExpired(sponsorship)) {
        sponsorship.status = "expired";
        await sponsorship.save();

        return buildNoStoreResponse(
          {
            success: false,
            message: "Expired sponsorship cannot be resumed. Create again instead.",
          },
          400
        );
      }

      sponsorship.status = "active";
      sponsorship.resumedAt = new Date();
      sponsorship.pausedAt = null;
      await sponsorship.save();

      return buildNoStoreResponse(
        {
          success: true,
          message: "Sponsorship resumed successfully",
          data: sponsorship,
        },
        200
      );
    }

    if (action === "close") {
      if (sponsorship.status === "closed") {
        return buildNoStoreResponse(
          { success: false, message: "Sponsorship is already closed" },
          400
        );
      }

      sponsorship.status = "closed";
      sponsorship.closedAt = new Date();
      sponsorship.expiresAt = new Date();
      await sponsorship.save();

      return buildNoStoreResponse(
        {
          success: true,
          message: "Sponsorship closed successfully",
          data: sponsorship,
        },
        200
      );
    }

    if (action === "repost") {
      if (sponsorship.status !== "closed" && sponsorship.status !== "expired") {
        return buildNoStoreResponse(
          {
            success: false,
            message: "Only closed or expired sponsorships can be created again.",
          },
          400
        );
      }

      const validation = validateCoreEditFields({
        sponsorshipTitle: clean(body.sponsorshipTitle) || sponsorship.sponsorshipTitle,
        sponsorshipType: clean(body.sponsorshipType) || sponsorship.sponsorshipType,
        category: clean(body.category) || sponsorship.category,
        locationPreference: clean(body.locationPreference) || sponsorship.locationPreference,
        campaignGoal: clean(body.campaignGoal) || sponsorship.campaignGoal,
        coverImage:
          typeof body.coverImage === "string"
            ? clean(body.coverImage)
            : sponsorship.coverImage,
        deliverablesExpected: Array.isArray(body.deliverablesExpected)
          ? body.deliverablesExpected
          : sponsorship.deliverablesExpected,
        customMessage:
          typeof body.customMessage === "string"
            ? clean(body.customMessage)
            : sponsorship.customMessage,
        contactPersonName:
          clean(body.contactPersonName) || sponsorship.contactPersonName,
        contactPhone: clean(body.contactPhone) || sponsorship.contactPhone,
        targetAudience:
          body.targetAudience !== undefined &&
          body.targetAudience !== null &&
          body.targetAudience !== ""
            ? body.targetAudience
            : sponsorship.targetAudience,
        budget:
          body.budget !== undefined && body.budget !== null && body.budget !== ""
            ? body.budget
            : sponsorship.budget,
        applicationDeadline: body.applicationDeadline,
      });

      if (validation.error || !validation.data) {
        return buildNoStoreResponse(
          { success: false, message: validation.error || "Invalid repost data" },
          400
        );
      }

      const newSponsorship = await Sponsorship.create({
        sponsorOwnerId: sponsorship.sponsorOwnerId,
        sponsorProfileId: sponsorship.sponsorProfileId,
        sponsorshipTitle: validation.data.sponsorshipTitle,
        sponsorshipType: validation.data.sponsorshipType,
        budget: validation.data.budgetValue,
        category: validation.data.category,
        targetAudience: String(validation.data.targetAudienceValue),
        city: sponsorship.city,
        locationPreference: validation.data.locationPreference,
        campaignGoal: validation.data.campaignGoal,
        coverImage: validation.data.coverImage,
        deliverablesExpected: validation.data.uniqueDeliverables,
        customMessage: validation.data.customMessage,
        contactPersonName: validation.data.contactPersonName,
        contactPhone: validation.data.contactPhone,
        status: "active",
        expiresAt: validation.data.selectedDate,
        duplicatedFrom: sponsorship._id,
        repostCount: 0,
      });

      sponsorship.repostCount = (sponsorship.repostCount || 0) + 1;
      await sponsorship.save();

      return buildNoStoreResponse(
        {
          success: true,
          message: "Sponsorship created again successfully",
          data: newSponsorship,
        },
        201
      );
    }

    if (action !== "edit") {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Invalid action. Use edit, pause, resume, close, or repost.",
        },
        400
      );
    }

    if (sponsorship.status === "closed" || sponsorship.status === "expired") {
      return buildNoStoreResponse(
        {
          success: false,
          message: "Closed or expired sponsorship cannot be edited. Create again instead.",
        },
        400
      );
    }

    const validation = validateCoreEditFields(body);

    if (validation.error || !validation.data) {
      return buildNoStoreResponse(
        { success: false, message: validation.error || "Invalid sponsorship data" },
        400
      );
    }

    sponsorship.sponsorshipTitle = validation.data.sponsorshipTitle;
    sponsorship.sponsorshipType = validation.data.sponsorshipType;
    sponsorship.budget = validation.data.budgetValue;
    sponsorship.category = validation.data.category;
    sponsorship.targetAudience = String(validation.data.targetAudienceValue);
    sponsorship.locationPreference = validation.data.locationPreference;
    sponsorship.campaignGoal = validation.data.campaignGoal;
    sponsorship.coverImage = validation.data.coverImage;
    sponsorship.deliverablesExpected = validation.data.uniqueDeliverables;
    sponsorship.customMessage = validation.data.customMessage;
    sponsorship.contactPersonName = validation.data.contactPersonName;
    sponsorship.contactPhone = validation.data.contactPhone;
    sponsorship.expiresAt = validation.data.selectedDate;

    await sponsorship.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Sponsorship updated successfully",
        data: sponsorship,
      },
      200
    );
  } catch (error) {
    console.error("Update sponsorship error:", error);

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

    return buildNoStoreResponse(
      { success: false, message: "Failed to update sponsorship" },
      500
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid ID" },
        400
      );
    }

    await connectDB();

    const currentUser = await getCurrentUser();

    if (!currentUser?._id) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required" },
        401
      );
    }

    const user = await User.findById(currentUser._id).select("_id role");

    if (!user || user.role !== "SPONSOR") {
      return buildNoStoreResponse(
        { success: false, message: "Unauthorized" },
        403
      );
    }

    const sponsorship = await Sponsorship.findById(id);

    if (!sponsorship || sponsorship.isDeleted) {
      return buildNoStoreResponse(
        { success: false, message: "Sponsorship not found" },
        404
      );
    }

    if (String(sponsorship.sponsorOwnerId) !== String(user._id)) {
      return buildNoStoreResponse(
        { success: false, message: "Access denied" },
        403
      );
    }

    if (sponsorship.status === "closed") {
      return buildNoStoreResponse(
        { success: false, message: "Sponsorship is already closed" },
        400
      );
    }

    sponsorship.status = "closed";
    sponsorship.closedAt = new Date();
    sponsorship.expiresAt = new Date();
    await sponsorship.save();

    return buildNoStoreResponse(
      {
        success: true,
        message: "Sponsorship closed successfully",
      },
      200
    );
  } catch (error) {
    console.error("Delete sponsorship error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Failed to delete sponsorship" },
      500
    );
  }
}