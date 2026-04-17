"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";

type CurrentUser = {
  _id?: string;
  id?: string;
  role?: "ORGANIZER" | "SPONSOR";
  name?: string;
  firstName?: string;
  email?: string;
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
  sponsorshipInterests?: string[];
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

type FormState = {
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
  sponsorshipInterests: string;
  instagramUrl: string;
  linkedinUrl: string;
  isPublic: boolean;
};

const initialFormState: FormState = {
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
  sponsorshipInterests: "",
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

export default function CreateSponsorProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [existingProfile, setExistingProfile] = useState<SponsorProfile | null>(null);

  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "ORGANIZER") {
      router.replace("/dashboard/organizer");
      return;
    }

    if (user.role !== "SPONSOR") {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadSponsorProfile = async () => {
      if (!user || user.role !== "SPONSOR") return;

      try {
        setPageLoading(true);
        setPageError("");

        const res = await fetch("/api/settings/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data: SettingsMeResponse = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Unable to load sponsor profile");
        }

        const profile = data.sponsorProfile || null;
        setExistingProfile(profile);

        setFormData({
          brandName: profile?.brandName || "",
          companyName: profile?.companyName || "",
          website: profile?.website || "",
          officialEmail:
            profile?.officialEmail || data.user?.email || "",
          phone: profile?.phone || "",
          industry: profile?.industry || "",
          companySize: profile?.companySize || "",
          about: profile?.about || "",
          logoUrl: profile?.logoUrl || "",
          targetAudience: profile?.targetAudience || "",
          preferredCategories: toCommaSeparated(profile?.preferredCategories),
          preferredLocations: toCommaSeparated(profile?.preferredLocations),
          sponsorshipInterests: toCommaSeparated(profile?.sponsorshipInterests),
          instagramUrl: profile?.instagramUrl || "",
          linkedinUrl: profile?.linkedinUrl || "",
          isPublic:
            typeof profile?.isPublic === "boolean" ? profile.isPublic : true,
        });
      } catch (err: any) {
        setPageError(err?.message || "Unable to load sponsor profile");
        setExistingProfile(null);
      } finally {
        setPageLoading(false);
      }
    };

    loadSponsorProfile();
  }, [user]);

  const isEditing = Boolean(existingProfile?._id);

  const completionEstimate = useMemo(() => {
    let score = 20;

    if (formData.brandName.trim()) score += 15;
    if (formData.companyName.trim()) score += 10;
    if (formData.officialEmail.trim()) score += 10;
    if (formData.phone.trim()) score += 10;
    if (formData.industry.trim()) score += 15;
    if (formData.targetAudience.trim()) score += 10;
    if (parseCommaSeparated(formData.preferredCategories).length) score += 10;
    if (parseCommaSeparated(formData.preferredLocations).length) score += 10;

    return Math.min(score, 100);
  }, [formData]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user || user.role !== "SPONSOR") {
      setSaveError("Only sponsors can create or update sponsor profiles.");
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      setSuccessMessage("");

      const payload = {
        brandName: formData.brandName,
        companyName: formData.companyName,
        website: formData.website,
        officialEmail: formData.officialEmail,
        phone: formData.phone,
        industry: formData.industry,
        companySize: formData.companySize,
        about: formData.about,
        logoUrl: formData.logoUrl,
        targetAudience: formData.targetAudience,
        preferredCategories: parseCommaSeparated(formData.preferredCategories),
        preferredLocations: parseCommaSeparated(formData.preferredLocations),
        sponsorshipInterests: parseCommaSeparated(formData.sponsorshipInterests),
        instagramUrl: formData.instagramUrl,
        linkedinUrl: formData.linkedinUrl,
        isPublic: formData.isPublic,
      };

      const res = await fetch("/api/sponsors/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save sponsor profile");
      }

      setSuccessMessage(
        isEditing
          ? "Sponsor profile updated successfully."
          : "Sponsor profile created successfully."
      );

      setTimeout(() => {
        router.push("/dashboard/sponsor");
      }, 1200);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save sponsor profile");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (user?.role === "SPONSOR" && pageLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading sponsor profile setup...
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
              Sponsor Profile Setup
            </p>

            <h1 className="text-4xl font-bold text-white md:text-5xl">
              {isEditing ? "Update Sponsor Profile" : "Create Sponsor Profile"}
            </h1>

            <p className="mt-3 max-w-3xl text-text-muted">
              Build your sponsor identity so organizers can understand your brand,
              preferences, and sponsorship fit on Sponexus.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard/sponsor">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
            <Link href="/sponsorships">
              <Button variant="secondary">My Sponsorships</Button>
            </Link>
          </div>
        </div>

        {pageError ? (
          <div className="mb-8 rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {pageError}
          </div>
        ) : null}

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Profile Mode</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {isEditing ? "Update" : "Create"}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              This page works for both first-time setup and future profile updates.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Completion Estimate</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {completionEstimate}%
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              More complete sponsor details improve trust and matching quality.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <p className="text-sm text-text-muted">Visibility</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {formData.isPublic ? "Public" : "Private"}
            </h3>
            <p className="mt-3 text-sm text-text-muted">
              Public visibility helps organizers discover your sponsor profile.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Core Brand Information</h2>
            <p className="mt-2 text-sm text-text-muted">
              These details shape your identity and credibility on the platform.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Brand Name
              </label>
              <input
                name="brandName"
                value={formData.brandName}
                onChange={handleChange}
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
                value={formData.companyName}
                onChange={handleChange}
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
                value={formData.officialEmail}
                onChange={handleChange}
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
                value={formData.phone}
                onChange={handleChange}
                placeholder="Primary contact number"
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
                value={formData.website}
                onChange={handleChange}
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
                value={formData.industry}
                onChange={handleChange}
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
                value={formData.companySize}
                onChange={handleChange}
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
                value={formData.logoUrl}
                onChange={handleChange}
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
                value={formData.about}
                onChange={handleChange}
                rows={4}
                placeholder="Describe your brand, market position, and partnership intent."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
              />
            </div>
          </div>

          <div className="my-8">
            <h3 className="text-xl font-semibold text-white">
              Matching Preferences
            </h3>
            <p className="mt-2 text-sm text-text-muted">
              These fields help Sponexus match your brand with relevant events.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Target Audience
                </label>
                <input
                  name="targetAudience"
                  value={formData.targetAudience}
                  onChange={handleChange}
                  placeholder="Example: College students, Gen Z, startup founders"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                />
              </div>

              <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
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
                  value={formData.preferredCategories}
                  onChange={handleChange}
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
                  value={formData.preferredLocations}
                  onChange={handleChange}
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
                <input
                  name="sponsorshipInterests"
                  value={formData.sponsorshipInterests}
                  onChange={handleChange}
                  placeholder="Title Sponsor, Stall Activation, Social Promotion"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                />
                <p className="mt-2 text-xs text-text-muted">
                  Add comma-separated values.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white">Public Presence</h3>
            <p className="mt-2 text-sm text-text-muted">
              Optional social links can improve trust and sponsor credibility.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Instagram URL
                </label>
                <input
                  name="instagramUrl"
                  value={formData.instagramUrl}
                  onChange={handleChange}
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
                  value={formData.linkedinUrl}
                  onChange={handleChange}
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

          {successMessage ? (
            <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {successMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving
                ? "Saving..."
                : isEditing
                ? "Update Sponsor Profile"
                : "Create Sponsor Profile"}
            </Button>

            <Link href="/dashboard/sponsor">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>

        {!pageLoading && !pageError && !existingProfile && (
          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <EmptyState
              title="First sponsor setup matters"
              description="A strong sponsor profile improves trust, makes your brand discoverable, and unlocks stronger sponsorship opportunities on Sponexus."
            />
          </div>
        )}
      </div>
    </div>
  );
}