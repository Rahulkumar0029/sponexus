"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { DealStatus } from "@/types/deal";
import type { DealAgreement, DealAgreementResponse } from "@/types/deal-agreement";

type DealAgreementPanelProps = {
  dealId: string;
  dealStatus: DealStatus;
  currentUserId: string;
  roleInDeal: "ORGANIZER" | "SPONSOR" | null;
};

const APP_TIME_ZONE = "Asia/Kolkata";

function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

function getAgreementStatusLabel(status?: string) {
  switch (status) {
    case "SIGNED":
      return "Signed";
    case "PENDING_ORGANIZER_OTP":
      return "Waiting for Organizer";
    case "PENDING_SPONSOR_OTP":
      return "Waiting for Sponsor";
    case "PENDING_BOTH_OTP":
      return "Waiting for Verification";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    case "DRAFT":
      return "Draft";
    default:
      return "Not Created";
  }
}

function getAgreementStatusClasses(status?: string) {
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

function canUseAgreement(dealStatus: DealStatus) {
  return dealStatus === "accepted" || dealStatus === "completed";
}

function getAgreementActionLabel(agreement: DealAgreement | null) {
  if (!agreement) return "Prepare Agreement";

  if (agreement.status === "SIGNED") return "Review Agreement Record";

  if (agreement.status === "CANCELLED") return "View Cancelled Agreement";

  if (agreement.status === "EXPIRED") return "View Expired Agreement";

  return "Open Agreement";
}

export function DealAgreementPanel({
  dealId,
  dealStatus,
  currentUserId,
  roleInDeal,
}: DealAgreementPanelProps) {
  const [agreement, setAgreement] = useState<DealAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const agreementAllowed = canUseAgreement(dealStatus);
  const isSigned = agreement?.status === "SIGNED";

  async function loadAgreement() {
    if (!dealId || !agreementAllowed) {
      setAgreement(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/deals/${dealId}/agreement`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: DealAgreementResponse = await response.json();

      if (response.status === 404) {
        setAgreement(null);
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load agreement");
      }

      setAgreement(data.agreement || null);
    } catch (err) {
      setAgreement(null);
      setError(err instanceof Error ? err.message : "Failed to load agreement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgreement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, agreementAllowed]);

  if (!agreementAllowed) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold">Deal Agreement</h2>
        <p className="mt-3 text-sm leading-6 text-[#94A3B8]">
          Agreement can be prepared after this deal is accepted.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold">Deal Agreement</h2>
        <p className="mt-3 text-sm text-[#94A3B8]">Checking agreement status...</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Deal Agreement</h2>
          <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
            Prepare, preview, verify, and access the final signed agreement.
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getAgreementStatusClasses(
            agreement?.status
          )}`}
        >
          {getAgreementStatusLabel(agreement?.status)}
        </span>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#94A3B8]">Agreement No.</span>
            <span className="max-w-[60%] truncate text-right font-semibold text-white">
              {agreement?.agreementNumber || "Not created"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[#94A3B8]">Signed At</span>
            <span className="text-right font-semibold text-white">
              {formatDateTime(agreement?.signedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[#94A3B8]">PDF Generated At</span>
            <span className="text-right font-semibold text-white">
              {formatDateTime(agreement?.pdfGeneratedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[#94A3B8]">Your Access</span>
            <span className="text-right font-semibold text-white">
              {roleInDeal ? roleInDeal.toLowerCase() : "viewer"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
       {currentUserId && roleInDeal ? (
  <Link
    href={`/deals/${dealId}/agreement`}
    className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-semibold text-[#020617] transition hover:opacity-95"
  >
    {getAgreementActionLabel(agreement)}
  </Link>
) : (
  <div className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-[#94A3B8]">
    Login Required
  </div>
)}

       {isSigned ? (
  <Link
    href={`/api/deals/${dealId}/agreement/pdf`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-[#FF7A18]/30"
  >
    View Final Signed PDF
  </Link>
) : null}
      </div>

      {!currentUserId || !roleInDeal ? (
        <p className="mt-4 text-xs text-[#94A3B8]">
          Login as a deal participant to manage this agreement.
        </p>
      ) : null}
    </section>
  );
}