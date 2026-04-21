"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EventCard } from "@/components/EventCard";
import { useAuth } from "@/hooks/useAuth";
import type { Event } from "@/types/event";
import type { Deal, DealStatus } from "@/types/deal";
import type { MySubscriptionResponse } from "@/types/subscription";

type OrganizerDashboardResponse = {
  success: boolean;
  summary?: {
    totalEvents: number;
    draftEvents: number;
    activeEvents: number;
    pastEvents: number;
    totalDeals: number;
    pendingDeals: number;
    negotiatingDeals: number;
    acceptedDeals: number;
    completedDeals: number;
  };
  recentEvents?: Event[];
  recentDeals?: any[];
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    organizationName?: string;
    companyName?: string;
    role?: "ORGANIZER";
  };
  message?: string;
};

function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "Not set";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDealStatusClasses(status: string) {
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
      return "border border-white/10 bg-white/5 text-[#94A3B8]";
  }
}

function normalizeDeal(raw: any): Deal {
  return {
    _id: String(raw?._id || ""),
    title: raw?.title || "",
    description: raw?.description || "",
    proposedAmount:
      typeof raw?.proposedAmount === "number" ? raw.proposedAmount : 0,
    finalAmount:
      typeof raw?.finalAmount === "number" ? raw.finalAmount : null,
    status: raw?.status || "pending",
    paymentStatus: raw?.paymentStatus || "unpaid",
    message: raw?.message || "",
    deliverables: Array.isArray(raw?.deliverables) ? raw.deliverables : [],
    notes: raw?.notes || "",
    disputeReason: raw?.disputeReason || "",
    expiresAt: raw?.expiresAt || null,
    acceptedAt: raw?.acceptedAt || null,
    rejectedAt: raw?.rejectedAt || null,
    cancelledAt: raw?.cancelledAt || null,
    completedAt: raw?.completedAt || null,
    contactReveal: {
      organizerRevealed: Boolean(raw?.contactReveal?.organizerRevealed),
      sponsorRevealed: Boolean(raw?.contactReveal?.sponsorRevealed),
      organizerRevealedAt: raw?.contactReveal?.organizerRevealedAt || null,
      sponsorRevealedAt: raw?.contactReveal?.sponsorRevealedAt || null,
      fullyRevealed: Boolean(raw?.contactReveal?.fullyRevealed),
    },
    createdAt: raw?.createdAt || "",
    updatedAt: raw?.updatedAt || "",
    organizer: {
      _id: String(raw?.organizerId?._id || raw?.organizer?._id || ""),
      name: raw?.organizerId?.name || raw?.organizer?.name || "",
      email: raw?.organizerId?.email || raw?.organizer?.email || "",
      phone: raw?.organizerId?.phone || raw?.organizer?.phone || "",
      companyName:
        raw?.organizerId?.companyName || raw?.organizer?.companyName || "",
    },
    sponsor: {
      _id: String(raw?.sponsorId?._id || raw?.sponsor?._id || ""),
      name: raw?.sponsorId?.name || raw?.sponsor?.name || "",
      email: raw?.sponsorId?.email || raw?.sponsor?.email || "",
      phone: raw?.sponsorId?.phone || raw?.sponsor?.phone || "",
      companyName:
        raw?.sponsorId?.companyName || raw?.sponsor?.companyName || "",
    },
    event: {
      _id: String(raw?.eventId?._id || raw?.event?._id || ""),
      title: raw?.eventId?.title || raw?.event?.title || "",
      location: raw?.eventId?.location || raw?.event?.location || "",
      startDate: raw?.eventId?.startDate || raw?.event?.startDate || "",
    },
  };
}

function getOrganizerDealActions(status: DealStatus): Array<{
  label: string;
  value: DealStatus;
}> {
  if (status === "pending") {
    return [{ label: "Cancel Deal", value: "cancelled" }];
  }

  if (status === "negotiating") {
    return [{ label: "Cancel Deal", value: "cancelled" }];
  }

  if (status === "accepted") {
    return [{ label: "Complete Deal", value: "completed" }];
  }

  if (status === "disputed") {
    return [{ label: "Cancel Deal", value: "cancelled" }];
  }

  return [];
}

function getSubscriptionBannerClasses(
  subscriptionData: MySubscriptionResponse | null
) {
  if (subscriptionData?.adminBypass) {
    return "border-white/10 bg-white/[0.04]";
  }

  if (!subscriptionData?.hasActiveSubscription) {
    return "border-[#FF7A18]/30 bg-[#FF7A18]/10";
  }

  if (subscriptionData?.status === "GRACE") {
    return "border-[#FFB347]/30 bg-[#FFB347]/10";
  }

  return "border-white/10 bg-white/[0.04]";
}

export default function OrganizerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [summary, setSummary] = useState({
    totalEvents: 0,
    draftEvents: 0,
    activeEvents: 0,
    pastEvents: 0,
    totalDeals: 0,
    pendingDeals: 0,
    negotiatingDeals: 0,
    acceptedDeals: 0,
    completedDeals: 0,
  });
  const [subscriptionData, setSubscriptionData] =
    useState<MySubscriptionResponse | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/dashboard/organizer", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: OrganizerDashboardResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load organizer dashboard");
      }

      setSummary({
        totalEvents: data.summary?.totalEvents || 0,
        draftEvents: data.summary?.draftEvents || 0,
        activeEvents: data.summary?.activeEvents || 0,
        pastEvents: data.summary?.pastEvents || 0,
        totalDeals: data.summary?.totalDeals || 0,
        pendingDeals: data.summary?.pendingDeals || 0,
        negotiatingDeals: data.summary?.negotiatingDeals || 0,
        acceptedDeals: data.summary?.acceptedDeals || 0,
        completedDeals: data.summary?.completedDeals || 0,
      });

      setEvents(Array.isArray(data.recentEvents) ? data.recentEvents : []);
      setDeals(
        Array.isArray(data.recentDeals)
          ? data.recentDeals.map(normalizeDeal)
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
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
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login?redirect=/dashboard/organizer");
      return;
    }

    if (user.role !== "ORGANIZER") {
      router.replace("/dashboard/sponsor");
      return;
    }

    fetchDashboard();
    fetchSubscription();
  }, [authLoading, user, router]);

  const handleDealAction = async (dealId: string, status: DealStatus) => {
    try {
      setActionLoadingId(dealId);
      setActionMessage("");
      setActionError("");

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

      setActionMessage(data.message || `Deal marked as ${status}`);
      await fetchDashboard();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update deal"
      );
    } finally {
      setActionLoadingId("");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-base px-4 text-text-light">
        Loading organizer dashboard...
      </div>
    );
  }

  if (!user || user.role !== "ORGANIZER") {
    return null;
  }

  return (
    <main className="min-h-screen bg-dark-base px-4 py-8 text-text-light">
      <div className="container-custom mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-accent-orange">
              Organizer Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Welcome back, {user.firstName || user.name}
            </h1>
            <p className="mt-3 max-w-2xl text-text-muted">
              Manage your events, track sponsor conversations, and move real
              opportunities toward confirmed partnerships.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={() => router.push("/events")}>
              View My Events
            </Button>

            <Button
              variant="primary"
              onClick={() => router.push("/events/create")}
            >
              + Create Event
            </Button>
          </div>
        </div>

        {!subscriptionLoading && (
          <section
            className={`mb-8 rounded-3xl border p-6 sm:p-8 ${getSubscriptionBannerClasses(
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
                    You can access organizer paid actions without purchasing a subscription.
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
                    You can still manage drafts and explore the platform, but publishing events,
                    creating deals, and unlocking full organizer actions need an active subscription.
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

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {actionError ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {actionError}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mb-6 rounded-2xl border border-[#FF7A18]/30 bg-[#FF7A18]/10 px-4 py-3 text-sm text-[#FFB347]">
            {actionMessage}
          </div>
        ) : null}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Total Events</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {summary.totalEvents}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Draft Events</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {summary.draftEvents}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Active Events</p>
            <p className="mt-3 text-3xl font-bold text-accent-orange">
              {summary.activeEvents}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Past / Closed</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {summary.pastEvents}
            </p>
          </div>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Total Deals</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {summary.totalDeals}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Pending Deals</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {summary.pendingDeals}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Negotiating</p>
            <p className="mt-3 text-3xl font-bold text-accent-orange">
              {summary.negotiatingDeals}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-text-muted">Accepted Deals</p>
            <p className="mt-3 text-3xl font-bold text-white">
              {summary.acceptedDeals}
            </p>
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Quick Actions</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <button
              onClick={() => router.push("/events/create")}
              className="rounded-2xl border border-white/10 bg-dark-layer px-5 py-5 text-left transition hover:border-accent-orange/40 hover:bg-white/[0.03]"
            >
              <p className="text-lg font-semibold text-white">Create New Event</p>
              <p className="mt-2 text-sm text-text-muted">
                Launch a new sponsorship-ready event listing.
              </p>
            </button>

            <button
              onClick={() => router.push("/events")}
              className="rounded-2xl border border-white/10 bg-dark-layer px-5 py-5 text-left transition hover:border-accent-orange/40 hover:bg-white/[0.03]"
            >
              <p className="text-lg font-semibold text-white">Manage My Events</p>
              <p className="mt-2 text-sm text-text-muted">
                Review and manage your current event listings.
              </p>
            </button>

            <button
              onClick={() => router.push("/deals")}
              className="rounded-2xl border border-white/10 bg-dark-layer px-5 py-5 text-left transition hover:border-accent-orange/40 hover:bg-white/[0.03]"
            >
              <p className="text-lg font-semibold text-white">View Deals</p>
              <p className="mt-2 text-sm text-text-muted">
                Track active sponsor conversations and agreements.
              </p>
            </button>

            <button
              onClick={() => router.push("/match")}
              className="rounded-2xl border border-white/10 bg-dark-layer px-5 py-5 text-left transition hover:border-accent-orange/40 hover:bg-white/[0.03]"
            >
              <p className="text-lg font-semibold text-white">Check Matches</p>
              <p className="mt-2 text-sm text-text-muted">
                Explore sponsorship matches related to your events.
              </p>
            </button>
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Events</h2>
              <p className="mt-2 text-sm text-text-muted">
                Your latest event activity appears here.
              </p>
            </div>

            <Button variant="ghost" onClick={() => router.push("/events")}>
              View All
            </Button>
          </div>

          {events.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-dark-layer px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-white">
                You have not created any events yet
              </h3>
              <p className="mt-3 text-text-muted">
                Start with your first event and make it sponsor-ready.
              </p>
              <div className="mt-6">
                <Button
                  variant="primary"
                  onClick={() => router.push("/events/create")}
                >
                  Create First Event
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Recent Deals</h2>
              <p className="mt-2 text-sm text-text-muted">
                Track your latest sponsor-side conversations and agreement progress.
              </p>
            </div>

            <Button variant="ghost" onClick={() => router.push("/deals")}>
              View All
            </Button>
          </div>

          {deals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {deals.map((deal) => {
                const counterparty =
                  deal.sponsor.companyName ||
                  deal.sponsor.name ||
                  "Sponsor";

                const actions = getOrganizerDealActions(deal.status);

                return (
                  <div
                    key={deal._id}
                    className="rounded-3xl border border-white/10 bg-dark-layer p-5 transition hover:border-[#FF7A18]/30 hover:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-lg font-semibold text-white">
                          {deal.title || "Untitled deal"}
                        </h3>
                        <p className="mt-2 text-sm text-[#94A3B8]">
                          Event: {deal.event.title || "Linked event unavailable"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${getDealStatusClasses(
                          deal.status
                        )}`}
                      >
                        {deal.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-3">
                        <p className="text-xs text-[#94A3B8]">Proposed</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {formatCurrency(deal.proposedAmount)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-3">
                        <p className="text-xs text-[#94A3B8]">Final</p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {formatCurrency(deal.finalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2 text-sm text-[#94A3B8]">
                      <div className="flex items-center justify-between gap-3">
                        <span>Sponsor</span>
                        <span className="max-w-[60%] truncate text-right text-white">
                          {counterparty}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span>Location</span>
                        <span className="max-w-[60%] truncate text-right text-white">
                          {deal.event.location || "Not set"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span>Updated</span>
                        <span className="text-white">
                          {formatDate(deal.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => router.push(`/deals/${deal._id}`)}
                      >
                        View Deal
                      </Button>

                      {actions.length > 0 ? (
                        actions.map((action) => (
                          <Button
                            key={action.value}
                            variant={
                              action.value === "completed"
                                ? "primary"
                                : "ghost"
                            }
                            className="w-full"
                            onClick={() =>
                              handleDealAction(deal._id, action.value)
                            }
                            loading={actionLoadingId === deal._id}
                          >
                            {actionLoadingId === deal._id
                              ? "Updating..."
                              : action.label}
                          </Button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-[#07152F]/60 px-4 py-3 text-center text-sm text-[#94A3B8]">
                          No quick action available
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-dark-layer px-6 py-12 text-center">
              <h3 className="text-xl font-semibold text-white">No deals yet</h3>
              <p className="mt-3 text-text-muted">
                Once sponsors start reaching out or deals begin, they will appear
                here.
              </p>
              <div className="mt-6">
                <Button
                  variant="secondary"
                  onClick={() => router.push("/events")}
                >
                  View My Events
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}