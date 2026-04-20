"use client";

import { useEffect, useState } from "react";

type AdminMeResponse = {
  success: boolean;
  admin?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    adminRole: string;
    accountStatus: string;
    permissions: string[];
    lastLoginAt?: string | null;
    lastActiveAt?: string | null;
  };
  message?: string;
};

type AdminStatsResponse = {
  success: boolean;
  stats?: {
    users: {
      totalUsers: number;
      totalOrganizers: number;
      totalSponsors: number;
      totalAdmins: number;
      activeUsers: number;
      suspendedUsers: number;
    };
    sponsorProfiles: {
      totalSponsorProfiles: number;
    };
    events: {
      totalEvents: number;
      visibleEvents: number;
      hiddenEvents: number;
      flaggedEvents: number;
    };
    sponsorships: {
      totalSponsorships: number;
      visibleSponsorships: number;
      hiddenSponsorships: number;
      flaggedSponsorships: number;
    };
    deals: {
      totalDeals: number;
      pendingDeals: number;
      negotiatingDeals: number;
      acceptedDeals: number;
      disputedDeals: number;
      frozenDeals: number;
      resolvedDeals: number;
    };
  };
  message?: string;
};

export default function AdminDashboardPage() {
  const [adminData, setAdminData] = useState<AdminMeResponse | null>(null);
  const [statsData, setStatsData] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [adminRes, statsRes] = await Promise.all([
          fetch("/api/admin/me", { cache: "no-store" }),
          fetch("/api/admin/stats", { cache: "no-store" }),
        ]);

        const [adminJson, statsJson] = await Promise.all([
          adminRes.json(),
          statsRes.json(),
        ]);

        setAdminData(adminJson);
        setStatsData(statsJson);
      } catch {
        setAdminData({
          success: false,
          message: "Failed to load admin session",
        });
        setStatsData({
          success: false,
          message: "Failed to load admin stats",
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        Loading admin dashboard...
      </div>
    );
  }

  if (!adminData?.success || !adminData.admin) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
        {adminData?.message || "Unable to load admin session"}
      </div>
    );
  }

  const admin = adminData.admin;
  const stats = statsData?.stats;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">
          Founder Dashboard
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Admin Overview</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#94A3B8]">
          Monitor marketplace health, moderation load, sponsor trust, and deal
          movement from one control center.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Admin Name" value={admin.name} sub={admin.email} />
        <StatCard title="Admin Role" value={admin.adminRole} sub={admin.accountStatus} />
        <StatCard title="Permissions" value={String(admin.permissions.length)} sub="granted actions" />
        <StatCard
          title="Last Login"
          value={admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString("en-IN") : "Never"}
          sub={admin.lastActiveAt ? `Active ${new Date(admin.lastActiveAt).toLocaleString("en-IN")}` : "No activity"}
        />
      </div>

      {!statsData?.success || !stats ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          {statsData?.message || "Unable to load stats"}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Users" value={stats.users.totalUsers} helper={`${stats.users.activeUsers} active`} />
            <MetricCard label="Total Events" value={stats.events.totalEvents} helper={`${stats.events.flaggedEvents} flagged`} />
            <MetricCard label="Total Sponsorships" value={stats.sponsorships.totalSponsorships} helper={`${stats.sponsorships.flaggedSponsorships} flagged`} />
            <MetricCard label="Total Deals" value={stats.deals.totalDeals} helper={`${stats.deals.disputedDeals} disputed`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Users Snapshot">
              <SnapshotRow label="Organizers" value={stats.users.totalOrganizers} />
              <SnapshotRow label="Sponsors" value={stats.users.totalSponsors} />
              <SnapshotRow label="Admin Accounts" value={stats.users.totalAdmins} />
              <SnapshotRow label="Suspended Users" value={stats.users.suspendedUsers} />
              <SnapshotRow label="Sponsor Profiles" value={stats.sponsorProfiles.totalSponsorProfiles} />
            </SectionCard>

            <SectionCard title="Events Snapshot">
              <SnapshotRow label="Visible Events" value={stats.events.visibleEvents} />
              <SnapshotRow label="Hidden Events" value={stats.events.hiddenEvents} />
              <SnapshotRow label="Flagged Events" value={stats.events.flaggedEvents} />
            </SectionCard>

            <SectionCard title="Sponsorships Snapshot">
              <SnapshotRow label="Visible Sponsorships" value={stats.sponsorships.visibleSponsorships} />
              <SnapshotRow label="Hidden Sponsorships" value={stats.sponsorships.hiddenSponsorships} />
              <SnapshotRow label="Flagged Sponsorships" value={stats.sponsorships.flaggedSponsorships} />
            </SectionCard>

            <SectionCard title="Deals Snapshot">
              <SnapshotRow label="Pending Deals" value={stats.deals.pendingDeals} />
              <SnapshotRow label="Negotiating Deals" value={stats.deals.negotiatingDeals} />
              <SnapshotRow label="Accepted Deals" value={stats.deals.acceptedDeals} />
              <SnapshotRow label="Disputed Deals" value={stats.deals.disputedDeals} />
              <SnapshotRow label="Frozen Deals" value={stats.deals.frozenDeals} />
              <SnapshotRow label="Resolved Reviews" value={stats.deals.resolvedDeals} />
            </SectionCard>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold">Current Admin Access</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {admin.permissions.map((permission) => (
                <span
                  key={permission}
                  className="rounded-full border border-[#FF7A18]/30 bg-[#FF7A18]/10 px-3 py-1 text-xs text-[#FFB347]"
                >
                  {permission}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-[#94A3B8]">{title}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-[#94A3B8]">{sub}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-[#94A3B8]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value.toLocaleString("en-IN")}</p>
      <p className="mt-2 text-xs text-[#94A3B8]">{helper}</p>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function SnapshotRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#07152F]/70 px-4 py-3">
      <span className="text-sm text-[#94A3B8]">{label}</span>
      <span className="text-sm font-medium text-white">{value.toLocaleString("en-IN")}</span>
    </div>
  );
}