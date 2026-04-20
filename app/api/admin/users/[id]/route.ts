import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Sponsor from "@/lib/models/Sponsor";
import { EventModel } from "@/lib/models/Event";
import Sponsorship from "@/lib/models/Sponsorship";
import { DealModel } from "@/lib/models/Deal";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:users:read");

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user id",
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({ _id: id, isDeleted: false })
      .select(
        [
          "name",
          "email",
          "role",
          "adminRole",
          "accountStatus",
          "firstName",
          "lastName",
          "companyName",
          "avatar",
          "bio",
          "phone",
          "organizationName",
          "eventFocus",
          "organizerTargetAudience",
          "organizerLocation",
          "isEmailVerified",
          "isProfileComplete",
          "suspendedAt",
          "suspensionReason",
          "lastLoginAt",
          "lastActiveAt",
          "createdAt",
          "updatedAt",
        ].join(" ")
      )
      .lean();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const [sponsorProfile, events, sponsorships, dealsAsOrganizer, dealsAsSponsor] =
      await Promise.all([
        Sponsor.findOne({ userId: id }).lean(),
        EventModel.find({ organizerId: id, isDeleted: false })
          .select(
            "title status visibilityStatus moderationStatus location startDate endDate budget createdAt"
          )
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        Sponsorship.find({ sponsorOwnerId: id, isDeleted: false })
          .select(
            "sponsorshipTitle status visibilityStatus moderationStatus category city budget createdAt"
          )
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        DealModel.find({ organizerId: id, isDeleted: false })
          .select(
            "title status paymentStatus isFrozen adminReviewStatus proposedAmount finalAmount createdAt"
          )
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        DealModel.find({ sponsorId: id, isDeleted: false })
          .select(
            "title status paymentStatus isFrozen adminReviewStatus proposedAmount finalAmount createdAt"
          )
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_USER_VIEWED",
      targetType: "USER",
      targetId: id,
      reason: "Viewed user detail in admin panel",
    });

    return NextResponse.json(
      {
        success: true,
        user,
        sponsorProfile,
        related: {
          events,
          sponsorships,
          dealsAsOrganizer,
          dealsAsSponsor,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin user detail error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load user detail",
      },
      { status: 500 }
    );
  }
}