"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resendEmail, setResendEmail] = useState(email);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;

      setVerifying(true);
      setError("");
      setMessage("");

      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Email verification failed.");
          return;
        }

        setMessage("Email verified successfully. Redirecting to login...");

        setTimeout(() => {
          router.push("/login");
        }, 1800);
      } catch {
        setError("Something went wrong while verifying your email.");
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, router]);

  const handleResend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = resendEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to resend verification email.");
        return;
      }

      setMessage(
        "If this email exists and is not verified, a new verification email has been sent."
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#020617_0%,#07152f_45%,#020617_100%)]" />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-12 top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-12 top-1/3 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-8 shadow-[0_0_50px_rgba(245,158,11,0.08)] backdrop-blur-xl sm:p-10">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Verify Email</h1>
            <p className="mt-2 text-sm text-text-muted">
              {token
                ? "We are verifying your email now."
                : "Check your inbox for a verification link or resend it below."}
            </p>
          </div>

          {(verifying || loading) && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
              {verifying ? "Verifying your email..." : "Sending verification email..."}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-xl border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
              {message}
            </div>
          )}

          {!token && (
            <form onSubmit={handleResend} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
              >
                {loading ? "Sending..." : "Resend Verification Email"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-text-muted">
            Back to{" "}
            <Link
              href="/login"
              className="text-accent-orange transition hover:text-yellow-400"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-dark-base px-4 text-text-light">
          Loading verification page...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}