import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";
import User from "@/lib/models/User";
import Sponsor from "@/lib/models/Sponsor";
import { EventModel } from "@/lib/models/Event";
import Sponsorship from "@/lib/models/Sponsorship";
import { DealModel } from "@/lib/models/Deal";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:access");

    const q = request.nextUrl.searchParams.get("q")?.trim() || "";

    if (!q) {
      return NextResponse.json(
        {
          success: false,
          message: "Search query is required",
        },
        { status: 400 }
      );
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const isObjectId = mongoose.Types.ObjectId.isValid(q);

    const userQuery: any = {
      isDeleted: false,
      $or: [
        { email: regex },
        { name: regex },
        { firstName: regex },
        { lastName: regex },
        { companyName: regex },
        { phone: regex },
        { organizationName: regex },
      ],
    };

    if (isObjectId) {
      userQuery.$or.push({ _id: new mongoose.Types.ObjectId(q) });
    }

    const sponsorProfileQuery: any = {
      $or: [
        { brandName: regex },
        { companyName: regex },
        { officialEmail: regex },
        { officialPhone: regex },
      ],
    };

    if (isObjectId) {
      sponsorProfileQuery.$or.push({ userId: new mongoose.Types.ObjectId(q) });
    }

    const eventQuery: any = {
      isDeleted: false,
      $or: [
        { title: regex },
        { description: regex },
        { location: regex },
      ],
    };

    if (isObjectId) {
      eventQuery.$or.push({ _id: new mongoose.Types.ObjectId(q) });
      eventQuery.$or.push({ organizerId: new mongoose.Types.ObjectId(q) });
    }

    const sponsorshipQuery: any = {
      isDeleted: false,
      $or: [
        { sponsorshipTitle: regex },
        { sponsorshipType: regex },
        { category: regex },
        { city: regex },
        { locationPreference: regex },
        { contactPersonName: regex },
        { contactPhone: regex },
      ],
    };

    if (isObjectId) {
      sponsorshipQuery.$or.push({ _id: new mongoose.Types.ObjectId(q) });
      sponsorshipQuery.$or.push({ sponsorOwnerId: new mongoose.Types.ObjectId(q) });
    }

    const dealQuery: any = {
      isDeleted: false,
      $or: [
        { title: regex },
        { description: regex },
        { message: regex },
        { notes: regex },
        { disputeReason: regex },
      ],
    };

    if (isObjectId) {
      const objectId = new mongoose.Types.ObjectId(q);
      dealQuery.$or.push({ _id: objectId });
      dealQuery.$or.push({ organizerId: objectId });
      dealQuery.$or.push({ sponsorId: objectId });
      dealQuery.$or.push({ eventId: objectId });
    }

    const [users, sponsorProfiles, events, sponsorships, deals] =
      await Promise.all([
        User.find(userQuery)
          .select(
            "name email role adminRole accountStatus isEmailVerified companyName phone organizationName createdAt"
          )
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),

        Sponsor.find(sponsorProfileQuery)
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),

        EventModel.find(eventQuery)
          .select(
            "title organizerId status visibilityStatus moderationStatus location startDate endDate createdAt"
          )
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),

        Sponsorship.find(sponsorshipQuery)
          .select(
            "sponsorshipTitle sponsorOwnerId status visibilityStatus moderationStatus category city budget createdAt"
          )
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),

        DealModel.find(dealQuery)
          .select(
            "title organizerId sponsorId eventId status paymentStatus isFrozen adminReviewStatus proposedAmount finalAmount createdAt"
          )
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_GLOBAL_SEARCH",
      targetType: "SYSTEM",
      reason: "Admin searched platform data",
      metadata: {
        query: q,
        resultCounts: {
          users: users.length,
          sponsorProfiles: sponsorProfiles.length,
          events: events.length,
          sponsorships: sponsorships.length,
          deals: deals.length,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        query: q,
        results: {
          users,
          sponsorProfiles,
          events,
          sponsorships,
          deals,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin search error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to search admin data",
      },
      { status: 500 }
    );
  }
}