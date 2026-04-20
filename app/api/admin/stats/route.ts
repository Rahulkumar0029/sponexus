import { NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Sponsor from "@/lib/models/Sponsor";
import { EventModel } from "@/lib/models/Event";
import Sponsorship from "@/lib/models/Sponsorship";
import { DealModel } from "@/lib/models/Deal";
import { requireAdminPermission, writeAdminAuditLog } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const actor = await requireAdminPermission("admin:analytics:read");

    const [
      totalUsers,
      totalOrganizers,
      totalSponsors,
      totalAdmins,
      activeUsers,
      suspendedUsers,

      totalSponsorProfiles,

      totalEvents,
      visibleEvents,
      hiddenEvents,
      flaggedEvents,

      totalSponsorships,
      visibleSponsorships,
      hiddenSponsorships,
      flaggedSponsorships,

      totalDeals,
      pendingDeals,
      negotiatingDeals,
      acceptedDeals,
      disputedDeals,
      frozenDeals,
      resolvedDeals,
    ] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      User.countDocuments({ isDeleted: false, role: "ORGANIZER" }),
      User.countDocuments({ isDeleted: false, role: "SPONSOR" }),
      User.countDocuments({
        isDeleted: false,
        adminRole: { $in: ["SUPPORT_ADMIN", "VERIFICATION_ADMIN", "ADMIN", "SUPER_ADMIN"] },
      }),
      User.countDocuments({ isDeleted: false, accountStatus: "ACTIVE" }),
      User.countDocuments({ isDeleted: false, accountStatus: "SUSPENDED" }),

      Sponsor.countDocuments({}),

      EventModel.countDocuments({ isDeleted: false }),
      EventModel.countDocuments({ isDeleted: false, visibilityStatus: "VISIBLE" }),
      EventModel.countDocuments({ isDeleted: false, visibilityStatus: "HIDDEN" }),
      EventModel.countDocuments({ isDeleted: false, moderationStatus: "FLAGGED" }),

      Sponsorship.countDocuments({ isDeleted: false }),
      Sponsorship.countDocuments({ isDeleted: false, visibilityStatus: "VISIBLE" }),
      Sponsorship.countDocuments({ isDeleted: false, visibilityStatus: "HIDDEN" }),
      Sponsorship.countDocuments({ isDeleted: false, moderationStatus: "FLAGGED" }),

      DealModel.countDocuments({ isDeleted: false }),
      DealModel.countDocuments({ isDeleted: false, status: "pending" }),
      DealModel.countDocuments({ isDeleted: false, status: "negotiating" }),
      DealModel.countDocuments({ isDeleted: false, status: "accepted" }),
      DealModel.countDocuments({ isDeleted: false, status: "disputed" }),
      DealModel.countDocuments({ isDeleted: false, isFrozen: true }),
      DealModel.countDocuments({ isDeleted: false, adminReviewStatus: "RESOLVED" }),
    ]);

    await writeAdminAuditLog({
      actorUserId: actor.user._id,
      actorAdminRole: actor.adminRole,
      action: "ADMIN_STATS_VIEWED",
      targetType: "SYSTEM",
      reason: "Viewed admin dashboard statistics",
    });

    return NextResponse.json(
      {
        success: true,
        stats: {
          users: {
            totalUsers,
            totalOrganizers,
            totalSponsors,
            totalAdmins,
            activeUsers,
            suspendedUsers,
          },
          sponsorProfiles: {
            totalSponsorProfiles,
          },
          events: {
            totalEvents,
            visibleEvents,
            hiddenEvents,
            flaggedEvents,
          },
          sponsorships: {
            totalSponsorships,
            visibleSponsorships,
            hiddenSponsorships,
            flaggedSponsorships,
          },
          deals: {
            totalDeals,
            pendingDeals,
            negotiatingDeals,
            acceptedDeals,
            disputedDeals,
            frozenDeals,
            resolvedDeals,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admin stats error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load admin stats",
      },
      { status: 500 }
    );
  }
}