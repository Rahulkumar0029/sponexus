"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/Button";

type SponsorProfile = {
  _id: string;
  userId?: string;
  brandName?: string;
  companyName?: string;
  website?: string;
  officialEmail?: string;
  phone?: string;
  industry?: string;
  companySize?: string;
  about?: string;
  logoUrl?: string;
  targetAudience?: string;
  preferredCategories?: string[];
  preferredLocations?: string[];
  sponsorshipInterests?: string[];
  isProfileComplete?: boolean;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SponsorDetailResponse = {
  success: boolean;
  sponsor?: SponsorProfile;
  data?: SponsorProfile;
  message?: string;
};

export default function SponsorDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [sponsor, setSponsor] = useState<SponsorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sponsorId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  useEffect(() => {
    const fetchSponsor = async () => {
      if (!sponsorId) return;

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/sponsors/${sponsorId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data: SponsorDetailResponse = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Sponsor not found");
        }

        setSponsor(data.sponsor || data.data || null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load sponsor";
        setError(message);
        setSponsor(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsor();
  }, [sponsorId]);

  const categories = useMemo(() => {
    return Array.isArray(sponsor?.preferredCategories)
      ? sponsor!.preferredCategories
      : [];
  }, [sponsor]);

  const locations = useMemo(() => {
    return Array.isArray(sponsor?.preferredLocations)
      ? sponsor!.preferredLocations
      : [];
  }, [sponsor]);

  const interests = useMemo(() => {
    return Array.isArray(sponsor?.sponsorshipInterests)
      ? sponsor!.sponsorshipInterests
      : [];
  }, [sponsor]);

  const contactValue = sponsor?.officialEmail || sponsor?.phone || "Not available";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading sponsor...
      </div>
    );
  }

  if (error || !sponsor) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-10 text-center">
          <h2 className="mb-4 text-2xl font-bold text-white">Sponsor Not Found</h2>
          <p className="mb-6 text-text-muted">{error || "Sponsor not found"}</p>
          <Link href="/sponsors">
            <Button>Browse Sponsors</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="mx-auto max-w-6xl space-y-10">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-text-muted hover:text-white"
          >
            ← Back
          </button>

          <h1 className="mb-2 text-4xl font-bold text-white">
            {sponsor.brandName || sponsor.companyName || "Sponsor"}
          </h1>

          <p className="text-text-muted">Sponsor Profile</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h2 className="mb-3 text-xl font-semibold text-white">About</h2>
              <p className="text-text-muted">
                {sponsor.about?.trim() || "No company description available."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h3 className="mb-3 font-semibold text-white">Preferred Categories</h3>

              {categories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="rounded-full bg-accent-orange/20 px-3 py-1 text-sm text-accent-orange"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No categories added</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h3 className="mb-3 font-semibold text-white">Target Audience</h3>
              <p className="text-text-muted">
                {sponsor.targetAudience || "Not specified"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h3 className="mb-3 font-semibold text-white">Preferred Locations</h3>
              <p className="text-text-muted">
                {locations.length > 0 ? locations.join(", ") : "Flexible"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h3 className="mb-3 font-semibold text-white">Sponsorship Interests</h3>

              {interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-white/10 px-3 py-1 text-sm text-text-light"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No interests added</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h3 className="mb-3 font-semibold text-white">Website</h3>
              {sponsor.website ? (
                <a
                  href={sponsor.website}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-accent-orange underline"
                >
                  {sponsor.website}
                </a>
              ) : (
                <p className="text-sm text-text-muted">Not provided</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <div>
                <p className="text-sm text-text-muted">Company</p>
                <p className="text-white">
                  {sponsor.companyName || sponsor.brandName || "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Industry</p>
                <p className="text-white">{sponsor.industry || "Not specified"}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Company Size</p>
                <p className="text-white">{sponsor.companySize || "Not specified"}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Joined</p>
                <p className="text-white">
                  {sponsor.createdAt
                    ? new Date(sponsor.createdAt).toLocaleDateString()
                    : "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Contact</p>
                <p className="break-all text-sm text-white">{contactValue}</p>
              </div>

              <div>
                <p className="text-sm text-text-muted">Profile Status</p>
                <p className="text-white">
                  {sponsor.isProfileComplete ? "Complete" : "Incomplete"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Partnership</h3>

              <p className="mb-4 text-sm text-text-muted">
                This sponsor is open to relevant event collaborations on Sponexus.
              </p>

              <Link href="/events">
                <Button fullWidth>Explore Events</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}