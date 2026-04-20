"use client";

import { useState } from "react";

type AdminActionButtonProps = {
  endpoint: string;
  method?: "PATCH" | "POST" | "DELETE";
  body?: Record<string, unknown>;
  label: string;
  confirmText?: string;
  successMessage?: string;
  className?: string;
  onSuccess?: () => void;
};

export default function AdminActionButton({
  endpoint,
  method = "PATCH",
  body,
  label,
  confirmText,
  successMessage = "Action completed successfully",
  className = "",
  onSuccess,
}: AdminActionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (confirmText) {
      const confirmed = window.confirm(confirmText);
      if (!confirmed) return;
    }

    setLoading(true);

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        alert(json?.message || "Action failed");
        return;
      }

      alert(successMessage);
      onSuccess?.();
    } catch {
      alert("Something went wrong while performing this action");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? "Processing..." : label}
    </button>
  );
}