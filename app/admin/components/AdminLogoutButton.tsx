"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/logout", {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        alert(json?.message || "Failed to logout admin");
        return;
      }

      router.push("/founder-access-yr118");
      router.refresh();
    } catch {
      alert("Something went wrong while logging out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="block w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-sm text-red-200 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Logging out..." : "Logout Admin"}
    </button>
  );
}