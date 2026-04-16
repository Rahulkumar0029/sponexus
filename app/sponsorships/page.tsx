"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SponsorshipItem = {
  _id: string;
  sponsorshipTitle: string;
  campaignGoal: string;
  category: string;
  locationPreference: string;
  budget: number;
  status: string;

  sponsorProfile?: {
    companyName?: string;
    industry?: string;
    website?: string;
  } | null;
};

export default function SponsorshipsPage() {
  const [sponsorships, setSponsorships] = useState<SponsorshipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSponsorships();
  }, []);

  const fetchSponsorships = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/sponsorships/get");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch sponsorships");
      }

      setSponsorships(data.data || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const filtered = sponsorships.filter((item) => {
    const q = search.toLowerCase();

    return (
      item.sponsorshipTitle.toLowerCase().includes(q) ||
      item.campaignGoal.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.locationPreference.toLowerCase().includes(q) ||
      item.sponsorProfile?.companyName?.toLowerCase().includes(q)
    );
  });

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sponsorship Opportunities</h1>
            <p className="mt-2 text-sm text-gray-400">
              Browse active sponsorship posts created by real sponsors on Sponexus.
            </p>
          </div>

          <Link
            href="/sponsorships/create"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Create Sponsorship
          </Link>
        </div>

        {/* 🔍 Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search by title, category, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-800 bg-neutral-950 px-4 py-3 text-sm outline-none focus:border-white"
          />
        </div>

        {/* UI STATES */}
        {loading ? (
          <div className="text-gray-400">Loading sponsorships...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-neutral-950 p-8 text-gray-400">
            No sponsorship posts found.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <Link
                key={item._id}
                href={`/sponsorships/${item._id}`}
                className="rounded-2xl border border-gray-800 bg-neutral-950 p-5 transition hover:border-white/40"
              >
                {/* Header */}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">
                    {item.sponsorshipTitle}
                  </h2>

                  <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs text-green-300">
                    {item.status}
                  </span>
                </div>

                {/* Description */}
                <p className="line-clamp-3 text-sm text-gray-400">
                  {item.campaignGoal}
                </p>

                {/* Category */}
                <div className="mt-4">
                  <span className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-300">
                    {item.category}
                  </span>
                </div>

                {/* Info */}
                <div className="mt-5 space-y-2 text-sm text-gray-300">
                  <p>
                    <span className="text-gray-500">Company:</span>{" "}
                    {item.sponsorProfile?.companyName || "N/A"}
                  </p>

                  <p>
                    <span className="text-gray-500">Location:</span>{" "}
                    {item.locationPreference || "Flexible"}
                  </p>

                  <p>
                    <span className="text-gray-500">Budget:</span> ₹{item.budget}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}