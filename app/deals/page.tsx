"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { Deal, DealStatus } from "@/types/deal";

type DealsApiResponse = {
  success: boolean;
  deals?: any[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const STATUS_OPTIONS: Array<{ label: string; value: DealStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Negotiating", value: "negotiating" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Disputed", value: "disputed" },
];

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

function getStatusClasses(status: string) {
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

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    let ignore = false;

    async function loadDeals() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        params.set("page", String(pagination.page));
        params.set("limit", String(pagination.limit));

        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }

        const response = await fetch(`/api/deals?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const data: DealsApiResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load deals");
        }

        if (!ignore) {
          setDeals(Array.isArray(data.deals) ? data.deals.map(normalizeDeal) : []);

          setPagination((prev) => ({
            ...prev,
            page: data.pagination?.page || prev.page,
            limit: data.pagination?.limit || prev.limit,
            total: data.pagination?.total || 0,
            totalPages: data.pagination?.totalPages || 1,
          }));
        }
      } catch (err) {
        if (!ignore) {
          setDeals([]);
          setError(err instanceof Error ? err.message : "Failed to load deals");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDeals();

    return () => {
      ignore = true;
    };
  }, [statusFilter, pagination.page, pagination.limit]);

  const summary = useMemo(() => {
    return {
      total: pagination.total,
      pending: deals.filter((deal) => deal.status === "pending").length,
      negotiating: deals.filter((deal) => deal.status === "negotiating").length,
      accepted: deals.filter((deal) => deal.status === "accepted").length,
      completed: deals.filter((deal) => deal.status === "completed").length,
    };
  }, [deals, pagination.total]);

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,122,24,0.14),transparent_28%),linear-gradient(180deg,#07152F_0%,#020617_100%)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-medium text-[#FFB347]">
                Deal Management
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
  Deal Room
</h1>
<p className="mt-3 max-w-2xl text-sm leading-6 text-[#CBD5E1] sm:text-base">
  Manage sponsorship requests, review agreement progress, and close trusted sponsor–organizer partnerships.
</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                <p className="text-xs text-[#94A3B8]">Total</p>
                <p className="mt-2 text-xl font-semibold">{summary.total}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                <p className="text-xs text-[#94A3B8]">Pending</p>
                <p className="mt-2 text-xl font-semibold">{summary.pending}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                <p className="text-xs text-[#94A3B8]">Negotiating</p>
                <p className="mt-2 text-xl font-semibold">{summary.negotiating}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                <p className="text-xs text-[#94A3B8]">Accepted</p>
                <p className="mt-2 text-xl font-semibold">{summary.accepted}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Filter Deals</h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Narrow down your agreements by current status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => {
              const active = statusFilter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPagination((prev) => ({ ...prev, page: 1 }));
                    setStatusFilter(option.value);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-gradient-to-r from-[#FF7A18] to-[#FFB347] text-[#020617]"
                      : "border border-white/10 bg-white/[0.03] text-[#94A3B8] hover:border-[#FF7A18]/30 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 animate-pulse"
              >
                <div className="h-5 w-2/3 rounded bg-white/10" />
                <div className="mt-4 h-4 w-1/2 rounded bg-white/10" />
                <div className="mt-6 h-16 rounded bg-white/10" />
                <div className="mt-6 h-10 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <h3 className="text-lg font-semibold text-red-200">
              Unable to load deals
            </h3>
            <p className="mt-2 text-sm text-red-100/80">{error}</p>
          </div>
        ) : deals.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <h3 className="text-xl font-semibold">No deals found</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#94A3B8]">
              You do not have any deals in this view yet. Once sponsor and
              organizer conversations convert into real agreements, they will
              appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {deals.map((deal) => {
                const counterparty =
                  deal.sponsor.companyName ||
                  deal.sponsor.name ||
                  deal.organizer.companyName ||
                  deal.organizer.name ||
                  "Counterparty";

                return (
                  <Link
                    key={deal._id}
                    href={`/deals/${deal._id}`}
                    className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition hover:border-[#FF7A18]/40 hover:shadow-[0_0_35px_rgba(255,122,24,0.14)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-xl font-bold text-white transition group-hover:text-[#FFB347]">
  {deal.title || "Untitled deal"}
</h3>
<p className="mt-2 line-clamp-1 text-sm text-[#CBD5E1]">
  {deal.event.title || "Linked event unavailable"}
</p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusClasses(
                          deal.status
                        )}`}
                      >
                        {deal.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-[#020617]/40 p-3">
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
                        <span>Counterparty</span>
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

                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="text-sm text-[#CBD5E1]">
  Review agreement
</span>
<span className="inline-flex items-center rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-2 text-sm font-bold text-[#020617] shadow-[0_8px_28px_rgba(255,122,24,0.28)]">
  Open Deal →
</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#94A3B8]">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(prev.page - 1, 1),
                    }))
                  }
                  disabled={pagination.page <= 1}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.page + 1, prev.totalPages || 1),
                    }))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-4 py-2 text-sm font-semibold text-[#020617] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}