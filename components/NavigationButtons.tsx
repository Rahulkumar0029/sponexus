"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type NavigationButtonsProps = {
  className?: string;
  fallback?: string; // optional custom fallback
};

export default function NavigationButtons({
  className = "",
  fallback,
}: NavigationButtonsProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    // fallback logic
    if (fallback) {
      router.push(fallback);
      return;
    }

    if (user?.role === "SPONSOR") {
      router.push("/dashboard/sponsor");
    } else if (user?.role === "ORGANIZER") {
      router.push("/dashboard/organizer");
    } else {
      router.push("/");
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
      >
        ← Back
      </button>
    </div>
  );
}