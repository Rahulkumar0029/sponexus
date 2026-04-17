"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";

type SponsorDetail = {
  _id?: string;
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
  instagramUrl?: string;
  linkedinUrl?: string;
  isProfileComplete?: boolean;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SponsorDetailResponse = {
  success: boolean;
  mode?: "public_view" | "organizer_view" | "owner_view";
  data?: SponsorDetail;
  message?: string;
};

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

export default function SponsorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const sponsorId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"public_view" | "organizer_view" | "owner_view">(
    "public_view"
  );
  const [item, setItem] = useState<SponsorDetail | null>(null);

  useEffect(() => {
    const loadSponsor = async () => {
      if (!sponsorId) {
        setError("Invalid sponsor ID");
        setLoading(false);
        return;
      }

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
          throw new Error(data.message || "Failed to load sponsor profile");
        }

        setItem(data.data || null);
        setMode(data.mode || "public_view");
      } catch (err: any) {
        setError(err?.message || "Failed to load sponsor profile");
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    loadSponsor();
  }, [sponsorId]);

  const pageTitle = useMemo(() => {
    if (mode === "owner_view") return "My Sponsor Profile";
    if (mode === "organizer_view") return "Sponsor Profile";
    return "Sponsor Preview";
  }, [mode]);

  const pageDescription = useMemo(() => {
    if (mode === "owner_view") {
      return "Review your sponsor identity, trust signals, and matching preferences from your private sponsor profile view.";
    }

    if (mode === "organizer_view") {
      return "Understand this sponsor’s brand profile, audience preferences, and partnership fit for your event.";
    }

    return "This is a limited public preview of a sponsor profile on Sponexus.";
  }, [mode]);

  const websiteUrl = normalizeUrl(item?.website);
  const linkedinUrl = normalizeUrl(item?.linkedinUrl);
  const instagramUrl = normalizeUrl(item?.instagramUrl);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading sponsor profile...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="container-custom max-w-6xl">
        {error || !item ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <EmptyState
              title="Sponsor profile not available"
              description={
                error ||
                "This sponsor profile could not be loaded or is not available for your access level."
              }
              actionLabel={user ? "Go Back" : "Login"}
              onAction={() => {
                if (user) {
                  router.back();
                } else {
                  router.push("/login");
                }
              }}
            />
          </div>
        ) : (
          <>
            <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-accent-orange" />
                  {mode === "owner_view"
                    ? "Sponsor Private Access"
                    : mode === "organizer_view"
                    ? "Organizer Access"
                    : "Public Preview"}
                </p>

                <h1 className="text-4xl font-bold text-white md:text-5xl">
                  {pageTitle}
                </h1>

                <p className="mt-3 max-w-3xl text-text-muted">
                  {pageDescription}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {mode === "owner_view" ? (
                  <>
                    <Link href="/settings">
                      <Button variant="primary">Edit Profile</Button>
                    </Link>
                    <Link href="/dashboard/sponsor">
                      <Button variant="secondary">Back to Dashboard</Button>
                    </Link>
                  </>
                ) : mode === "organizer_view" ? (
                  <>
                    <Link href="/sponsorships">
                      <Button variant="primary">Browse Sponsorships</Button>
                    </Link>
                    <Link href="/sponsors">
                      <Button variant="secondary">Browse Sponsors</Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/login">
                    <Button variant="primary">Login to Continue</Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Brand Name</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {item.brandName || "Not added"}
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  Public-facing sponsor identity used across the platform.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Industry</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {item.industry || "Not added"}
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  Helps evaluate brand-event alignment and market relevance.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Profile Status</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {item.isProfileComplete ? "Complete" : "Incomplete"}
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  Indicates whether the sponsor profile is ready for stronger matching.
                </p>
              </div>
            </div>

            <div className="mb-8 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  Sponsor Identity
                </p>
                <h2 className="mt-2 text-3xl font-bold text-white">
                  {item.brandName || item.companyName || "Unnamed Sponsor"}
                </h2>
                <p className="mt-3 text-text-muted">
                  {item.companyName || "Company not added"}
                  {item.industry ? ` • ${item.industry}` : ""}
                  {item.companySize ? ` • ${item.companySize}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Company Name</p>
                  <p className="mt-1 font-semibold text-white">
                    {item.companyName || "Not added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Industry</p>
                  <p className="mt-1 font-semibold text-white">
                    {item.industry || "Not added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Company Size</p>
                  <p className="mt-1 font-semibold text-white">
                    {item.companySize || "Not added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Audience Focus</p>
                  <p className="mt-1 font-semibold text-white">
                    {item.targetAudience || "Not added"}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white/5 p-5">
                <p className="text-sm text-text-muted">About</p>
                <p className="mt-2 text-base leading-relaxed text-white">
                  {item.about || "No sponsor description added yet."}
                </p>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold text-white">Preferred Categories</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Event categories this sponsor is generally interested in.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {item.preferredCategories?.length ? (
                    item.preferredCategories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                      >
                        {category}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-muted">
                      No preferred categories added yet.
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold text-white">Preferred Locations</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Locations this sponsor prefers for event partnerships.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {item.preferredLocations?.length ? (
                    item.preferredLocations.map((location) => (
                      <span
                        key={location}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                      >
                        {location}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-muted">
                      No preferred locations added yet.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-8 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <h2 className="text-2xl font-bold text-white">Sponsorship Interests</h2>
              <p className="mt-2 text-sm text-text-muted">
                The types of sponsorship involvement this brand is interested in.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {item.sponsorshipInterests?.length ? (
                  item.sponsorshipInterests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                    >
                      {interest}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-text-muted">
                    No sponsorship interests added yet.
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Contact & Trust Signals</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Availability of contact and online presence depends on your access level.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Website</p>
                  <p className="mt-1 break-words font-semibold text-white">
                    {item.website || "Not added"}
                  </p>

                  {websiteUrl ? (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-accent-orange hover:underline"
                    >
                      Open Website
                    </a>
                  ) : null}
                </div>

                {(mode === "owner_view" || mode === "organizer_view") && (
                  <>
                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-sm text-text-muted">Official Email</p>
                      <p className="mt-1 break-words font-semibold text-white">
                        {item.officialEmail || "Not added"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-4">
                      <p className="text-sm text-text-muted">Phone</p>
                      <p className="mt-1 font-semibold text-white">
                        {item.phone || "Not added"}
                      </p>
                    </div>
                  </>
                )}

                {item.linkedinUrl ? (
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-text-muted">LinkedIn</p>
                    <p className="mt-1 break-words font-semibold text-white">
                      {item.linkedinUrl}
                    </p>
                    <a
                      href={linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-accent-orange hover:underline"
                    >
                      Open LinkedIn
                    </a>
                  </div>
                ) : null}

                {item.instagramUrl ? (
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-text-muted">Instagram</p>
                    <p className="mt-1 break-words font-semibold text-white">
                      {item.instagramUrl}
                    </p>
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-accent-orange hover:underline"
                    >
                      Open Instagram
                    </a>
                  </div>
                ) : null}

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Created On</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatDate(item.createdAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Last Updated</p>
                  <p className="mt-1 font-semibold text-white">
                    {formatDate(item.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}