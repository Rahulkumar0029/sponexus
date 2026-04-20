"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type AdminCheckEmailResponse = {
  success: boolean;
  message?: string;
};

type AdminLoginResponse = {
  success: boolean;
  message?: string;
  requiresOtp?: boolean;
  email?: string;
};

export default function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect") || "/admin";

  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleEmailStep = async (e: React.FormEvent) => {
    e.preventDefault();

    setCheckingEmail(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/auth/check-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const json: AdminCheckEmailResponse = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Access unavailable");
        return;
      }

      setStep("password");
      setMessage("Authorized email detected. Continue securely.");
    } catch {
      setError("Access unavailable");
    } finally {
      setCheckingEmail(false);
    }
  };

  const handlePasswordStep = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoggingIn(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const json: AdminLoginResponse = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Failed to start secure login");
        return;
      }

      setMessage(json.message || "OTP sent successfully");

      router.push(
        `/founder-access-yr118/verify?email=${encodeURIComponent(
          json.email || email
        )}&redirect=${encodeURIComponent(redirect)}`
      );
    } catch {
      setError("Something went wrong while starting secure login");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.35em] text-[#94A3B8]">
          Sponexus
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Secure Founder Access</h1>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Authorized founder/admin access only.
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

      {step === "email" ? (
        <form onSubmit={handleEmailStep} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-[#94A3B8]">
              Authorized Email
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter authorized email"
              className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={checkingEmail}
            className="w-full rounded-2xl bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkingEmail ? "Checking Access..." : "Continue"}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordStep} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-[#94A3B8]">
              Authorized Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-2xl border border-white/10 bg-[#07152F]/70 px-4 py-3 text-sm text-[#94A3B8] outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-[#94A3B8]">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/50"
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setPassword("");
                setMessage("");
                setError("");
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/90"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-2xl bg-gradient-to-r from-[#FF7A18] to-[#FFB347] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingIn ? "Sending OTP..." : "Continue to OTP"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}