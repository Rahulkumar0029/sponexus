"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AdminVerifyResponse = {
  success: boolean;
  message?: string;
  admin?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    adminRole: string;
    permissions: string[];
  };
};

export default function AdminVerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") || "";
  const redirect = searchParams.get("redirect") || "/admin";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const maskedEmail = useMemo(() => {
    if (!email.includes("@")) return email;
    const [name, domain] = email.split("@");
    if (name.length <= 2) return `${name[0] || ""}***@${domain}`;
    return `${name.slice(0, 2)}***@${domain}`;
  }, [email]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
        }),
      });

      const json: AdminVerifyResponse = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to verify OTP");
        return;
      }

      setMessage(json.message || "Admin login successful");
      router.push(redirect);
    } catch {
      setError("Something went wrong while verifying OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">
          Sponexus
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Verify Founder OTP</h1>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Enter the 6-digit code sent to {maskedEmail || "your email"}.
        </p>
      </div>

      {message ? (
        <div className="mb-4 rounded-2xl border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-4 py-3 text-sm text-[#FFB347]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-[#94A3B8]">
            OTP Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="Enter 6-digit OTP"
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-center text-lg tracking-[0.45em] text-white outline-none placeholder:tracking-normal placeholder:text-[#94A3B8] focus:border-[#FF7A18]/50"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-2xl bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Verify and Enter Admin Panel"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => router.push("/founder-access-yr118")}
        className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/90"
      >
        Back to Secure Access
      </button>
    </div>
  );
}