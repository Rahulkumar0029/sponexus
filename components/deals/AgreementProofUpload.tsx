"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProofFile = {
  label: string;
  fileUrl: string;
  fileType: string;
  cloudinaryPublicId?: string;

  transactionId?: string;
  paidAmount?: number | null;
  paymentDate?: string | null;
  paymentMode?: string;
  note?: string;

  status?: "SUBMITTED" | "VERIFIED" | "REJECTED";

  uploadedBy?: string;
  uploadedAt?: string;

  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string;
};

type ProofApiResponse = {
  success: boolean;
  message?: string;
  proofFiles?: ProofFile[];
  agreement?: {
    proofFiles?: ProofFile[];
  };
};

type AgreementProofUploadProps = {
  dealId: string;
  canUpload: boolean;
};

function formatCurrency(amount: number | null | undefined) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const APP_TIME_ZONE = "Asia/Kolkata";

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getProofStatusClasses(status?: string) {
  if (status === "VERIFIED") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "REJECTED") {
    return "border-red-400/30 bg-red-500/10 text-red-200";
  }

  return "border-[#FFB347]/30 bg-[#FFB347]/10 text-[#FFB347]";
}

function getProofStatusLabel(status?: string) {
  if (status === "VERIFIED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return "Submitted";
}

function getTodayInputDate() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: APP_TIME_ZONE,
  });
}

export function AgreementProofUpload({
  dealId,
  canUpload,
}: AgreementProofUploadProps) {
  const [proofFiles, setProofFiles] = useState<ProofFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [note, setNote] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadProofs() {
    if (!dealId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/deals/${dealId}/agreement/proofs`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: ProofApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load payment proofs");
      }

      setProofFiles(Array.isArray(data.proofFiles) ? data.proofFiles : []);
    } catch (err) {
      setProofFiles([]);
      setError(
        err instanceof Error ? err.message : "Failed to load payment proofs"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  async function handleUpload() {
    if (!canUpload) {
      setError("Payment proof upload is not available right now.");
      setSuccess("");
      return;
    }

    if (!file) {
      setError("Please select payment screenshot or receipt.");
      setSuccess("");
      return;
    }

    if (!transactionId.trim()) {
      setError("Transaction ID / UTR is required.");
      setSuccess("");
      return;
    }

    const parsedAmount = Number(paidAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Paid amount must be greater than 0.");
      setSuccess("");
      return;
    }

    if (paymentDate) {
      const selectedPaymentDate = new Date(paymentDate);
      const today = new Date(getTodayInputDate());

      if (
        Number.isNaN(selectedPaymentDate.getTime()) ||
        selectedPaymentDate.getTime() > today.getTime()
      ) {
        setError("Payment date cannot be in the future.");
        setSuccess("");
        return;
      }
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("label", "Payment Proof");
      formData.append("transactionId", transactionId.trim());
      formData.append("paidAmount", String(parsedAmount));
      formData.append("paymentDate", paymentDate);
      formData.append("paymentMode", paymentMode.trim());
      formData.append("note", note.trim());

      const response = await fetch(`/api/deals/${dealId}/agreement/proofs`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data: ProofApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to upload payment proof");
      }

      setProofFiles(
        Array.isArray(data.agreement?.proofFiles)
          ? data.agreement.proofFiles
          : []
      );

      await loadProofs();

      setFile(null);
      setTransactionId("");
      setPaidAmount("");
      setPaymentDate("");
      setPaymentMode("");
      setNote("");

      const fileInput = document.getElementById(
        "payment-proof-file"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      setSuccess(data.message || "Payment proof uploaded successfully");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload payment proof"
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <div>
        <h2 className="text-xl font-semibold">Payment Proof</h2>
        <p className="mt-2 text-sm leading-6 text-[#94A3B8]">
          Upload payment screenshot or receipt with transaction ID / UTR for record keeping.
          Once both parties verify the agreement using email OTP, this payment proof becomes mutually acknowledged.
          Sponexus admin may still audit it in dispute, fraud, or policy cases.
        </p>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-5 rounded-2xl border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-4 py-3 text-sm text-[#FFB347]">
          {success}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
        <p className="text-sm font-semibold text-white">Upload New Proof</p>

        {!canUpload ? (
          <p className="mt-3 text-sm text-[#94A3B8]">
            Proof upload is available only for valid deal participants after
            agreement creation.
          </p>
        ) : (
          <div className="mt-5 grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Payment Screenshot / Receipt
              </label>
              <input
                id="payment-proof-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] || null;
                  setFile(selectedFile);
                }}
                className="w-full rounded-2xl border border-white/10 bg-[#020617]/80 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-[#FF7A18] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#020617]"
              />
              <p className="mt-2 text-xs text-[#94A3B8]">
                Allowed: JPG, PNG, WEBP, PDF. Max size: 10MB. Do not upload OTP,
                card numbers, passwords, or private bank statements.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Transaction ID / UTR / Reference No.
              </label>
              <input
                value={transactionId}
                onChange={(event) => setTransactionId(event.target.value)}
                placeholder="Example: UTR1234567890"
                className="w-full rounded-2xl border border-white/10 bg-[#020617]/80 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/40"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Paid Amount
                </label>
                <input
                  type="number"
                  min="1"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                  placeholder="Example: 5000"
                  className="w-full rounded-2xl border border-white/10 bg-[#020617]/80 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  max={getTodayInputDate()}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#020617]/80 px-4 py-3 text-white outline-none focus:border-[#FF7A18]/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Payment Mode
              </label>
              <input
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value)}
                placeholder="UPI / Bank Transfer / Cash / Other"
                className="w-full rounded-2xl border border-white/10 bg-[#020617]/80 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Note
              </label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Optional note about this payment"
                className="w-full rounded-2xl border border-white/10 bg-[#020617]/80 px-4 py-3 text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/40"
              />
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading || !canUpload}
              className="rounded-full bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-semibold text-[#020617] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Submit Payment Proof"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold">Submitted Proofs</h3>

        {loading ? (
          <p className="mt-3 text-sm text-[#94A3B8]">Loading proofs...</p>
        ) : proofFiles.length === 0 ? (
          <p className="mt-3 text-sm text-[#94A3B8]">
            No payment proof uploaded yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {proofFiles.map((proof, index) => (
              <div
                key={`${proof.fileUrl}-${index}`}
                className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">
                      {proof.label || "Payment Proof"}
                    </p>

                    <p className="mt-1 text-sm text-[#94A3B8]">
                      Transaction ID:{" "}
                      <span className="text-white">
                        {proof.transactionId || "—"}
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-[#94A3B8]">
                      Amount:{" "}
                      <span className="text-white">
                        {formatCurrency(proof.paidAmount)}
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-[#94A3B8]">
                      Payment Date:{" "}
                      <span className="text-white">
                        {formatDate(proof.paymentDate)}
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-[#94A3B8]">
                      Mode:{" "}
                      <span className="text-white">
                        {proof.paymentMode || "—"}
                      </span>
                    </p>

                    {proof.note ? (
                      <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">
                        {proof.note}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-center text-xs font-semibold ${getProofStatusClasses(
                        proof.status
                      )}`}
                    >
                      {getProofStatusLabel(proof.status)}
                    </span>

                    <Link
                      href={proof.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-center text-xs font-semibold text-white transition hover:border-[#FF7A18]/30"
                    >
                      View File
                    </Link>
                  </div>
                </div>

                {proof.reviewNote ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-[#020617]/60 px-3 py-2 text-xs text-[#94A3B8]">
                    Review note: {proof.reviewNote}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}