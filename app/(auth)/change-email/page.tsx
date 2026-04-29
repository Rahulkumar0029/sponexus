"use client";

import { useState } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function ChangeEmailPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send verification email");
      } else {
        setMessage("Verification link sent to your new email");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-dark-base text-text-light">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.05] p-8">
        <h1 className="text-2xl font-bold text-white mb-6">
          Change Email
        </h1>

        {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}
        {message && <div className="mb-4 text-green-400 text-sm">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
          >
            Send Verification Link
          </Button>
        </form>
      </div>
    </div>
  );
}