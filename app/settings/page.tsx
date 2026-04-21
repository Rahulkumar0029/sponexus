"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { EventDeliverable } from "@/types/event";

type CurrentUser = {
  _id?: string;
  id?: string;
  role?: "ORGANIZER" | "SPONSOR";
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  bio?: string;
};

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
  sponsorshipInterests?: EventDeliverable[];
  instagramUrl?: string;
  linkedinUrl?: string;
  isProfileComplete?: boolean;
  isPublic?: boolean;
};

type SettingsMeResponse = {
  success: boolean;
  user?: CurrentUser;
  sponsorProfile?: SponsorProfile | null;
  message?: string;
};

type SponsorFormState = {
  brandName: string;
  companyName: string;
  website: string;
  officialEmail: string;
  phone: string;
  industry: string;
  companySize: string;
  about: string;
  logoUrl: string;
  targetAudience: string;
  preferredCategories: string;
  preferredLocations: string;
  sponsorshipInterests: EventDeliverable[];
  instagramUrl: string;
  linkedinUrl: string;
  isPublic: boolean;
};

const DELIVERABLE_OPTIONS: { value: EventDeliverable; label: string }[] = [
  { value: "STAGE_BRANDING", label: "Stage Branding" },
  { value: "STALL_SPACE", label: "Stall Space" },
  { value: "SOCIAL_MEDIA_PROMOTION", label: "Social Media Promotion" },
  { value: "PRODUCT_DISPLAY", label: "Product Display" },
  { value: "ANNOUNCEMENTS", label: "Announcements / Stage Mentions" },
  { value: "EMAIL_PROMOTION", label: "Email Promotion" },
  { value: "TITLE_SPONSORSHIP", label: "Title Sponsorship" },
  { value: "CO_BRANDING", label: "Co-Branding" },
];

const initialSponsorForm: SponsorFormState = {
  brandName: "",
  companyName: "",
  website: "",
  officialEmail: "",
  phone: "",
  industry: "",
  companySize: "",
  about: "",
  logoUrl: "",
  targetAudience: "",
  preferredCategories: "",
  preferredLocations: "",
  sponsorshipInterests: [],
  instagramUrl: "",
  linkedinUrl: "",
  isPublic: true,
};

function toCommaSeparated(value?: string[]) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function parseCommaSeparated(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(null);

  const [sponsorForm, setSponsorForm] = useState<SponsorFormState>(initialSponsorForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login?redirect=/settings");
      return;
    }

    if (user.role !== "ORGANIZER" && user.role !== "SPONSOR") {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    let isMounted = true;

    const loadSettings = async () => {
      try {
        setPageLoading(true);
        setPageError("");
        setSaveError("");
        setSaveSuccess("");

        const res = await fetch("/api/settings/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        const data: SettingsMeResponse = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Unable to load settings");
        }

        if (!isMounted) return;

        const loadedUser = data.user || null;
        const loadedSponsorProfile = data.sponsorProfile || null;

        setCurrentUser(loadedUser);
        setSponsorProfile(loadedSponsorProfile);

        const resolvedRole = loadedUser?.role || user?.role;

        if (resolvedRole === "SPONSOR") {
          setSponsorForm({
            brandName: loadedSponsorProfile?.brandName || "",
            companyName:
              loadedSponsorProfile?.companyName ||
              loadedUser?.companyName ||
              "",
            website: loadedSponsorProfile?.website || "",
            officialEmail:
              loadedSponsorProfile?.officialEmail || loadedUser?.email || "",
            phone: loadedSponsorProfile?.phone || loadedUser?.phone || "",
            industry: loadedSponsorProfile?.industry || "",
            companySize: loadedSponsorProfile?.companySize || "",
            about: loadedSponsorProfile?.about || loadedUser?.bio || "",
            logoUrl: loadedSponsorProfile?.logoUrl || "",
            targetAudience: loadedSponsorProfile?.targetAudience || "",
            preferredCategories: toCommaSeparated(
              loadedSponsorProfile?.preferredCategories
            ),
            preferredLocations: toCommaSeparated(
              loadedSponsorProfile?.preferredLocations
            ),
            sponsorshipInterests: Array.isArray(
              loadedSponsorProfile?.sponsorshipInterests
            )
              ? loadedSponsorProfile.sponsorshipInterests
              : [],
            instagramUrl: loadedSponsorProfile?.instagramUrl || "",
            linkedinUrl: loadedSponsorProfile?.linkedinUrl || "",
            isPublic:
              typeof loadedSponsorProfile?.isPublic === "boolean"
                ? loadedSponsorProfile.isPublic
                : true,
          });
        } else {
          setSponsorForm(initialSponsorForm);
        }
      } catch (err: any) {
        if (!isMounted || err?.name === "AbortError") return;

        setPageError(err?.message || "Unable to load settings");
        setCurrentUser(null);
        setSponsorProfile(null);
      } finally {
        if (isMounted) {
          setPageLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [user]);

  const role = currentUser?.role || user?.role;

  const sponsorCompletion = useMemo(() => {
    if (role !== "SPONSOR") return 0;

    let score = 20;

    if (sponsorForm.brandName.trim()) score += 15;
    if (sponsorForm.companyName.trim()) score += 10;
    if (sponsorForm.officialEmail.trim()) score += 10;
    if (sponsorForm.phone.trim()) score += 10;
    if (sponsorForm.industry.trim()) score += 15;
    if (sponsorForm.targetAudience.trim()) score += 10;
    if (parseCommaSeparated(sponsorForm.preferredCategories).length) score += 10;
    if (parseCommaSeparated(sponsorForm.preferredLocations).length) score += 10;

    return Math.min(score, 100);
  }, [role, sponsorForm]);

  const isSponsorProfileReady = useMemo(() => {
    return Boolean(sponsorProfile?.isProfileComplete) || sponsorCompletion >= 80;
  }, [sponsorProfile, sponsorCompletion]);

  const handleSponsorChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    setSaveError("");
    setSaveSuccess("");

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setSponsorForm((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    setSponsorForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleInterest = (value: EventDeliverable) => {
    setSaveError("");
    setSaveSuccess("");

    setSponsorForm((prev) => ({
      ...prev,
      sponsorshipInterests: prev.sponsorshipInterests.includes(value)
        ? prev.sponsorshipInterests.filter((item) => item !== value)
        : [...prev.sponsorshipInterests, value],
    }));
  };

  const handleSponsorSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (role !== "SPONSOR") {
      setSaveError("Only sponsors can update sponsor profile settings.");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      setSaveSuccess("");

      const payload = {
        brandName: sponsorForm.brandName,
        companyName: sponsorForm.companyName,
        website: sponsorForm.website,
        officialEmail: sponsorForm.officialEmail,
        phone: sponsorForm.phone,
        industry: sponsorForm.industry,
        companySize: sponsorForm.companySize,
        about: sponsorForm.about,
        logoUrl: sponsorForm.logoUrl,
        targetAudience: sponsorForm.targetAudience,
        preferredCategories: parseCommaSeparated(sponsorForm.preferredCategories),
        preferredLocations: parseCommaSeparated(sponsorForm.preferredLocations),
        sponsorshipInterests: sponsorForm.sponsorshipInterests,
        instagramUrl: sponsorForm.instagramUrl,
        linkedinUrl: sponsorForm.linkedinUrl,
        isPublic: sponsorForm.isPublic,
      };

      const res = await fetch("/api/sponsors/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save sponsor profile");
      }

      setSponsorProfile(data.sponsor || null);
      setSaveSuccess("Settings saved successfully.");
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save sponsor profile");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading settings...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="container-custom max-w-5xl">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-accent-orange" />
              Settings
            </p>

            <h1 className="text-4xl font-bold text-white md:text-5xl">
              Account &amp; Profile Settings
            </h1>

            <p className="mt-3 max-w-3xl text-text-muted">
              Manage your account details and keep your role-based profile updated
              for a better Sponexus experience.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {role === "SPONSOR" ? (
              <>
                <Link href="/dashboard/sponsor">
                  <Button variant="secondary">Back to Dashboard</Button>
                </Link>
                <Link href="/sponsorships/create">
                  <Button variant="primary">Create Sponsorship</Button>
                </Link>
              </>
            ) : (
              <Link href="/dashboard/organizer">
                <Button variant="secondary">Back to Dashboard</Button>
              </Link>
            )}
          </div>
        </div>

        {pageError ? (
          <div className="mb-8 rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {pageError}
          </div>
        ) : null}

        {role === "SPONSOR" ? (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Profile Completion</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {sponsorCompletion}%
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  Complete the important sponsor fields to improve trust and matching.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Profile Status</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {isSponsorProfileReady ? "Ready" : "Needs Work"}
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  Sponsorship creation works best after your sponsor profile is complete.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Visibility</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {sponsorForm.isPublic ? "Public" : "Private"}
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  Public sponsor profiles can be discovered by organizers.
                </p>
              </div>
            </div>

            {!isSponsorProfileReady && (
              <div className="mb-8 rounded-[24px] border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
                Complete your core sponsor profile fields before creating sponsorships.
                Focus on brand name, company name, official email, phone, industry,
                audience, categories, and locations.
              </div>
            )}

            <form
              onSubmit={handleSponsorSave}
              className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white">Sponsor Profile</h2>
                <p className="mt-2 text-sm text-text-muted">
                  This is your main sponsor profile editor inside Sponexus.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Brand Name
                  </label>
                  <input
                    name="brandName"
                    value={sponsorForm.brandName}
                    onChange={handleSponsorChange}
                    placeholder="Example: RedPulse"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Company Name
                  </label>
                  <input
                    name="companyName"
                    value={sponsorForm.companyName}
                    onChange={handleSponsorChange}
                    placeholder="Example: RedPulse Media Pvt Ltd"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Official Email
                  </label>
                  <input
                    type="email"
                    name="officialEmail"
                    value={sponsorForm.officialEmail}
                    onChange={handleSponsorChange}
                    placeholder="brand@company.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Phone
                  </label>
                  <input
                    name="phone"
                    value={sponsorForm.phone}
                    onChange={handleSponsorChange}
                    placeholder="Primary phone number"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Website
                  </label>
                  <input
                    name="website"
                    value={sponsorForm.website}
                    onChange={handleSponsorChange}
                    placeholder="yourbrand.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Industry
                  </label>
                  <input
                    name="industry"
                    value={sponsorForm.industry}
                    onChange={handleSponsorChange}
                    placeholder="Example: FMCG / EdTech / FinTech"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Company Size
                  </label>
                  <input
                    name="companySize"
                    value={sponsorForm.companySize}
                    onChange={handleSponsorChange}
                    placeholder="Example: 11-50 / 51-200"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Logo URL
                  </label>
                  <input
                    name="logoUrl"
                    value={sponsorForm.logoUrl}
                    onChange={handleSponsorChange}
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-white">
                    About
                  </label>
                  <textarea
                    name="about"
                    value={sponsorForm.about}
                    onChange={handleSponsorChange}
                    rows={4}
                    placeholder="Describe your brand and partnership intent."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                  />
                </div>
              </div>

              <div className="my-8">
                <h3 className="text-xl font-semibold text-white">
                  Matching Preferences
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  These fields help Sponexus recommend better event opportunities.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Target Audience
                    </label>
                    <input
                      name="targetAudience"
                      value={sponsorForm.targetAudience}
                      onChange={handleSponsorChange}
                      placeholder="Example: College students, Gen Z, startup founders"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    />
                  </div>

                  <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <input
                      type="checkbox"
                      name="isPublic"
                      checked={sponsorForm.isPublic}
                      onChange={handleSponsorChange}
                      className="h-4 w-4"
                    />
                    <label className="ml-3 text-sm font-medium text-white">
                      Make sponsor profile public
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Preferred Categories
                    </label>
                    <input
                      name="preferredCategories"
                      value={sponsorForm.preferredCategories}
                      onChange={handleSponsorChange}
                      placeholder="Tech, Cultural, Sports"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    />
                    <p className="mt-2 text-xs text-text-muted">
                      Add comma-separated values.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Preferred Locations
                    </label>
                    <input
                      name="preferredLocations"
                      value={sponsorForm.preferredLocations}
                      onChange={handleSponsorChange}
                      placeholder="Delhi NCR, Jaipur, Mumbai"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    />
                    <p className="mt-2 text-xs text-text-muted">
                      Add comma-separated values.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-white">
                      Sponsorship Interests
                    </label>
                    <p className="mb-3 text-xs text-text-muted">
                      Select the sponsorship deliverables your brand usually wants from events.
                    </p>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {DELIVERABLE_OPTIONS.map((item) => {
                        const checked = sponsorForm.sponsorshipInterests.includes(item.value);

                        return (
                          <label
                            key={item.value}
                            className={`cursor-pointer rounded-2xl border px-4 py-4 text-sm transition ${
                              checked
                                ? "border-accent-orange bg-accent-orange/10 text-white"
                                : "border-white/10 bg-white/5 text-text-muted hover:border-white/20"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleInterest(item.value)}
                                className="mt-1 h-4 w-4 accent-yellow-400"
                              />
                              <div>
                                <p className="font-medium text-text-light">{item.label}</p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white">Public Presence</h3>
                <p className="mt-2 text-sm text-text-muted">
                  Optional links help build trust with organizers.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Instagram URL
                    </label>
                    <input
                      name="instagramUrl"
                      value={sponsorForm.instagramUrl}
                      onChange={handleSponsorChange}
                      placeholder="https://instagram.com/yourbrand"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      LinkedIn URL
                    </label>
                    <input
                      name="linkedinUrl"
                      value={sponsorForm.linkedinUrl}
                      onChange={handleSponsorChange}
                      placeholder="https://linkedin.com/company/yourbrand"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    />
                  </div>
                </div>
              </div>

              {saveError ? (
                <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {saveError}
                </div>
              ) : null}

              {saveSuccess ? (
                <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {saveSuccess}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Profile"}
                </Button>

                <Link href="/dashboard/sponsor">
                  <Button type="button" variant="secondary">
                    Back to Dashboard
                  </Button>
                </Link>

                <Link href="/sponsorships/create">
                  <Button type="button" variant="secondary">
                    Create Sponsorship
                  </Button>
                </Link>
              </div>
            </form>
          </>
        ) : role === "ORGANIZER" ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <EmptyState
              title="Organizer settings section"
              description="Your organizer settings can live here, but for sponsor department work this page now correctly keeps sponsor settings as the main editable profile flow."
              actionLabel="Back to Organizer Dashboard"
              onAction={() => router.push("/dashboard/organizer")}
            />
          </div>
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <EmptyState
              title="Settings not available"
              description="We could not determine the correct role-based settings view for this account."
              actionLabel="Go to Login"
              onAction={() => router.push("/login")}
            />
          </div>
        )}
      </div>
    </div>
  );
}