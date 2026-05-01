"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import type { Deal, DealStatus } from "@/types/deal";
import { useAuth } from "@/hooks/useAuth";

type DealApiResponse = {
  success: boolean;
  deal?: any;
  message?: string;
};

const STATUS_ACTIONS: Array<{
  label: string;
  value: DealStatus;
}> = [
  { label: "Mark Negotiating", value: "negotiating" },
  { label: "Accept Deal", value: "accepted" },
  { label: "Reject Deal", value: "rejected" },
  { label: "Cancel Deal", value: "cancelled" },
  { label: "Complete Deal", value: "completed" },
];

function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "Not set";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
createdBy: String(raw?.createdBy?._id || raw?.createdBy || ""),
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

function parseDeliverablesInput(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isFinalDealState(status: DealStatus) {
  return ["rejected", "completed", "cancelled"].includes(status);
}

function getVisibleActions(
  status: DealStatus,
  roleInDeal: "ORGANIZER" | "SPONSOR" | null,
  currentUserId: string,
  createdBy?: string
): DealStatus[] {
  if (!roleInDeal || !currentUserId) return [];

  const isCreator = Boolean(createdBy && createdBy === currentUserId);

  if (status === "pending" || status === "negotiating") {
    if (isCreator) {
      return ["cancelled"];
    }

    return ["negotiating", "accepted", "rejected", "cancelled"];
  }

  if (status === "accepted") {
    if (roleInDeal === "ORGANIZER") {
      return ["completed"];
    }

    return [];
  }

  if (status === "disputed") {
    return ["cancelled"];
  }

  return [];

}

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const dealId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);

  const [finalAmountInput, setFinalAmountInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [paymentStatusInput, setPaymentStatusInput] = useState("unpaid");
  const [deliverablesInput, setDeliverablesInput] = useState("");
  const [disputeReasonInput, setDisputeReasonInput] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDeal() {
      if (!dealId) {
        setPageError("Invalid deal id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPageError("");

        const response = await fetch(`/api/deals/${dealId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data: DealApiResponse = await response.json();

        if (!response.ok || !data.success || !data.deal) {
          throw new Error(data.message || "Failed to load deal");
        }

        if (!ignore) {
          const normalized = normalizeDeal(data.deal);
          setDeal(normalized);
          setFinalAmountInput(
            normalized.finalAmount !== null ? String(normalized.finalAmount) : ""
          );
          setMessageInput(normalized.message || "");
          setNotesInput(normalized.notes || "");
          setPaymentStatusInput(normalized.paymentStatus || "unpaid");
          setDeliverablesInput((normalized.deliverables || []).join("\n"));
          setDisputeReasonInput(normalized.disputeReason || "");
        }
      } catch (error) {
        if (!ignore) {
          setPageError(
            error instanceof Error ? error.message : "Failed to load deal"
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDeal();

    return () => {
      ignore = true;
    };
  }, [dealId]);

const currentUserId = (user as any)?._id || (user as any)?.id || "";

const roleInDeal = useMemo<"ORGANIZER" | "SPONSOR" | null>(() => {
  if (!currentUserId || !deal) return null;
  if (currentUserId === deal.organizer._id) return "ORGANIZER";
  if (currentUserId === deal.sponsor._id) return "SPONSOR";
  return null;
}, [currentUserId, deal]);

  const canEditCommercialFields = useMemo(() => {
    if (!deal || roleInDeal !== "ORGANIZER") return false;
    if (isFinalDealState(deal.status)) return false;
    return true;
  }, [deal, roleInDeal]);

  const canEditPaymentStatus = useMemo(() => {
    if (!deal || roleInDeal !== "ORGANIZER") return false;
    return true;
  }, [deal, roleInDeal]);

  const canRaiseDispute = useMemo(() => {
    if (!deal || !roleInDeal) return false;
    return !["completed", "cancelled", "rejected"].includes(deal.status);
  }, [deal, roleInDeal]);

  const canRevealContact = useMemo(() => {
    if (!deal || !roleInDeal) return false;
    return deal.status === "accepted" && !deal.contactReveal.fullyRevealed;
  }, [deal, roleInDeal]);

  const hasCurrentUserRevealed = useMemo(() => {
    if (!deal || !roleInDeal) return false;
    if (roleInDeal === "ORGANIZER") return deal.contactReveal.organizerRevealed;
    if (roleInDeal === "SPONSOR") return deal.contactReveal.sponsorRevealed;
    return false;
  }, [deal, roleInDeal]);

  const waitingForOtherParty = useMemo(() => {
    if (!deal || !roleInDeal || deal.contactReveal.fullyRevealed) return false;
    return hasCurrentUserRevealed;
  }, [deal, roleInDeal, hasCurrentUserRevealed]);

  const visibleActions = useMemo(
  () =>
    deal
      ? getVisibleActions(deal.status, roleInDeal, currentUserId, deal.createdBy)
      : [],
  [deal, roleInDeal, currentUserId]
);

  const timelineItems = useMemo(() => {
    if (!deal) return [];

    return [
      {
        label: "Deal Created",
        value: deal.createdAt,
      },
      {
        label: "Accepted",
        value: deal.acceptedAt,
      },
      {
        label: "Rejected",
        value: deal.rejectedAt,
      },
      {
        label: "Cancelled",
        value: deal.cancelledAt,
      },
      {
        label: "Completed",
        value: deal.completedAt,
      },
      {
        label: "Last Updated",
        value: deal.updatedAt,
      },
    ].filter((item) => item.value);
  }, [deal]);

  async function refreshDeal() {
    if (!dealId) return;

    const response = await fetch(`/api/deals/${dealId}`, {
  method: "GET",
  credentials: "include",
  cache: "no-store",
});

    const data: DealApiResponse = await response.json();

    if (!response.ok || !data.success || !data.deal) {
      throw new Error(data.message || "Failed to refresh deal");
    }

    const normalized = normalizeDeal(data.deal);
    setDeal(normalized);
    setFinalAmountInput(
      normalized.finalAmount !== null ? String(normalized.finalAmount) : ""
    );
    setMessageInput(normalized.message || "");
    setNotesInput(normalized.notes || "");
    setPaymentStatusInput(normalized.paymentStatus || "unpaid");
    setDeliverablesInput((normalized.deliverables || []).join("\n"));
    setDisputeReasonInput(normalized.disputeReason || "");
  }

  async function updateDeal(payload: Record<string, unknown>, successMessage: string) {
    if (!dealId) return;

    try {
      setSaving(true);
      setActionError("");
      setActionSuccess("");

      const response = await fetch(`/api/deals/${dealId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify(payload),
});

      const data: DealApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update deal");
      }

      await refreshDeal();
      setActionSuccess(successMessage);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to update deal"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRevealContact() {
    if (!dealId) return;

    try {
      setRevealLoading(true);
      setActionError("");
      setActionSuccess("");

     const response = await fetch(`/api/deals/${dealId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({ revealContact: true }),
});

      const data: DealApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to reveal contact");
      }

      await refreshDeal();
      setActionSuccess(
        data.message || "Contact reveal request updated successfully"
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to reveal contact"
      );
    } finally {
      setRevealLoading(false);
    }
  }

  async function handleSaveDetails() {
    const payload: Record<string, unknown> = {
      message: messageInput,
      notes: notesInput,
      deliverables: parseDeliverablesInput(deliverablesInput),
    };

    if (canEditPaymentStatus) {
      payload.paymentStatus = paymentStatusInput;
    }

    if (finalAmountInput.trim() === "") {
      payload.finalAmount = null;
    } else {
      const parsedFinalAmount = Number(finalAmountInput);
      if (Number.isNaN(parsedFinalAmount) || parsedFinalAmount < 0) {
        setActionError("Final amount must be a valid non-negative number");
        setActionSuccess("");
        return;
      }
      payload.finalAmount = parsedFinalAmount;
    }

    await updateDeal(payload, "Deal details updated successfully");
  }

  async function handleStatusChange(status: DealStatus) {
    await updateDeal({ status }, `Deal marked as ${status}`);
  }

  async function handleRaiseDispute() {
    if (!disputeReasonInput.trim()) {
      setActionError("Please enter a dispute reason");
      setActionSuccess("");
      return;
    }

    await updateDeal(
      {
        status: "disputed",
        disputeReason: disputeReasonInput.trim(),
      },
      "Dispute raised successfully"
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-1/3 rounded bg-white/10" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 h-[420px] rounded-3xl bg-white/5" />
              <div className="h-[420px] rounded-3xl bg-white/5" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (pageError || !deal) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
            <h1 className="text-2xl font-semibold text-red-200">
              Unable to load this deal
            </h1>
            <p className="mt-3 text-sm text-red-100/80">
              {pageError || "Deal not found"}
            </p>
            <div className="mt-6">
              <Link
                href="/deals"
                className="inline-flex rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-semibold text-[#020617]"
              >
                Back to Deals
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,122,24,0.14),transparent_30%),linear-gradient(180deg,#07152F_0%,#020617_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <Link
              href="/deals"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[#94A3B8] transition hover:border-[#FF7A18]/30 hover:text-white"
            >
              ← Back to Deals
            </Link>

            <button
              type="button"
              onClick={() => router.refresh()}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[#94A3B8] transition hover:border-[#FF7A18]/30 hover:text-white"
            >
              Refresh View
            </button>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-medium text-[#FFB347]">
                Deal Detail
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {deal.title || "Untitled deal"}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#94A3B8] sm:text-base">
                {deal.description || "No description added for this agreement yet."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${getStatusClasses(
                  deal.status
                )}`}
              >
                {deal.status.replace("_", " ")}
              </span>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs text-[#94A3B8]">Proposed</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCurrency(deal.proposedAmount)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-xs text-[#94A3B8]">Final</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {formatCurrency(deal.finalAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-[#94A3B8]">Event</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {deal.event.title || "Linked event unavailable"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-[#94A3B8]">Location</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {deal.event.location || "Not set"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-[#94A3B8]">Created</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {formatDateTime(deal.createdAt)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs text-[#94A3B8]">Payment</p>
              <p className="mt-2 text-sm font-semibold capitalize text-white">
                {deal.paymentStatus}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {(actionError || actionSuccess) && (
          <div
            className={`mb-6 rounded-2xl p-4 ${
              actionError
                ? "border border-red-500/20 bg-red-500/10 text-red-200"
                : "border border-[#FF7A18]/20 bg-[#FF7A18]/10 text-[#FFB347]"
            }`}
          >
            {actionError || actionSuccess}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Parties & Event</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
                  <p className="text-xs text-[#94A3B8]">Organizer</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {deal.organizer.companyName ||
                      deal.organizer.name ||
                      "Organizer"}
                  </p>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    {deal.organizer.email || "No email"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
                  <p className="text-xs text-[#94A3B8]">Sponsor</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {deal.sponsor.companyName || deal.sponsor.name || "Sponsor"}
                  </p>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    {deal.sponsor.email || "No email"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
                  <p className="text-xs text-[#94A3B8]">Event</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {deal.event.title || "Linked event unavailable"}
                  </p>
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    {deal.event.location || "No location"}
                  </p>
                </div>
              </div>
            </section>

            {canEditCommercialFields || canEditPaymentStatus ? (
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Agreement Details</h2>
                    <p className="mt-1 text-sm text-[#94A3B8]">
                      {roleInDeal === "ORGANIZER"
                        ? "Update deal details and keep the agreement moving."
                        : "Review agreement details."}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Final Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={finalAmountInput}
                      onChange={(e) => setFinalAmountInput(e.target.value)}
                      placeholder="Enter final agreed amount"
                      disabled={!canEditCommercialFields}
                      className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none transition placeholder:text-[#94A3B8] disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#FF7A18]/40"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Message
                    </label>
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      rows={4}
                      placeholder="Add important communication summary"
                      disabled={!canEditCommercialFields}
                      className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none transition placeholder:text-[#94A3B8] disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#FF7A18]/40"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Notes
                    </label>
                    <textarea
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      rows={5}
                      placeholder="Add internal agreement notes"
                      disabled={!canEditCommercialFields}
                      className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none transition placeholder:text-[#94A3B8] disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#FF7A18]/40"
                    />
                  </div>

                  {canEditPaymentStatus ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">
                        Payment Status
                      </label>
                      <select
                        value={paymentStatusInput}
                        onChange={(e) => setPaymentStatusInput(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none transition focus:border-[#FF7A18]/40"
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  ) : null}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Deliverables
                    </label>
                    <textarea
                      value={deliverablesInput}
                      onChange={(e) => setDeliverablesInput(e.target.value)}
                      rows={6}
                      placeholder={`One deliverable per line\nLogo on stage backdrop\nInstagram story mention\nStall branding`}
                      disabled={!canEditCommercialFields}
                      className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none transition placeholder:text-[#94A3B8] disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#FF7A18]/40"
                    />
                  </div>

                  {(canEditCommercialFields || canEditPaymentStatus) && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveDetails}
                        disabled={saving}
                        className="rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-6 py-3 text-sm font-semibold text-[#020617] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save Details"}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="text-xl font-semibold">Agreement Details</h2>
                <p className="mt-3 text-sm text-[#94A3B8]">
                  This deal is currently read-only for your role in its current state.
                </p>
              </section>
            )}

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Deliverables Preview</h2>

              {deal.deliverables.length === 0 ? (
                <p className="mt-4 text-sm text-[#94A3B8]">
                  No deliverables added yet.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {deal.deliverables.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className="rounded-full border border-white/10 bg-[#07152F]/80 px-3 py-2 text-sm text-white"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {deal.status === "disputed" && (
              <section className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
                <h2 className="text-xl font-semibold text-red-200">
                  Dispute Reason
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-red-100/90">
                  {deal.disputeReason || "No dispute reason available."}
                </p>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Deal Actions</h2>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Move the deal forward with controlled status updates.
              </p>

              <div className="mt-5 grid gap-3">
                {STATUS_ACTIONS.filter((action) =>
                  visibleActions.includes(action.value)
                ).map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => handleStatusChange(action.value)}
                    disabled={saving || deal.status === action.value}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                      action.value === "accepted" || action.value === "completed"
                        ? "bg-gradient-to-r from-[#FF7A18] to-[#FFB347] text-[#020617] disabled:opacity-40"
                        : "border border-white/10 bg-[#07152F]/80 text-white hover:border-[#FF7A18]/30 disabled:opacity-40"
                    } disabled:cursor-not-allowed`}
                  >
                    {action.label}
                  </button>
                ))}

                {visibleActions.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-[#07152F]/60 px-4 py-3 text-sm text-[#94A3B8]">
                    No further actions available for this deal state.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Contact Exchange</h2>

              {deal.status !== "accepted" ? (
                <p className="mt-3 text-sm text-[#94A3B8]">
                  Contact details will be available after deal acceptance.
                </p>
              ) : deal.contactReveal.fullyRevealed ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
                    <p className="text-sm text-[#94A3B8]">Organizer Contact</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {deal.organizer.companyName || deal.organizer.name || "Organizer"}
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {deal.organizer.email || "No email shared"}
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {deal.organizer.phone || "No phone shared"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
                    <p className="text-sm text-[#94A3B8]">Sponsor Contact</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {deal.sponsor.companyName || deal.sponsor.name || "Sponsor"}
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {deal.sponsor.email || "No email shared"}
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {deal.sponsor.phone || "No phone shared"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-[#94A3B8]">
                    Both parties must reveal contact details to unlock access.
                  </p>

                  {waitingForOtherParty ? (
  <div className="rounded-2xl border border-white/10 bg-[#07152F]/60 px-4 py-3 text-sm text-[#94A3B8]">
    You have revealed your contact details. Waiting for the other party.
  </div>
) : canRevealContact ? (
  <button
    type="button"
    onClick={handleRevealContact}
    disabled={revealLoading}
    className="rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-semibold text-[#020617] disabled:cursor-not-allowed disabled:opacity-50"
  >
    {revealLoading ? "Processing..." : "Reveal My Contact Details"}
  </button>
) : (
  <div className="rounded-2xl border border-white/10 bg-[#07152F]/60 px-4 py-3 text-sm text-[#94A3B8]">
    Contact reveal is not available right now.
  </div>
)}

                  <p className="text-xs text-[#94A3B8]">
                    Once both parties agree, contact details will be unlocked.
                  </p>
                </div>
              )}
            </section>

            {canRaiseDispute ? (
              <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
                <h2 className="text-xl font-semibold text-red-200">
                  Raise Dispute
                </h2>
                <p className="mt-2 text-sm text-red-100/80">
                  Use only when there is a real issue in execution, agreement, or
                  payment understanding.
                </p>

                <div className="mt-4">
                  <textarea
                    value={disputeReasonInput}
                    onChange={(e) => setDisputeReasonInput(e.target.value)}
                    rows={5}
                    placeholder="Enter dispute reason"
                    className="w-full rounded-2xl border border-red-500/20 bg-[#07152F]/80 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8] focus:border-red-400/40"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRaiseDispute}
                  disabled={saving}
                  className="mt-4 w-full rounded-full border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Submitting..." : "Raise Dispute"}
                </button>
              </section>
            ) : null}

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Timeline</h2>

              {timelineItems.length === 0 ? (
                <p className="mt-4 text-sm text-[#94A3B8]">
                  No timeline activity available yet.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {timelineItems.map((item) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4"
                    >
                      <p className="text-xs uppercase tracking-wide text-[#94A3B8]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {formatDateTime(item.value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Quick Summary</h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 text-[#94A3B8]">
                  <span>Status</span>
                  <span className="capitalize text-white">{deal.status}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[#94A3B8]">
                  <span>Proposed Amount</span>
                  <span className="text-white">
                    {formatCurrency(deal.proposedAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[#94A3B8]">
                  <span>Final Amount</span>
                  <span className="text-white">
                    {formatCurrency(deal.finalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[#94A3B8]">
                  <span>Payment Status</span>
                  <span className="capitalize text-white">
                    {deal.paymentStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[#94A3B8]">
                  <span>Expires At</span>
                  <span className="text-white">
                    {formatDateTime(deal.expiresAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[#94A3B8]">
                  <span>Your Role</span>
                  <span className="capitalize text-white">
                    {roleInDeal ? roleInDeal.toLowerCase() : "viewer"}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}