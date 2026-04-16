"use client";

import { useEffect, useState } from "react";

type SponsorshipDetails = {
  _id: string;
  sponsorshipTitle: string;
  campaignGoal: string;
  category: string;
  locationPreference: string;
  budget: number;
  deliverablesExpected: string;
  customMessage?: string;
  status: string;

  sponsorProfile?: {
    companyName?: string;
    website?: string;
    industry?: string;
    about?: string;
  } | null;
};

export default function SponsorshipDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [sponsorship, setSponsorship] = useState<SponsorshipDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const id = params.id;

  useEffect(() => {
    const fetchSponsorship = async () => {
      try {
        setLoading(true);

        const res = await fetch(`/api/sponsorships/${id}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch sponsorship");
        }

        setSponsorship(data.data);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchSponsorship();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl text-gray-400">
          Loading sponsorship...
        </div>
      </main>
    );
  }

  if (error || !sponsorship) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-4xl rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          {error || "Sponsorship not found"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-gray-800 bg-neutral-950 p-8">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                {sponsorship.sponsorshipTitle}
              </h1>

              <p className="mt-3 text-sm text-gray-400">
                Posted by{" "}
                {sponsorship.sponsorProfile?.companyName || "Sponsor"}
              </p>
            </div>

            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300">
              {sponsorship.status}
            </span>
          </div>

          {/* Campaign Goal */}
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">Campaign Goal</h2>
            <p className="leading-7 text-gray-300">
              {sponsorship.campaignGoal}
            </p>
          </div>

          {/* Details */}
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-800 p-5">
              <h3 className="mb-3 text-lg font-semibold">
                Sponsorship Details
              </h3>

              <div className="space-y-2 text-sm text-gray-300">
                <p>
                  <span className="text-gray-500">Category:</span>{" "}
                  {sponsorship.category}
                </p>

                <p>
                  <span className="text-gray-500">Location:</span>{" "}
                  {sponsorship.locationPreference || "Flexible"}
                </p>

                <p>
                  <span className="text-gray-500">Budget:</span> ₹
                  {sponsorship.budget}
                </p>
              </div>
            </div>

            {/* Sponsor */}
            <div className="rounded-xl border border-gray-800 p-5">
              <h3 className="mb-3 text-lg font-semibold">Sponsor Profile</h3>

              <div className="space-y-2 text-sm text-gray-300">
                <p>
                  <span className="text-gray-500">Company:</span>{" "}
                  {sponsorship.sponsorProfile?.companyName || "N/A"}
                </p>

                <p>
                  <span className="text-gray-500">Industry:</span>{" "}
                  {sponsorship.sponsorProfile?.industry || "N/A"}
                </p>

                <p>
                  <span className="text-gray-500">Website:</span>{" "}
                  {sponsorship.sponsorProfile?.website || "N/A"}
                </p>

                <p>
                  <span className="text-gray-500">About:</span>{" "}
                  {sponsorship.sponsorProfile?.about || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Deliverables */}
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">
              Expected Deliverables
            </h2>

            {sponsorship.deliverablesExpected ? (
              <p className="text-sm text-gray-300">
                {sponsorship.deliverablesExpected}
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                No deliverables mentioned.
              </p>
            )}
          </div>

          {/* CTA */}
          <button className="rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:opacity-90">
            Initiate Deal
          </button>
        </div>
      </div>
    </main>
  );
}