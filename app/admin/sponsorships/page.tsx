"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminActionButton from "@/app/admin/components/AdminActionButton";

type AdminSponsorship = {
  _id: string;
  sponsorshipTitle: string;
  sponsorOwnerId: string;
  status: string;
  visibilityStatus: string;
  moderationStatus: string;
  category: string;
  city: string;
  locationPreference: string;
  budget: number;
  contactPersonName: string;
  contactPhone: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type SponsorshipsResponse = {
  success: boolean;
  sponsorships?: AdminSponsorship[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

export default function AdminSponsorshipsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [visibilityStatus, setVisibilityStatus] = useState("");
  const [data, setData] = useState<SponsorshipsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (visibilityStatus) params.set("visibilityStatus", visibilityStatus);
    params.set("page", "1");
    params.set("limit", "20");
    return params.toString();
  }, [query, status, visibilityStatus]);

  const loadSponsorships = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sponsorships?${searchParams}`, {
        cache: "no-store",
        signal,
      });
      const json = await res.json();
      setData(json);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setData({
          success: false,
          message: "Failed to load sponsorships",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadSponsorships(controller.signal);
    return () => controller.abort();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">
          Sponsorship Moderation
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Admin Sponsorships</h2>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Review sponsor offers, visibility state, and quick moderation actions.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, category, city..."
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/50"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A18]/50"
          >
            <option value="">All Lifecycle</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={visibilityStatus}
            onChange={(e) => setVisibilityStatus(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A18]/50"
          >
            <option value="">All Visibility</option>
            <option value="VISIBLE">Visible</option>
            <option value="HIDDEN">Hidden</option>
            <option value="UNDER_REVIEW">Under Review</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          Loading sponsorships...
        </div>
      ) : !data?.success ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          {data?.message || "Unable to load sponsorships"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-[#94A3B8]">
                <tr>
                  <th className="px-4 py-4 font-medium">Sponsorship</th>
                  <th className="px-4 py-4 font-medium">Lifecycle</th>
                  <th className="px-4 py-4 font-medium">Visibility</th>
                  <th className="px-4 py-4 font-medium">Budget</th>
                  <th className="px-4 py-4 font-medium">Location</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.sponsorships || []).map((item) => (
                  <tr key={item._id} className="border-t border-white/10 align-top">
                    <td className="px-4 py-4">
                      <Link href={`/admin/sponsorships/${item._id}`} className="block">
                        <div className="font-medium text-white hover:text-[#FFB347]">
                          {item.sponsorshipTitle}
                        </div>
                        <div className="mt-1 text-xs text-[#94A3B8]">{item.category}</div>
                        <div className="mt-1 text-xs text-[#94A3B8]">
                          {item.contactPersonName || "No contact name"} • {item.contactPhone || "No phone"}
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-white/90">{item.status}</div>
                      <div className="mt-1 text-xs text-[#94A3B8]">{item.moderationStatus}</div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/90">
                        {item.visibilityStatus}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-white/90">
                      ₹{Number(item.budget || 0).toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-4 text-white/90">
                      <div>{item.city || "No city"}</div>
                      <div className="mt-1 text-xs text-[#94A3B8]">
                        {item.locationPreference || "No preference"}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.visibilityStatus !== "HIDDEN" ? (
                          <AdminActionButton
                            endpoint={`/api/admin/sponsorships/${item._id}/hide`}
                            body={{ reason: "Hidden from sponsorships list", moderationStatus: "FLAGGED" }}
                            label="Hide"
                            confirmText="Hide this sponsorship?"
                            successMessage="Sponsorship hidden"
                            className="border-red-500/20 bg-red-500/10 text-red-200"
                            onSuccess={() => loadSponsorships()}
                          />
                        ) : (
                          <AdminActionButton
                            endpoint={`/api/admin/sponsorships/${item._id}/restore`}
                            body={{ reason: "Restored from sponsorships list" }}
                            label="Restore"
                            confirmText="Restore this sponsorship?"
                            successMessage="Sponsorship restored"
                            onSuccess={() => loadSponsorships()}
                          />
                        )}

                        <Link
                          href={`/admin/sponsorships/${item._id}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/10"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 px-4 py-4 text-sm text-[#94A3B8]">
            Total sponsorships: {data.pagination?.total ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}