"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminActionButton from "@/app/admin/components/AdminActionButton";

type AdminDeal = {
  _id: string;
  title: string;
  organizerId: string;
  sponsorId: string;
  eventId: string;
  status: string;
  paymentStatus: string;
  isFrozen: boolean;
  adminReviewStatus: string;
  proposedAmount: number;
  finalAmount?: number | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type DealsResponse = {
  success: boolean;
  deals?: AdminDeal[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

export default function AdminDealsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [frozen, setFrozen] = useState("");
  const [data, setData] = useState<DealsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    if (frozen) params.set("frozen", frozen);
    params.set("page", "1");
    params.set("limit", "20");
    return params.toString();
  }, [query, status, frozen]);

  const loadDeals = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/deals?${searchParams}`, {
        cache: "no-store",
        signal,
      });
      const json = await res.json();
      setData(json);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setData({
          success: false,
          message: "Failed to load deals",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadDeals(controller.signal);
    return () => controller.abort();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">
          Deal Oversight
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Admin Deals</h2>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Monitor negotiations, frozen deals, disputes, and quick admin actions.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, notes, dispute..."
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/50"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A18]/50"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="negotiating">Negotiating</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="disputed">Disputed</option>
          </select>

          <select
            value={frozen}
            onChange={(e) => setFrozen(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A18]/50"
          >
            <option value="">All Freeze States</option>
            <option value="true">Frozen</option>
            <option value="false">Not Frozen</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          Loading deals...
        </div>
      ) : !data?.success ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          {data?.message || "Unable to load deals"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-[#94A3B8]">
                <tr>
                  <th className="px-4 py-4 font-medium">Deal</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Payment</th>
                  <th className="px-4 py-4 font-medium">Review</th>
                  <th className="px-4 py-4 font-medium">Amounts</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.deals || []).map((deal) => (
                  <tr key={deal._id} className="border-t border-white/10 align-top">
                    <td className="px-4 py-4">
                      <Link href={`/admin/deals/${deal._id}`} className="block">
                        <div className="font-medium text-white hover:text-[#FFB347]">
                          {deal.title || "Untitled deal"}
                        </div>
                        <div className="mt-1 text-xs text-[#94A3B8]">
                          Created {new Date(deal.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-4 text-white/90">{deal.status}</td>

                    <td className="px-4 py-4 text-white/90">{deal.paymentStatus}</td>

                    <td className="px-4 py-4">
                      <div className="rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs text-[#FFB347] inline-block">
                        {deal.adminReviewStatus}
                      </div>
                      <div className="mt-1 text-xs text-[#94A3B8]">
                        {deal.isFrozen ? "Frozen" : "Not frozen"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-white/90">
                      <div>
                        Proposed: ₹{Number(deal.proposedAmount || 0).toLocaleString("en-IN")}
                      </div>
                      <div className="mt-1 text-xs text-[#94A3B8]">
                        Final: ₹{Number(deal.finalAmount || 0).toLocaleString("en-IN")}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {!deal.isFrozen ? (
                          <AdminActionButton
                            endpoint={`/api/admin/deals/${deal._id}/freeze`}
                            body={{ reason: "Frozen from deals list" }}
                            label="Freeze"
                            confirmText="Freeze this deal?"
                            successMessage="Deal frozen"
                            className="border-red-500/20 bg-red-500/10 text-red-200"
                            onSuccess={() => loadDeals()}
                          />
                        ) : (
                          <AdminActionButton
                            endpoint={`/api/admin/deals/${deal._id}/resolve`}
                            body={{
                              reason: "Resolved from deals list",
                              internalNotes: "Resolved from admin deals list",
                              keepFrozen: false,
                            }}
                            label="Resolve"
                            confirmText="Resolve this deal?"
                            successMessage="Deal resolved"
                            onSuccess={() => loadDeals()}
                          />
                        )}

                        <Link
                          href={`/admin/deals/${deal._id}`}
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
            Total deals: {data.pagination?.total ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}