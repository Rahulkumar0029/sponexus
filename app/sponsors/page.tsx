"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";

type SponsorItem = {
  _id?: string;
  userId?: string;
  brandName?: string;
  companyName?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  about?: string;
  logoUrl?: string;
  targetAudience?: string;
  preferredCategories?: string[];
  preferredLocations?: string[];
  sponsorshipInterests?: string[];
  officialEmail?: string;
  phone?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  isProfileComplete?: boolean;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type SponsorsResponse = {
  success: boolean;
  mode?: "public_preview" | "organizer_browse" | "own_profile";
  sponsors?: SponsorItem[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
  message?: string;
};

export default function SponsorsPage() {
  const router = useRouter();
  const { loading: authLoading } = useAuth();

  const [items, setItems] = useState<SponsorItem[]>([]);
  const [mode, setMode] = useState<
    "public_preview" | "organizer_browse" | "own_profile"
  >("public_preview");
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    pages: 0,
  });

  const fetchSponsors = useCallback(async () => {
    try {
      setPageLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "12");

      if (search.trim()) params.set("search", search.trim());
      if (industry.trim()) params.set("industry", industry.trim());
      if (location.trim()) params.set("location", location.trim());
      if (category.trim()) params.set("category", category.trim());

      const res = await fetch(`/api/sponsors/get?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: SponsorsResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load sponsors");
      }

      setItems(Array.isArray(data.sponsors) ? data.sponsors : []);
      setMode(data.mode || "public_preview");
      setPagination({
        total: data.pagination?.total || 0,
        page: data.pagination?.page || 1,
        limit: data.pagination?.limit || 12,
        pages: data.pagination?.pages || 0,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load sponsors");
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
  }, [page, search, industry, location, category]);

  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

 
  const isOrganizerView = mode === "organizer_browse";
  const isOwnProfileView = mode === "own_profile";

  const pageTitle = useMemo(() => {
    if (isOwnProfileView) return "My Sponsor Profile";
    if (isOrganizerView) return "Browse Sponsors";
    return "Explore Sponsors";
  }, [isOwnProfileView, isOrganizerView]);

  const pageDescription = useMemo(() => {
    if (isOwnProfileView) {
      return "Access your sponsor identity, review your profile status, and keep your brand information ready for better sponsorship opportunities.";
    }

    if (isOrganizerView) {
      return "Explore sponsor profiles to understand brand fit, audience alignment, and partnership potential for your event.";
    }

    return "See a limited preview of sponsor profiles on Sponexus. Login to unlock the full experience.";
  }, [isOwnProfileView, isOrganizerView]);

  const clearFilters = () => {
    setSearch("");
    setIndustry("");
    setLocation("");
    setCategory("");
    setPage(1);
  };

  const handleApplyFilters = () => {
    setPage(1);
    fetchSponsors();
  };

  const renderSponsorCard = (item: SponsorItem) => {
    const detailHref = item._id ? `/sponsors/${item._id}` : "/settings";

    return (
      <div
        key={item._id || item.userId}
        className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
              Sponsor
            </p>

            <h3 className="mt-2 text-xl font-semibold text-white">
              {item.brandName || item.companyName || "Unnamed Sponsor"}
            </h3>

            <p className="mt-2 text-sm text-text-muted">
              {item.companyName || "Company not added"}
              {item.industry ? ` • ${item.industry}` : ""}
            </p>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${
              item.isProfileComplete
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
            }`}
          >
            {item.isProfileComplete ? "Complete" : "Incomplete"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-text-muted">Industry</p>
            <p className="mt-1 font-semibold text-white">
              {item.industry || "Not added"}
            </p>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-text-muted">Company Size</p>
            <p className="mt-1 font-semibold text-white">
              {item.companySize || "Not added"}
            </p>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-text-muted">Audience</p>
            <p className="mt-1 font-semibold text-white">
              {item.targetAudience || "Not added"}
            </p>
          </div>

          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-text-muted">Website</p>
            <p className="mt-1 truncate font-semibold text-white">
              {item.website || "Not added"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-white/5 p-3">
          <p className="text-sm text-text-muted">About</p>
          <p className="mt-2 text-sm leading-relaxed text-white">
            {item.about || "No sponsor description added yet."}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-sm text-text-muted">Preferred Categories</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.preferredCategories?.length ? (
              item.preferredCategories.slice(0, 6).map((cat) => (
                <span
                  key={cat}
                  className="rounded-full bg-white/5 px-3 py-1 text-xs text-text-light"
                >
                  {cat}
                </span>
              ))
            ) : (
              <span className="text-sm text-text-muted">No categories added</span>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {isOwnProfileView ? (
            <>
              <Link href="/settings" className="flex-1">
                <Button variant="primary" fullWidth>
                  Edit Profile
                </Button>
              </Link>
              <Link href="/dashboard/sponsor" className="flex-1">
                <Button variant="secondary" fullWidth>
                  Back to Dashboard
                </Button>
              </Link>
            </>
          ) : isOrganizerView ? (
            <>
              <Link href={detailHref} className="flex-1">
                <Button variant="secondary" fullWidth>
                  View Profile
                </Button>
              </Link>
              <Link href="/sponsorships" className="flex-1">
                <Button variant="primary" fullWidth>
                  Browse Offers
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href={detailHref} className="flex-1">
                <Button variant="secondary" fullWidth>
                  View Preview
                </Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button variant="primary" fullWidth>
                  Login to Continue
                </Button>
              </Link>
            </>
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
              {isOwnProfileView
                ? "Sponsor Private Access"
                : isOrganizerView
                ? "Organizer Sponsor Browse"
                : "Public Sponsor Preview"}
            </p>

            <h1 className="text-4xl font-bold text-white md:text-5xl">
              {pageTitle}
            </h1>

            <p className="mt-3 max-w-3xl text-text-muted">
              {pageDescription}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {isOwnProfileView ? (
              <>
                <Link href="/settings">
                  <Button variant="primary">Edit My Profile</Button>
                </Link>
                <Link href="/dashboard/sponsor">
                  <Button variant="secondary">Back to Dashboard</Button>
                </Link>
              </>
            ) : isOrganizerView ? (
              <>
                <Link href="/sponsorships">
                  <Button variant="primary">Browse Sponsorships</Button>
                </Link>
                <Link href="/dashboard/organizer">
                  <Button variant="secondary">Back to Dashboard</Button>
                </Link>
              </>
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
              {isOwnProfileView ? "Profile Count" : "Visible Sponsors"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {pageLoading ? "..." : pagination.total}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              {isOwnProfileView
                ? "You can access only your own sponsor profile from this view."
                : "Sponsor profiles available in the current access mode."}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Access Mode</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {isOwnProfileView
                ? "Private"
                : isOrganizerView
                ? "Organizer"
                : "Preview"}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              {isOwnProfileView
                ? "Sponsors cannot browse other sponsors."
                : isOrganizerView
                ? "Organizers can evaluate sponsor fit for events."
                : "Public access is limited to preview only."}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">
              {isOrganizerView ? "Current Page" : "Search Ready"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {pageLoading ? "..." : isOrganizerView ? pagination.page : "Yes"}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              Use filters to refine sponsors by industry, location, and category fit.
            </p>
          </div>
        </div>

        {!isOwnProfileView && (
          <div className="mb-10 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Filters</h2>
              <p className="mt-2 text-sm text-text-muted">
                Refine sponsor profiles based on fit and visibility.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brand, company, industry..."
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
              />

              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Industry"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
              />

              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Preferred Location"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
              />

              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Preferred Category"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
              />

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
        )}

        {pageLoading || authLoading ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-10 text-center text-text-muted backdrop-blur-xl">
            Loading sponsors...
          </div>
        ) : error ? (
          <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
            {error}
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {items.map(renderSponsorCard)}
            </div>

            {!isOwnProfileView && (
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
            )}
          </>
        ) : isOwnProfileView ? (
          <EmptyState
            title="No sponsor profile found yet"
            description="Complete your sponsor profile from settings so your brand identity is ready for sponsorship opportunities."
            actionLabel="Complete Profile"
            onAction={() => router.push("/settings")}
          />
        ) : isOrganizerView ? (
          <EmptyState
            title="No sponsors found"
            description="Try changing your filters to discover more relevant sponsor profiles."
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        ) : (
          <EmptyState
            title="No public sponsor previews right now"
            description="Login to explore more sponsor-side information and sponsorship opportunities on Sponexus."
            actionLabel="Login"
            onAction={() => router.push("/login")}
          />
        )}
      </div>
    </div>
  );
}