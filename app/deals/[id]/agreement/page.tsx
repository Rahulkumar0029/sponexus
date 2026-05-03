"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import type { Deal, DealStatus } from "@/types/deal";
import type { DealAgreement, DealAgreementResponse } from "@/types/deal-agreement";
import { useAuth } from "@/hooks/useAuth";
import { AgreementProofUpload } from "@/components/deals/AgreementProofUpload";

type DealApiResponse = {
  success: boolean;
  deal?: any;
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

function formatDateTime(value?: string | null) {
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

function canUseAgreement(status: DealStatus) {
  return status === "accepted" || status === "completed";
}

function parseDeliverablesInput(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAgreementStatusLabel(status?: string) {
  switch (status) {
    case "SIGNED":
      return "Signed";
    case "PENDING_ORGANIZER_OTP":
      return "Waiting for organizer verification";
    case "PENDING_SPONSOR_OTP":
      return "Waiting for sponsor verification";
    case "PENDING_BOTH_OTP":
      return "Waiting for both parties verification";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    case "DRAFT":
      return "Draft";
    default:
      return "Not created";
  }
}

function getStatusClasses(status?: string) {
  if (status === "SIGNED") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }

  if (
    status === "PENDING_ORGANIZER_OTP" ||
    status === "PENDING_SPONSOR_OTP" ||
    status === "PENDING_BOTH_OTP"
  ) {
    return "border-[#FFB347]/30 bg-[#FFB347]/10 text-[#FFB347]";
  }

  if (status === "CANCELLED" || status === "EXPIRED") {
    return "border-red-400/30 bg-red-500/10 text-red-200";
  }

  return "border-white/10 bg-white/[0.04] text-[#94A3B8]";
}

function getVerificationText(status?: string) {
  if (status === "VERIFIED") return "Verified";
  if (status === "SENT") return "OTP sent";
  if (status === "EXPIRED") return "OTP expired";
  return "Not verified";
}

function getAgreementRoleByUserId(
  userId: string,
  agreement: DealAgreement | null
): "ORGANIZER" | "SPONSOR" | null {
  if (!agreement || !userId) return null;

  if (String(agreement.organizerId) === userId) return "ORGANIZER";
  if (String(agreement.sponsorId) === userId) return "SPONSOR";

  return null;
}

function getOtherRole(role: "ORGANIZER" | "SPONSOR") {
  return role === "ORGANIZER" ? "SPONSOR" : "ORGANIZER";
}

function getNextSignerRole(
  agreement: DealAgreement | null
): "ORGANIZER" | "SPONSOR" | null {
  if (!agreement || agreement.status === "SIGNED") return null;

  const creatorRole = getAgreementRoleByUserId(
    String(agreement.createdBy),
    agreement
  );

  if (!creatorRole) return null;

  const counterpartyRole = getOtherRole(creatorRole);

  const creatorVerification =
    creatorRole === "ORGANIZER"
      ? agreement.organizerVerification
      : agreement.sponsorVerification;

  const counterpartyVerification =
    counterpartyRole === "ORGANIZER"
      ? agreement.organizerVerification
      : agreement.sponsorVerification;

  if (counterpartyVerification?.otpStatus !== "VERIFIED") {
    return counterpartyRole;
  }

  if (creatorVerification?.otpStatus !== "VERIFIED") {
    return creatorRole;
  }

  return null;
}

export default function DealAgreementPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();

  const dealId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [agreement, setAgreement] = useState<DealAgreement | null>(null);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

 const [otp, setOtp] = useState("");
const [pageError, setPageError] = useState("");
const [actionError, setActionError] = useState("");
const [actionSuccess, setActionSuccess] = useState("");

const [finalAmountInput, setFinalAmountInput] = useState("");
const [paymentStatusInput, setPaymentStatusInput] = useState("unpaid");
const [messageInput, setMessageInput] = useState("");
const [notesInput, setNotesInput] = useState("");
const [deliverablesInput, setDeliverablesInput] = useState("");
const [savingDetails, setSavingDetails] = useState(false);

  const currentUserId = (user as any)?._id || (user as any)?.id || "";

  const roleInDeal = useMemo<"ORGANIZER" | "SPONSOR" | null>(() => {
    if (!deal || !currentUserId) return null;

    if (deal.organizer._id === currentUserId) return "ORGANIZER";
    if (deal.sponsor._id === currentUserId) return "SPONSOR";

    return null;
  }, [deal, currentUserId]);

  const agreementAllowed = deal ? canUseAgreement(deal.status) : false;

  const missingItems = useMemo(() => {
    const items: string[] = [];

    if (!deal) return items;

    if (!agreementAllowed) {
      items.push("Deal must be accepted before agreement preparation.");
    }

    if (
  typeof deal.finalAmount !== "number" ||
  !Number.isFinite(deal.finalAmount) ||
  deal.finalAmount <= 0
) {
  items.push("Final amount greater than 0 is required.");
}

    if (!Array.isArray(deal.deliverables) || deal.deliverables.length === 0) {
      items.push("At least one final deliverable is required.");
    }

    if (!deal.organizer.email) {
      items.push("Organizer email is required.");
    }

    if (!deal.sponsor.email) {
      items.push("Sponsor email is required.");
    }

    if (!deal.event.title) {
      items.push("Linked event title is required.");
    }

    if (!roleInDeal) {
      items.push("Only deal participants can manage agreement.");
    }

    return items;
  }, [deal, agreementAllowed, roleInDeal]);

  const canCreateAgreement =
    Boolean(deal) &&
    Boolean(roleInDeal) &&
    agreementAllowed &&
    missingItems.length === 0 &&
    !agreement;

  const currentVerification = useMemo(() => {
    if (!agreement || !roleInDeal) return null;

    return roleInDeal === "ORGANIZER"
      ? agreement.organizerVerification
      : agreement.sponsorVerification;
  }, [agreement, roleInDeal]);

  const hasCurrentUserVerified =
    currentVerification?.otpStatus === "VERIFIED";

  const isSigned = agreement?.status === "SIGNED";

  const nextSignerRole = useMemo(() => {
  return getNextSignerRole(agreement);
}, [agreement]);

const isCurrentUserTurnToVerify =
  Boolean(roleInDeal) && nextSignerRole === roleInDeal;

  const canUploadPaymentProof =
  Boolean(agreement) &&
  Boolean(roleInDeal) &&
  Boolean(currentUserId) &&
  agreementAllowed &&
  agreement?.status !== "CANCELLED" &&
  agreement?.status !== "EXPIRED";
  
  async function loadPage() {
    if (!dealId) {
      setPageError("Invalid deal id");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setPageError("");
      setActionError("");
      setActionSuccess("");

      const dealResponse = await fetch(`/api/deals/${dealId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const dealData: DealApiResponse = await dealResponse.json();

      if (!dealResponse.ok || !dealData.success || !dealData.deal) {
        throw new Error(dealData.message || "Failed to load deal");
      }

const normalizedDeal = normalizeDeal(dealData.deal);
setDeal(normalizedDeal);

setFinalAmountInput(
  normalizedDeal.finalAmount !== null ? String(normalizedDeal.finalAmount) : ""
);
setPaymentStatusInput(normalizedDeal.paymentStatus || "unpaid");
setMessageInput(normalizedDeal.message || "");
setNotesInput(normalizedDeal.notes || "");
setDeliverablesInput((normalizedDeal.deliverables || []).join("\n"));

      const agreementResponse = await fetch(`/api/deals/${dealId}/agreement`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const agreementData: DealAgreementResponse =
        await agreementResponse.json();

      if (agreementResponse.status === 404) {
        setAgreement(null);
        return;
      }

      if (!agreementResponse.ok || !agreementData.success) {
        throw new Error(agreementData.message || "Failed to load agreement");
      }

      setAgreement(agreementData.agreement || null);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Failed to load agreement page"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  async function handleSaveAgreementDetails() {
  if (!dealId) return;

  const deliverables = parseDeliverablesInput(deliverablesInput);

  if (!finalAmountInput.trim()) {
    setActionError("Final amount is required before creating agreement");
    setActionSuccess("");
    return;
  }

  const finalAmount = Number(finalAmountInput);

  if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
    setActionError("Final amount must be greater than 0");
    setActionSuccess("");
    return;
  }

  if (deliverables.length === 0) {
    setActionError("At least one final deliverable is required");
    setActionSuccess("");
    return;
  }

  try {
    setSavingDetails(true);
    setActionError("");
    setActionSuccess("");

    const response = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        finalAmount,
        paymentStatus: paymentStatusInput,
        message: messageInput,
        notes: notesInput,
        deliverables,
      }),
    });

    const data: DealApiResponse = await response.json();

    if (!response.ok || !data.success || !data.deal) {
      throw new Error(data.message || "Failed to save agreement details");
    }

    const normalizedDeal = normalizeDeal(data.deal);
    setDeal(normalizedDeal);

    setFinalAmountInput(
      normalizedDeal.finalAmount !== null ? String(normalizedDeal.finalAmount) : ""
    );
    setPaymentStatusInput(normalizedDeal.paymentStatus || "unpaid");
    setMessageInput(normalizedDeal.message || "");
    setNotesInput(normalizedDeal.notes || "");
    setDeliverablesInput((normalizedDeal.deliverables || []).join("\n"));

    setActionSuccess("Agreement details saved successfully");
  } catch (error) {
    setActionError(
      error instanceof Error ? error.message : "Failed to save agreement details"
    );
  } finally {
    setSavingDetails(false);
  }
}

  async function handleCreateAgreement() {
    if (!canCreateAgreement) return;

    try {
      setWorking(true);
      setActionError("");
      setActionSuccess("");

      const response = await fetch(`/api/deals/${dealId}/agreement`, {
        method: "POST",
        credentials: "include",
      });

      const data: DealAgreementResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create agreement");
      }

      setAgreement(data.agreement || null);
      setActionSuccess(data.message || "Agreement draft created successfully");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to create agreement"
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleSendOtp() {
  if (!agreement || hasCurrentUserVerified || !isCurrentUserTurnToVerify) return;

    try {
      setWorking(true);
      setActionError("");
      setActionSuccess("");

      const response = await fetch(`/api/deals/${dealId}/agreement/send-otp`, {
        method: "POST",
        credentials: "include",
      });

      const data: DealAgreementResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send OTP");
      }

      setAgreement(data.agreement || null);
      setActionSuccess(data.message || "OTP sent successfully");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to send OTP"
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleVerifyOtp() {
  if (
    !agreement ||
    otp.trim().length !== 6 ||
    hasCurrentUserVerified ||
    !isCurrentUserTurnToVerify
  ) {
    return;
  }

    try {
      setWorking(true);
      setActionError("");
      setActionSuccess("");

      const response = await fetch(`/api/deals/${dealId}/agreement/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ otp: otp.trim() }),
      });

      const data: DealAgreementResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to verify OTP");
      }

      setOtp("");
      setAgreement(data.agreement || null);
      setActionSuccess(data.message || "OTP verified successfully");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to verify OTP"
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            Loading agreement...
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
              Unable to load agreement
            </h1>
            <p className="mt-3 text-sm text-red-100/80">
              {pageError || "Deal not found"}
            </p>

            <Link
              href={`/deals/${dealId}`}
              className="mt-6 inline-flex rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-semibold text-[#020617]"
            >
              Back to Deal
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,122,24,0.14),transparent_30%),linear-gradient(180deg,#07152F_0%,#020617_100%)]">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-5">
            <Link
              href={`/deals/${deal._id}`}
              className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[#94A3B8] transition hover:border-[#FF7A18]/30 hover:text-white"
            >
              ← Back to Deal
            </Link>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 inline-flex rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-medium text-[#FFB347]">
                Sponexus Deal Agreement
              </p>

              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                Agreement Preview
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#CBD5E1] sm:text-base">
                Review final agreement details before email OTP verification and signed copy generation.
              </p>
            </div>

            <span
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${getStatusClasses(
                agreement?.status
              )}`}
            >
              {getAgreementStatusLabel(agreement?.status)}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {(actionError || actionSuccess) && (
          <div
            className={`mb-6 rounded-2xl p-4 text-sm ${
              actionError
                ? "border border-red-500/20 bg-red-500/10 text-red-200"
                : "border border-[#FF7A18]/20 bg-[#FF7A18]/10 text-[#FFB347]"
            }`}
          >
            {actionError || actionSuccess}
          </div>
        )}

        {missingItems.length > 0 && !agreement ? (
          <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <h2 className="text-lg font-semibold text-red-200">
              Agreement cannot be prepared yet
            </h2>

            <div className="mt-4 space-y-2">
              {missingItems.map((item) => (
                <p key={item} className="text-sm text-red-100/90">
                  • {item}
                </p>
              ))}
            </div>
          </div>
        ) : null}

{!agreement ? (
  <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold">Prepare Agreement Details</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Fill final amount, deliverables, payment status, and terms before creating the agreement draft.
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
          min="1"
          value={finalAmountInput}
          onChange={(event) => setFinalAmountInput(event.target.value)}
          placeholder="Enter final agreed amount"
          className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/40"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">
          Payment Status
        </label>
        <select
          value={paymentStatusInput}
          onChange={(event) => setPaymentStatusInput(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none focus:border-[#FF7A18]/40"
        >
          <option value="unpaid">Unpaid</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">
          Message
        </label>
        <textarea
          value={messageInput}
          onChange={(event) => setMessageInput(event.target.value)}
          rows={4}
          placeholder="Add agreement message or communication summary"
          className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/40"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">
          Notes / Terms
        </label>
        <textarea
          value={notesInput}
          onChange={(event) => setNotesInput(event.target.value)}
          rows={5}
          placeholder="Add final terms, conditions, or notes"
          className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/40"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">
          Final Deliverables
        </label>
        <textarea
          value={deliverablesInput}
          onChange={(event) => setDeliverablesInput(event.target.value)}
          rows={6}
          placeholder={`One deliverable per line\nLogo on stage backdrop\nInstagram story mention\nStall branding`}
          className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/40"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSaveAgreementDetails}
          disabled={savingDetails}
          className="rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-6 py-3 text-sm font-semibold text-[#020617] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingDetails ? "Saving..." : "Save Agreement Details"}
        </button>
      </div>
    </div>
  </section>
) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-[32px] border border-white/10 bg-white text-[#0F172A] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="relative overflow-hidden rounded-[32px] p-8 sm:p-10">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.035]">
                <div className="-rotate-45 text-7xl font-black tracking-[0.35em] text-[#020617]">
                  SPONEXUS
                </div>
              </div>

              <div className="relative">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-[#020617]">
                      Sponexus Deal Agreement
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Smart sponsorship agreement record
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Agreement Number
                    </p>
                    <p className="mt-1 font-bold text-[#020617]">
                      {agreement?.agreementNumber || "Not generated yet"}
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF7A18]">
                    Deal Title
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-[#020617]">
                    {deal.title || "Untitled deal"}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {deal.description || "No description added."}
                  </p>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Organizer
                    </p>
                    <p className="mt-2 font-bold text-[#020617]">
                      {deal.organizer.companyName ||
                        deal.organizer.name ||
                        "Organizer"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {deal.organizer.email || "No email"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {deal.organizer.phone || "No phone"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Sponsor
                    </p>
                    <p className="mt-2 font-bold text-[#020617]">
                      {deal.sponsor.companyName || deal.sponsor.name || "Sponsor"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {deal.sponsor.email || "No email"}
                    </p>
                    <p className="text-sm text-slate-600">
                      {deal.sponsor.phone || "No phone"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Event
                  </p>
                  <p className="mt-2 font-bold text-[#020617]">
                    {deal.event.title || "Linked event unavailable"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {deal.event.location || "No location"} •{" "}
                    {formatDateTime(deal.event.startDate)}
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Proposed Amount
                    </p>
                    <p className="mt-2 font-black text-[#020617]">
                      {formatCurrency(deal.proposedAmount)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Final Amount
                    </p>
                    <p className="mt-2 font-black text-[#020617]">
                      {formatCurrency(deal.finalAmount)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Payment Status
                    </p>
                    <p className="mt-2 font-black capitalize text-[#020617]">
                      {deal.paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="font-black text-[#020617]">Final Deliverables</h4>

                  {deal.deliverables.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {deal.deliverables.map((item, index) => (
                        <p key={`${item}-${index}`} className="text-sm text-slate-700">
                          {index + 1}. {item}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      No deliverables added.
                    </p>
                  )}
                </div>

                <div className="mt-8">
                  <h4 className="font-black text-[#020617]">Notes / Terms</h4>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {deal.notes ||
                      deal.message ||
                      "No additional terms added in deal record."}
                  </p>
                </div>

                <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm leading-6 text-slate-600">
                    This agreement is prepared using the details available in the
                    Sponexus deal record. Both parties should review all details
                    carefully before verifying through email OTP.
                  </p>
                </div>

                <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Organizer Verification
                    </p>
                    <p className="mt-2 font-bold text-[#020617]">
                      {getVerificationText(
                        agreement?.organizerVerification?.otpStatus
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDateTime(
                        agreement?.organizerVerification?.otpVerifiedAt
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Sponsor Verification
                    </p>
                    <p className="mt-2 font-bold text-[#020617]">
                      {getVerificationText(agreement?.sponsorVerification?.otpStatus)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDateTime(agreement?.sponsorVerification?.otpVerifiedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Agreement Actions</h2>

              <div className="mt-5 space-y-3">
                {!agreement ? (
                  <button
                    type="button"
                    onClick={handleCreateAgreement}
                    disabled={!canCreateAgreement || working}
                    className="w-full rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-semibold text-[#020617] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {working ? "Creating..." : "Create Final Agreement Draft"}
                  </button>
                ) : isSigned ? (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <p className="font-semibold text-emerald-300">
                      Agreement signed successfully
                    </p>
                    <p className="mt-2 text-sm text-[#CBD5E1]">
                      Signed at {formatDateTime(agreement.signedAt)}
                    </p>
                  </div>
) : hasCurrentUserVerified ? (
  <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4 text-sm text-[#94A3B8]">
    You have verified your side. Waiting for the other party.
  </div>
) : !isCurrentUserTurnToVerify ? (
  <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4 text-sm text-[#94A3B8]">
    {nextSignerRole
      ? `Waiting for ${nextSignerRole.toLowerCase()} verification first.`
      : "Agreement verification is not available right now."}
  </div>
) : (
  <>
    <button
      type="button"
      onClick={handleSendOtp}
      disabled={working || !roleInDeal}
      className="w-full rounded-full border border-[#FF7A18]/30 bg-[#FF7A18]/10 px-5 py-3 text-sm font-semibold text-[#FFB347] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {working ? "Processing..." : "Send / Resend My OTP"}
    </button>

    <div>
      <label className="mb-2 block text-sm font-medium text-white">
        Enter Email OTP
      </label>

      <input
        value={otp}
        onChange={(event) => setOtp(event.target.value)}
        maxLength={6}
        inputMode="numeric"
        placeholder="6 digit OTP"
        className="w-full rounded-2xl border border-white/10 bg-[#07152F]/80 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/40"
      />

      <button
        type="button"
        onClick={handleVerifyOtp}
        disabled={working || otp.trim().length !== 6}
        className="mt-3 w-full rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-semibold text-[#020617] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {working ? "Verifying..." : "Verify My OTP"}
      </button>
    </div>
  </>
)}

         {isSigned ? (
  <Link
    href={`/api/deals/${deal._id}/agreement/pdf`}
    target="_blank"
    className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#FF7A18]/30"
  >
    View Signed PDF
  </Link>
) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Verification Status</h2>

              <div className="mt-5 space-y-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
                  <p className="text-[#94A3B8]">Organizer</p>
                  <p className="mt-1 font-semibold text-white">
                    {getVerificationText(
                      agreement?.organizerVerification?.otpStatus
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
                  <p className="text-[#94A3B8]">Sponsor</p>
                  <p className="mt-1 font-semibold text-white">
                    {getVerificationText(agreement?.sponsorVerification?.otpStatus)}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
         {agreement ? (
          <div className="mt-6">
            <AgreementProofUpload
              dealId={deal._id}
              canUpload={canUploadPaymentProof}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}