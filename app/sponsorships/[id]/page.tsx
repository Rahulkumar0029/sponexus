"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";

type SponsorProfile = {
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
};

type SponsorshipDetail = {
  _id?: string;
  sponsorOwnerId?: string;
  sponsorProfileId?: string;
  sponsorshipTitle?: string;
  sponsorshipType?: string;
  budget?: number;
  category?: string;
  targetAudience?: string;
  city?: string;
  locationPreference?: string;
  campaignGoal?: string;
  deliverablesExpected?: string;
  customMessage?: string;
  bannerRequirement?: boolean;
  stallRequirement?: boolean;
  mikeAnnouncement?: boolean;
  socialMediaMention?: boolean;
  productDisplay?: boolean;
  contactPersonName?: string;
  contactPhone?: string;
  status?: "active" | "paused" | "closed";
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sponsorProfile?: SponsorProfile | null;
};

type SponsorshipDetailResponse = {
  success: boolean;
  mode?: "public_view" | "organizer_view" | "owner_view";
  data?: SponsorshipDetail;
  message?: string;
};

function formatCurrency(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Not specified";
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusClasses(status?: string) {
  if (status === "paused") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "closed") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

export default function SponsorshipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const sponsorshipId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"public_view" | "organizer_view" | "owner_view">(
    "public_view"
  );
  const [item, setItem] = useState<SponsorshipDetail | null>(null);

  useEffect(() => {
    const loadSponsorship = async () => {
      if (!sponsorshipId) {
        setError("Invalid sponsorship ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/sponsorships/${sponsorshipId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data: SponsorshipDetailResponse = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load sponsorship");
        }

        setItem(data.data || null);
        setMode(data.mode || "public_view");
      } catch (err: any) {
        setError(err?.message || "Failed to load sponsorship");
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    loadSponsorship();
  }, [sponsorshipId]);

  const sponsorProfile = item?.sponsorProfile || null;

  const pageTitle = useMemo(() => {
    if (mode === "owner_view") return "My Sponsorship Detail";
    if (mode === "organizer_view") return "Sponsorship Opportunity";
    return "Sponsorship Preview";
  }, [mode]);

  const pageDescription = useMemo(() => {
    if (mode === "owner_view") {
      return "Review your sponsorship post details, deliverables, and brand-side visibility requirements.";
    }

    if (mode === "organizer_view") {
      return "Evaluate this sponsor opportunity and check whether it fits your event audience, category, and location.";
    }

    return "This is a limited public sponsorship preview. Login for deeper marketplace access.";
  }, [mode]);

  const activationItems = [
    { label: "Banner Requirement", value: Boolean(item?.bannerRequirement) },
    { label: "Stall Requirement", value: Boolean(item?.stallRequirement) },
    { label: "Mike Announcement", value: Boolean(item?.mikeAnnouncement) },
    { label: "Social Media Mention", value: Boolean(item?.socialMediaMention) },
    { label: "Product Display", value: Boolean(item?.productDisplay) },
  ];

  const visibleActivationItems = activationItems.filter((entry) => entry.value);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading sponsorship details...
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
              title="Sponsorship not available"
              description={
                error ||
                "This sponsorship could not be loaded or is not available for your access level."
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
                    ? "Sponsor Management"
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
                    <Link href="/sponsorships">
                      <Button variant="secondary">My Sponsorships</Button>
                    </Link>
                    <Link href="/sponsorships/create">
                      <Button variant="primary">Create New</Button>
                    </Link>
                  </>
                ) : mode === "organizer_view" ? (
                  <>
                    <Link href="/sponsorships">
                      <Button variant="secondary">Browse More</Button>
                    </Link>
                    <Link href="/match">
                      <Button variant="primary">View Matches</Button>
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
                <p className="text-sm text-text-muted">Status</p>
                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClasses(
                      item.status
                    )}`}
                  >
                    {item.status || "active"}
                  </span>
                </div>
                <p className="mt-4 text-sm text-text-muted">
                  Current lifecycle state of this sponsorship post.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Budget</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {formatCurrency(item.budget)}
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  Brand-side budget currently attached to this sponsorship opportunity.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Expiry</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {formatDate(item.expiresAt)}
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  After this date, the sponsorship may no longer be actively considered.
                </p>
              </div>
            </div>

            <div className="mb-8 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
                  Sponsorship
                </p>
                <h2 className="mt-2 text-3xl font-bold text-white">
                  {item.sponsorshipTitle || "Untitled Sponsorship"}
                </h2>
                <p className="mt-3 text-text-muted">
                  {item.sponsorshipType || "Sponsorship"} • {item.category || "No category"} •{" "}
                  {item.locationPreference || item.city || "No location"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Category</p>
                  <p className="mt-1 font-semibold text-white">
                    {item.category || "Not added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Audience</p>
                  <p className="mt-1 font-semibold text-white">
                    {item.targetAudience || "Not added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">Location Preference</p>
                  <p className="mt-1 font-semibold text-white">
                    {item.locationPreference || "Not added"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-text-muted">City</p>
                  <p className="mt-1 font-semibold text-white">
                    {item.city || "Not added"}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white/5 p-5">
                <p className="text-sm text-text-muted">Campaign Goal</p>
                <p className="mt-2 text-base leading-relaxed text-white">
                  {item.campaignGoal || "No campaign goal added yet."}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl bg-white/5 p-5">
                  <p className="text-sm text-text-muted">Deliverables Expected</p>
                  <p className="mt-2 text-base leading-relaxed text-white">
                    {item.deliverablesExpected || "No deliverables specified yet."}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/5 p-5">
                  <p className="text-sm text-text-muted">Custom Message</p>
                  <p className="mt-2 text-base leading-relaxed text-white">
                    {item.customMessage || "No custom message added yet."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold text-white">Brand Requirements</h2>
                <p className="mt-2 text-sm text-text-muted">
                  These are the current activation requirements expected from the organizer side.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  {visibleActivationItems.length > 0 ? (
                    visibleActivationItems.map((entry) => (
                      <span
                        key={entry.label}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                      >
                        {entry.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-muted">
                      No specific activation requirements selected yet.
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-bold text-white">Contact Details</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Key contact information currently attached to this sponsorship post.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-text-muted">Contact Person</p>
                    <p className="mt-1 font-semibold text-white">
                      {item.contactPersonName || "Not added"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-text-muted">Contact Phone</p>
                    <p className="mt-1 font-semibold text-white">
                      {item.contactPhone || "Not added"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Sponsor Profile</h2>
                <p className="mt-2 text-sm text-text-muted">
                  Brand information attached to this sponsorship opportunity.
                </p>
              </div>

              {sponsorProfile ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-text-muted">Brand Name</p>
                    <p className="mt-1 font-semibold text-white">
                      {sponsorProfile.brandName || "Not added"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-text-muted">Company Name</p>
                    <p className="mt-1 font-semibold text-white">
                      {sponsorProfile.companyName || "Not added"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-text-muted">Industry</p>
                    <p className="mt-1 font-semibold text-white">
                      {sponsorProfile.industry || "Not added"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-sm text-text-muted">Website</p>
                    <p className="mt-1 break-words font-semibold text-white">
                      {sponsorProfile.website || "Not added"}
                    </p>
                  </div>

                  {(mode === "owner_view" || mode === "organizer_view") && (
                    <>
                      <div className="rounded-2xl bg-white/5 p-4">
                        <p className="text-sm text-text-muted">Official Email</p>
                        <p className="mt-1 break-words font-semibold text-white">
                          {sponsorProfile.officialEmail || "Not added"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/5 p-4">
                        <p className="text-sm text-text-muted">Phone</p>
                        <p className="mt-1 font-semibold text-white">
                          {sponsorProfile.phone || "Not added"}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="rounded-2xl bg-white/5 p-4 md:col-span-2 xl:col-span-3">
                    <p className="text-sm text-text-muted">About</p>
                    <p className="mt-2 leading-relaxed text-white">
                      {sponsorProfile.about || "No sponsor description added yet."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-text-muted">
                  Sponsor profile details are not available for this sponsorship.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}