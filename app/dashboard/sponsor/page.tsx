"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/Button";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/EmptyState";
import { SponsorshipCard } from "@/components/SponsorshipCard";
import { useAuth } from "@/hooks/useAuth";
import { useMatch } from "@/hooks/useMatch";
import type { Deal, DealStatus } from "@/types/deal";
import type { MySubscriptionResponse } from "@/types/subscription";

type SponsorProfile = {
  _id?: string;
  userId?: string;
  brandName?: string;
  companyName?: string;
  website?: string;
  officialEmail?: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  about?: string;
  logoUrl?: string;
  targetAudience?: string;
  preferredCategories?: string[];
  preferredLocations?: string[];
  sponsorshipInterests?: string[];
  isProfileComplete?: boolean;
  isPublic?: boolean;
};

type DashboardUser = {
  _id?: string;
  role?: "ORGANIZER" | "SPONSOR";
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
};

type MatchItem = {
  score: number;
  event?: {
    _id?: string;
    title?: string;
    description?: string;
    categories?: string[];
    targetAudience?: string[];
    location?: string;
    budget?: number;
    startDate?: string;
    endDate?: string;
    attendeeCount?: number;
    eventType?: string;
    image?: string;
    status?: string;
  };
};

type SponsorshipItem = {
  _id?: string;
  sponsorshipTitle?: string;
  sponsorshipType?: string;
  category?: string;
  budget?: number;
  campaignGoal?: string;
  locationPreference?: string;
  targetAudience?: string;
  status?: "active" | "paused" | "closed";
  createdAt?: string;
  expiresAt?: string | null;
};

type SponsorDashboardResponse = {
  success: boolean;
  summary?: {
    totalSponsorshipPosts: number;
    activeSponsorshipPosts: number;
    pausedSponsorshipPosts: number;
    closedSponsorshipPosts: number;
    totalDeals: number;
    pendingDeals: number;
    negotiatingDeals: number;
    acceptedDeals: number;
    completedDeals: number;
  };
  sponsorProfile?: SponsorProfile | null;
  recentSponsorships?: SponsorshipItem[];
  recentDeals?: Deal[];
  user?: DashboardUser;
  message?: string;
};

type DealActionConfig = {
  label: string;
  value: DealStatus;
  primary?: boolean;
};

function getDealStatusClasses(status?: string) {
  switch (status) {
    case "accepted":
      return "border border-[#FFB347]/40 bg-[#FF7A18]/10 text-[#FFB347]";
    case "negotiating":
      return "border border-[#FF7A18]/30 bg-[#FF7A18]/10 text-[#FFB347]";
    case "rejected":
      return "border border-red-500/30 bg-red-500/10 text-red-300";
    case "completed":
      return "border border-white/20 bg-white/10 text-white";
    case "cancelled":
      return "border border-white/10 bg-white/5 text-[#94A3B8]";
    case "disputed":
      return "border border-red-400/30 bg-red-500/10 text-red-200";
    case "pending":
    default:
      return "border border-white/10 bg-white/5 text-white";
  }
}

function getSponsorDealActions(status?: DealStatus): DealActionConfig[] {
  if (status === "pending") {
    return [
      { label: "Mark Negotiating", value: "negotiating" },
      { label: "Accept Deal", value: "accepted", primary: true },
      { label: "Reject Deal", value: "rejected" },
      { label: "Cancel Deal", value: "cancelled" },
    ];
  }

  if (status === "negotiating") {
    return [
      { label: "Accept Deal", value: "accepted", primary: true },
      { label: "Reject Deal", value: "rejected" },
      { label: "Cancel Deal", value: "cancelled" },
    ];
  }

  if (status === "disputed") {
    return [
      { label: "Mark Negotiating", value: "negotiating" },
      { label: "Cancel Deal", value: "cancelled" },
    ];
  }

  return [];
}

function formatDate(date?: string | null) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getSubscriptionBannerClasses(
  subscriptionData: MySubscriptionResponse | null
) {
  if (subscriptionData?.adminBypass) {
    return "border-white/10 bg-white/[0.05]";
  }

  if (!subscriptionData?.hasActiveSubscription) {
    return "border-[#FF7A18]/30 bg-[#FF7A18]/10";
  }

  if (subscriptionData?.status === "GRACE") {
    return "border-[#FFB347]/30 bg-[#FFB347]/10";
  }

  return "border-white/10 bg-white/[0.05]";
}

export default function SponsorDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    matches,
    loading: matchLoading,
    error: matchError,
    findMatches,
  } = useMatch();

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardUser, setDashboardUser] = useState<DashboardUser | null>(null);
  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(null);
  const [sponsorshipPosts, setSponsorshipPosts] = useState<SponsorshipItem[]>([]);
  const [recentDeals, setRecentDeals] = useState<Deal[]>([]);
  const [subscriptionData, setSubscriptionData] =
    useState<MySubscriptionResponse | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalSponsorshipPosts: 0,
    activeSponsorshipPosts: 0,
    pausedSponsorshipPosts: 0,
    closedSponsorshipPosts: 0,
    totalDeals: 0,
    pendingDeals: 0,
    negotiatingDeals: 0,
    acceptedDeals: 0,
    completedDeals: 0,
  });

  const [dealActionLoadingId, setDealActionLoadingId] = useState("");
  const [dealActionError, setDealActionError] = useState("");
  const [dealActionSuccess, setDealActionSuccess] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!user || user.role !== "SPONSOR") return;

    try {
      setDashboardLoading(true);
      setDashboardError("");

      const res = await fetch("/api/dashboard/sponsor", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: SponsorDashboardResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Unable to load sponsor dashboard");
      }

      setDashboardUser(data.user || null);
      setSponsorProfile(data.sponsorProfile || null);
      setSponsorshipPosts(
        Array.isArray(data.recentSponsorships) ? data.recentSponsorships : []
      );
      setRecentDeals(Array.isArray(data.recentDeals) ? data.recentDeals : []);
      setSummary(
        data.summary || {
          totalSponsorshipPosts: 0,
          activeSponsorshipPosts: 0,
          pausedSponsorshipPosts: 0,
          closedSponsorshipPosts: 0,
          totalDeals: 0,
          pendingDeals: 0,
          negotiatingDeals: 0,
          acceptedDeals: 0,
          completedDeals: 0,
        }
      );
    } catch (err: any) {
      setDashboardError(err?.message || "Unable to load sponsor dashboard");
      setDashboardUser(null);
      setSponsorProfile(null);
      setSponsorshipPosts([]);
      setRecentDeals([]);
    } finally {
      setDashboardLoading(false);
    }
  }, [user]);

  const fetchSubscription = useCallback(async () => {
    try {
      setSubscriptionLoading(true);

      const response = await fetch("/api/subscriptions/my", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: MySubscriptionResponse = await response.json();
      setSubscriptionData(data);
    } catch {
      setSubscriptionData(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "ORGANIZER") {
      router.replace("/dashboard/organizer");
      return;
    }

    if (user.role !== "SPONSOR") {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    loadDashboard();
    fetchSubscription();
  }, [loadDashboard, fetchSubscription]);

  const profileCompletion = useMemo(() => {
    if (!sponsorProfile) return 20;

    let score = 20;

    if (sponsorProfile.brandName) score += 15;
    if (sponsorProfile.companyName) score += 10;
    if (sponsorProfile.preferredCategories?.length) score += 15;
    if (sponsorProfile.targetAudience) score += 15;
    if (sponsorProfile.preferredLocations?.length) score += 15;
    if (sponsorProfile.website) score += 10;
    if (sponsorProfile.officialEmail) score += 10;
    if (sponsorProfile.phone) score += 10;

    return Math.min(score, 100);
  }, [sponsorProfile]);

  const isProfileComplete =
    Boolean(sponsorProfile?.isProfileComplete) || profileCompletion >= 80;

  useEffect(() => {
    const loadMatches = async () => {
      if (!user || user.role !== "SPONSOR") return;
      if (!isProfileComplete) return;

      const userId = user._id;
      if (!userId) return;

      try {
        await findMatches({ sponsorOwnerId: userId });
      } catch {
        // hook keeps its own error state
      }
    };

    loadMatches();
  }, [user, isProfileComplete, findMatches]);

  const activeMatches = useMemo(() => {
    const now = new Date();

    return (matches as MatchItem[]).filter((match) => {
      const event = match?.event;
      if (!event) return false;

      const status = event.status?.toUpperCase();

      if (status === "COMPLETED" || status === "CANCELLED") {
        return false;
      }

      if (event.startDate) {
        const eventDate = new Date(event.startDate);
        if (!Number.isNaN(eventDate.getTime()) && eventDate < now) {
          return false;
        }
      }

      return true;
    });
  }, [matches]);

  const primaryActionLabel = isProfileComplete
    ? "Create Sponsorship"
    : "Complete Profile";

  const primaryActionDescription = isProfileComplete
    ? "Your sponsor profile is ready. Create a sponsorship post so organizers can discover your offering and start real conversations."
    : "Complete your important sponsor details first so Sponexus can unlock stronger opportunities and better matching.";

  const handlePrimaryAction = () => {
    if (isProfileComplete) {
      router.push("/sponsorships/create");
    } else {
      router.push("/settings");
    }
  };

  const handleDealAction = async (dealId: string, status: DealStatus) => {
    try {
      setDealActionLoadingId(`${dealId}-${status}`);
      setDealActionError("");
      setDealActionSuccess("");

      const response = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update deal");
      }

      setDealActionSuccess(data.message || `Deal marked as ${status}`);
      await loadDashboard();
    } catch (error) {
      setDealActionError(
        error instanceof Error ? error.message : "Failed to update deal"
      );
    } finally {
      setDealActionLoadingId("");
    }
  };

  if (authLoading || dashboardLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading sponsor dashboard...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="container-custom max-w-7xl">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-accent-orange" />
              Sponsor Workspace
            </p>

            <h1 className="text-4xl font-bold text-white md:text-5xl">
              Welcome back,{" "}
              <span className="gradient-text">
                {dashboardUser?.firstName || user.firstName || user.name || "Sponsor"}
              </span>
            </h1>

            <p className="mt-3 max-w-2xl text-text-muted">
              Manage your sponsor profile, publish sponsorship opportunities, track
              deals, and discover event partnerships that fit your brand goals.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" onClick={handlePrimaryAction}>
              {primaryActionLabel}
            </Button>

            <Link href="/sponsorships">
              <Button variant="secondary">My Sponsorships</Button>
            </Link>
          </div>
        </div>

        {!subscriptionLoading && (
          <section
            className={`mb-8 rounded-[24px] border p-6 backdrop-blur-xl ${getSubscriptionBannerClasses(
              subscriptionData
            )}`}
          >
            {subscriptionData?.adminBypass ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[#94A3B8]">
                    Access Status
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Admin access active
                  </h2>
                  <p className="mt-2 text-sm text-text-muted">
                    You can access sponsor paid actions without purchasing a subscription.
                  </p>
                </div>

                <Button variant="secondary" onClick={() => router.push("/admin")}>
                  Go to Admin
                </Button>
              </div>
            ) : subscriptionData?.hasActiveSubscription && subscriptionData?.plan ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[#94A3B8]">
                    Current Plan
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {subscriptionData.plan.name}
                  </h2>
                  <p className="mt-2 text-sm text-text-muted">
                    Status: {subscriptionData.status} · Valid till{" "}
                    {formatDate(subscriptionData.subscription?.endDate || "")}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="secondary"
                    onClick={() => router.push("/pricing")}
                  >
                    View Plans
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => router.push("/pricing")}
                  >
                    Renew / Upgrade
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[#FFB347]">
                    Subscription Required
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Publish and deal actions need an active plan
                  </h2>
                  <p className="mt-2 text-sm text-[#CBD5E1]">
                    You can still build your profile and explore opportunities, but creating sponsorships,
                    managing real deal actions, and unlocking full sponsor actions need an active subscription.
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={() => router.push("/pricing")}
                >
                  Activate Plan
                </Button>
              </div>
            )}
          </section>
        )}

        {dashboardError ? (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {dashboardError}
          </div>
        ) : null}

        {dealActionError ? (
          <div className="mb-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {dealActionError}
          </div>
        ) : null}

        {dealActionSuccess ? (
          <div className="mb-8 rounded-xl border border-[#FF7A18]/30 bg-[#FF7A18]/10 p-4 text-[#FFB347]">
            {dealActionSuccess}
          </div>
        ) : null}

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-4 xl:grid-cols-5">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Profile Completion</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {profileCompletion}%
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              A stronger sponsor profile improves visibility and matching quality.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Total Sponsorship Posts</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {summary.totalSponsorshipPosts}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              Your total sponsorship opportunities on Sponexus.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Active Sponsorships</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {summary.activeSponsorshipPosts}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              Currently live sponsorship opportunities visible to organizers.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Open Deals</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {summary.pendingDeals + summary.negotiatingDeals + summary.acceptedDeals}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              Deals currently moving through discussion and closure stages.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Active Match Count</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {isProfileComplete ? activeMatches.length : 0}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              Upcoming event opportunities currently recommended for your profile.
            </p>
          </div>
        </div>

        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
            <p className="mt-2 text-sm text-text-muted">
              Start from the most important sponsor-side actions first.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">{primaryActionLabel}</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {primaryActionDescription}
              </p>
              <div className="mt-6">
                <Button variant="primary" fullWidth onClick={handlePrimaryAction}>
                  {primaryActionLabel}
                </Button>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">My Sponsor Profile</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Review and update your core sponsor identity, visibility, and
                matching preferences.
              </p>
              <div className="mt-6">
                <Link href="/settings">
                  <Button variant="secondary" fullWidth>
                    Open Profile
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">Manage Sponsorships</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                View your current sponsorship posts, track their status, and create
                new opportunities for organizers.
              </p>
              <div className="mt-6">
                <Link href="/sponsorships">
                  <Button variant="secondary" fullWidth>
                    Open Sponsorships
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h3 className="text-xl font-semibold text-white">Manage Deals</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                Track incoming organizer conversations, accepted deals, and closure
                progress in one place.
              </p>
              <div className="mt-6">
                <Link href="/deals">
                  <Button variant="secondary" fullWidth>
                    Open Deals
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Profile Overview</h2>
              <p className="mt-2 text-sm text-text-muted">
                These core sponsor details are currently shaping your marketplace fit.
              </p>
            </div>

            <Link href="/settings">
              <Button size="sm" variant="secondary">
                {isProfileComplete ? "Edit Profile" : "Complete Profile"}
              </Button>
            </Link>
          </div>

          {sponsorProfile ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Brand</p>
                <p className="mt-1 font-semibold text-white">
                  {sponsorProfile.brandName || "Not added"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Company</p>
                <p className="mt-1 font-semibold text-white">
                  {sponsorProfile.companyName || "Not added"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Target Audience</p>
                <p className="mt-1 font-semibold text-white">
                  {sponsorProfile.targetAudience || "Not added"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Preferred Locations</p>
                <p className="mt-1 font-semibold text-white">
                  {sponsorProfile.preferredLocations?.length
                    ? sponsorProfile.preferredLocations.join(", ")
                    : "Not added"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Website</p>
                <p className="mt-1 break-words font-semibold text-white">
                  {sponsorProfile.website || "Not added"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Official Email</p>
                <p className="mt-1 break-words font-semibold text-white">
                  {sponsorProfile.officialEmail || "Not added"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Phone</p>
                <p className="mt-1 font-semibold text-white">
                  {sponsorProfile.phone || "Not added"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-text-muted">Industry</p>
                <p className="mt-1 font-semibold text-white">
                  {sponsorProfile.industry || "Not added"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4 md:col-span-2 xl:col-span-1">
                <p className="text-sm text-text-muted">Status</p>
                <p className="mt-1 font-semibold text-white">
                  {isProfileComplete ? "Ready for sponsorship" : "Needs completion"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4 md:col-span-2 xl:col-span-3">
                <p className="text-sm text-text-muted">Preferred Categories</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sponsorProfile.preferredCategories?.length ? (
                    sponsorProfile.preferredCategories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full bg-white/5 px-3 py-1 text-xs text-text-light"
                      >
                        {category}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-muted">
                      No categories added yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Your sponsor details are incomplete"
              description="Complete the important sponsor information first to unlock stronger recommendations and sponsor-side actions."
              actionLabel="Complete Profile"
              onAction={() => router.push("/settings")}
            />
          )}
        </div>

        <div className="mb-12 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Recent Sponsorship Posts</h2>
              <p className="mt-2 text-sm text-text-muted">
                Your latest sponsorship opportunities managed from this workspace.
              </p>
            </div>

            <Link href="/sponsorships">
              <Button size="sm" variant="secondary">
                View All
              </Button>
            </Link>
          </div>

          {sponsorshipPosts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {sponsorshipPosts.map((post) =>
                post._id ? (
                  <SponsorshipCard
                    key={post._id}
                    sponsorship={post as Required<SponsorshipItem>}
                  />
                ) : null
              )}
            </div>
          ) : (
            <EmptyState
              title="No sponsorship posts yet"
              description="Create your first sponsorship opportunity so organizers can discover your brand offering on Sponexus."
              actionLabel={isProfileComplete ? "Create Sponsorship" : "Complete Profile"}
              onAction={() =>
                router.push(isProfileComplete ? "/sponsorships/create" : "/settings")
              }
            />
          )}
        </div>

        <div className="mb-12 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Recent Deals</h2>
              <p className="mt-2 text-sm text-text-muted">
                Your latest deal conversations and partnership progress.
              </p>
            </div>

            <Link href="/deals">
              <Button size="sm" variant="secondary">
                View All Deals
              </Button>
            </Link>
          </div>

          {recentDeals.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {recentDeals.map((deal) => {
                const availableActions = getSponsorDealActions(deal.status);

                return (
                  <div
                    key={deal._id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <Link
                      href={`/deals/${deal._id}`}
                      className="block transition hover:opacity-95"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-semibold text-white">
                            {deal.title || "Untitled deal"}
                          </h3>
                          <p className="mt-2 text-sm text-text-muted">
                            Event: {deal.event?.title || "Linked event unavailable"}
                          </p>
                          <p className="mt-1 text-sm text-text-muted">
                            Organizer:{" "}
                            {deal.organizer?.companyName ||
                              deal.organizer?.name ||
                              "Organizer"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs capitalize ${getDealStatusClasses(
                            deal.status
                          )}`}
                        >
                          {deal.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-[#07152F]/80 p-3">
                          <p className="text-xs text-text-muted">Proposed</p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            ₹{Number(deal.proposedAmount || 0).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#07152F]/80 p-3">
                          <p className="text-xs text-text-muted">Payment</p>
                          <p className="mt-1 text-sm font-semibold capitalize text-white">
                            {deal.paymentStatus || "unpaid"}
                          </p>
                        </div>
                      </div>
                    </Link>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.push(`/deals/${deal._id}`)}
                      >
                        View Deal
                      </Button>

                      {availableActions.map((action) => {
                        const actionKey = `${deal._id}-${action.value}`;
                        const isLoading = dealActionLoadingId === actionKey;

                        return (
                          <button
                            key={action.value}
                            type="button"
                            onClick={() => handleDealAction(deal._id, action.value)}
                            disabled={Boolean(dealActionLoadingId)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              action.primary
                                ? "bg-gradient-to-r from-[#FF7A18] to-[#FFB347] text-[#020617]"
                                : "border border-white/10 bg-[#07152F]/80 text-white hover:border-[#FF7A18]/30"
                            }`}
                          >
                            {isLoading ? "Updating..." : action.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No deals yet"
              description="Once organizers start discussions on your sponsorship opportunities, your latest deals will appear here."
              actionLabel="Open Sponsorships"
              onAction={() => router.push("/sponsorships")}
            />
          )}
        </div>

        <div>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Top Event Matches</h2>
              <p className="mt-2 text-sm text-text-muted">
                Recommended upcoming event opportunities based on your sponsor profile.
              </p>
            </div>

            <Link href="/match">
              <Button size="sm" variant="primary">
                View All
              </Button>
            </Link>
          </div>

          {!isProfileComplete ? (
            <EmptyState
              title="Complete your profile to unlock matches"
              description="Your event recommendations become more relevant after your sponsor profile is properly completed."
              actionLabel="Complete Profile"
              onAction={() => router.push("/settings")}
            />
          ) : matchLoading ? (
            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-10 text-center text-text-muted backdrop-blur-xl">
              Loading event matches...
            </div>
          ) : matchError ? (
            <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
              {matchError}
            </div>
          ) : activeMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {activeMatches.slice(0, 6).map((match, index) => (
                <div
                  key={`${match.event?._id || index}-${match.score}`}
                  className={`overflow-hidden rounded-[24px] bg-transparent ${
                    index === 0 ? "border border-accent-orange shadow-glow-orange" : ""
                  }`}
                >
                  {index === 0 && (
                    <div className="bg-accent-orange px-4 py-2 text-center text-xs font-semibold text-black">
                      BEST MATCH
                    </div>
                  )}
                  {match.event && (
                    <EventCard event={match.event as any} matchScore={match.score} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active event matches yet"
              description="Create a stronger sponsor profile and sponsorship presence so Sponexus can recommend better upcoming event opportunities."
              actionLabel={isProfileComplete ? "Create Sponsorship" : "Complete Profile"}
              onAction={() =>
                router.push(isProfileComplete ? "/sponsorships/create" : "/settings")
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}