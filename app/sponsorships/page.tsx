"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";

type SponsorshipStatus = "active" | "paused" | "closed";

type SponsorProfilePreview = {
  _id?: string;
  userId?: string;
  brandName?: string;
  companyName?: string;
  logoUrl?: string;
  website?: string;
  industry?: string;
  about?: string;
  officialEmail?: string;
  phone?: string;
  isPublic?: boolean;
  isProfileComplete?: boolean;
};

type SponsorshipItem = {
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
  status?: SponsorshipStatus;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  sponsorProfile?: SponsorProfilePreview | null;
};

type SponsorshipListResponse = {
  success: boolean;
  mode?: "public_preview" | "organizer_browse" | "own_sponsorships";
  data?: SponsorshipItem[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
  message?: string;
};

function formatCurrency(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Not specified";
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatDate(value?: string | null) {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No expiry";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusClasses(status?: SponsorshipStatus) {
  if (status === "paused") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "closed") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

export default function SponsorshipsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<SponsorshipItem[]>([]);
  const [mode, setMode] = useState<
    "public_preview" | "organizer_browse" | "own_sponsorships"
  >("public_preview");
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("active");

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    pages: 0,
  });

  const fetchSponsorships = useCallback(async () => {
    try {
      setPageLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "12");

      if (search.trim()) params.set("q", search.trim());
      if (category.trim()) params.set("category", category.trim());
      if (location.trim()) params.set("location", location.trim());

      // Keep status for logged-in flows; public preview also works with active
      if (status.trim()) params.set("status", status.trim());

      const res = await fetch(`/api/sponsorships/get?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: SponsorshipListResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load sponsorships");
      }

      setItems(Array.isArray(data.data) ? data.data : []);
      setMode(data.mode || "public_preview");
      setPagination({
        total: data.pagination?.total || 0,
        page: data.pagination?.page || 1,
        limit: data.pagination?.limit || 12,
        pages: data.pagination?.pages || 0,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load sponsorships");
      setItems([]);
      setPagination({
        total: 0,
        page: 1,
        limit: 12,
        pages: 0,
      });
    } finally {
      setPageLoading(false);
    }
  }, [page, search, category, location, status]);

  useEffect(() => {
    fetchSponsorships();
  }, [fetchSponsorships]);

  const isSponsorView = mode === "own_sponsorships";
  const isOrganizerView = mode === "organizer_browse";
  const isPublicView = mode === "public_preview";

  const pageTitle = useMemo(() => {
    if (isSponsorView) return "My Sponsorships";
    if (isOrganizerView) return "Browse Sponsorship Opportunities";
    return "Explore Sponsorship Opportunities";
  }, [isSponsorView, isOrganizerView]);

  const pageDescription = useMemo(() => {
    if (isSponsorView) {
      return "Manage your sponsorship posts, track their visibility, and create new opportunities for organizers.";
    }

    if (isOrganizerView) {
      return "Discover sponsor-side opportunities that align with your event category, audience, and location.";
    }

    return "See a limited preview of sponsor opportunities on Sponexus. Login to unlock full access.";
  }, [isSponsorView, isOrganizerView]);

  const activeCount = useMemo(
    () => items.filter((item) => item.status === "active").length,
    [items]
  );

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setLocation("");
    setStatus("active");
    setPage(1);
  };

  const handleApplyFilters = () => {
    setPage(1);
    fetchSponsorships();
  };

  const renderCard = (item: SponsorshipItem) => {
    const sponsorName =
      item.sponsorProfile?.brandName ||
      item.sponsorProfile?.companyName ||
      "Sponsor";

    const detailHref = `/sponsorships/${item._id}`;

    return (
      <div
        key={item._id}
        className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
              {item.sponsorshipType || "Sponsorship"}
            </p>

            <h3 className="mt-2 text-xl font-semibold text-white">
              {item.sponsorshipTitle || "Untitled Sponsorship"}
            </h3>

            {!isSponsorView && (
              <p className="mt-2 text-sm text-text-muted">
                By {sponsorName}
                {item.sponsorProfile?.industry
                  ? ` • ${item.sponsorProfile.industry}`
                  : ""}
              </p>
            )}
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${getStatusClasses(
              item.status
            )}`}
          >
            {item.status || "active"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-text-muted">Category</p>
            <p className="mt-1 font-semibold text-white">
              {item.category || "Not added"}
            </p>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-text-muted">Location</p>
            <p className="mt-1 font-semibold text-white">
              {item.locationPreference || item.city || "Not added"}
            </p>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-text-muted">Budget</p>
            <p className="mt-1 font-semibold text-white">
              {formatCurrency(item.budget)}
            </p>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-text-muted">Expires</p>
            <p className="mt-1 font-semibold text-white">
              {formatDate(item.expiresAt)}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          {item.campaignGoal || "No campaign goal added yet."}
        </p>

        {item.deliverablesExpected && (
          <div className="mt-4 rounded-xl bg-white/5 p-3">
            <p className="text-sm text-text-muted">Deliverables</p>
            <p className="mt-1 text-sm font-medium text-white">
              {item.deliverablesExpected}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href={detailHref} className="flex-1">
            <Button variant="secondary" fullWidth>
              View Details
            </Button>
          </Link>

          {isSponsorView ? (
            <Link href="/sponsorships/create" className="flex-1">
              <Button variant="primary" fullWidth>
                Create New
              </Button>
            </Link>
          ) : user?.role === "ORGANIZER" ? (
            <Link href={detailHref} className="flex-1">
              <Button variant="primary" fullWidth>
                Explore Fit
              </Button>
            </Link>
          ) : (
            <Link href="/login" className="flex-1">
              <Button variant="primary" fullWidth>
                Login to Continue
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="container-custom max-w-7xl">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-accent-orange" />
              {isSponsorView
                ? "Sponsor Management"
                : isOrganizerView
                ? "Sponsorship Marketplace"
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
            {isSponsorView ? (
              <>
                <Link href="/sponsorships/create">
                  <Button variant="primary">Create Sponsorship</Button>
                </Link>
                <Link href="/dashboard/sponsor">
                  <Button variant="secondary">Back to Dashboard</Button>
                </Link>
              </>
            ) : isOrganizerView ? (
              <Link href="/dashboard/organizer">
                <Button variant="secondary">Back to Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="primary">Login to Unlock Full Access</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">
              {isSponsorView ? "Total Posts" : "Visible Opportunities"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {pageLoading ? "..." : pagination.total}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              {isSponsorView
                ? "Your sponsorship posts available inside your sponsor workspace."
                : "Sponsorship opportunities currently available in this view."}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">
              {isSponsorView ? "Active Posts" : "Current Page"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {pageLoading ? "..." : isSponsorView ? activeCount : pagination.page}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              {isSponsorView
                ? "Sponsorship posts currently marked active."
                : "Your current position in the sponsorship results."}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Access Mode</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {isSponsorView
                ? "Private"
                : isOrganizerView
                ? "Organizer"
                : "Preview"}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              {isSponsorView
                ? "You can only view and manage your own sponsorship posts."
                : isOrganizerView
                ? "You are browsing sponsor opportunities as an organizer."
                : "This is a limited public preview of Sponexus."}
            </p>
          </div>
        </div>

        <div className="mb-10 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Filters</h2>
            <p className="mt-2 text-sm text-text-muted">
              Refine sponsorship opportunities based on your current need.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, goal, audience..."
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
            />

            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
            />

            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
            >
              <option value="active">Active</option>
              {isSponsorView && <option value="paused">Paused</option>}
              {isSponsorView && <option value="closed">Closed</option>}
            </select>

            <div className="flex gap-3">
              <Button variant="primary" fullWidth onClick={handleApplyFilters}>
                Apply
              </Button>
              <Button variant="secondary" fullWidth onClick={clearFilters}>
                Reset
              </Button>
            </div>
          </div>
        </div>

        {pageLoading ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-10 text-center text-text-muted backdrop-blur-xl">
            Loading sponsorships...
          </div>
        ) : error ? (
          <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
            {error}
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {items.map(renderCard)}
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl sm:flex-row">
              <p className="text-sm text-text-muted">
                Page {pagination.page} of {Math.max(pagination.pages, 1)}
              </p>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>

                <Button
                  variant="primary"
                  onClick={() =>
                    setPage((prev) =>
                      prev < pagination.pages ? prev + 1 : prev
                    )
                  }
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : isSponsorView ? (
          <EmptyState
            title="No sponsorship posts yet"
            description="Create your first sponsorship post so organizers can discover your brand opportunity on Sponexus."
            actionLabel="Create Sponsorship"
            onAction={() => router.push("/sponsorships/create")}
          />
        ) : isOrganizerView ? (
          <EmptyState
            title="No sponsorship opportunities found"
            description="Try changing your search, category, or location filters to discover more relevant sponsor opportunities."
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        ) : (
          <EmptyState
            title="No public sponsorship previews right now"
            description="Login to explore the full Sponexus marketplace experience and discover more sponsor opportunities."
            actionLabel="Login"
            onAction={() => router.push("/login")}
          />
        )}
      </div>
    </div>
  );
}