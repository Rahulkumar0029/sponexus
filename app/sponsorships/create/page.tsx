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
  isProfileComplete?: boolean;
  isPublic?: boolean;
};

type SettingsMeResponse = {
  success: boolean;
  user?: CurrentUser;
  sponsorProfile?: SponsorProfile | null;
  message?: string;
};

type FormDataState = {
  sponsorshipTitle: string;
  sponsorshipType: string;
  budget: string;
  category: string;
  targetAudience: string;
  city: string;
  locationPreference: string;
  campaignGoal: string;
  deliverablesExpected: string;
  customMessage: string;
  bannerRequirement: boolean;
  stallRequirement: boolean;
  mikeAnnouncement: boolean;
  socialMediaMention: boolean;
  productDisplay: boolean;
  contactPersonName: string;
  contactPhone: string;
  applicationDeadline: string;
};

const initialFormData: FormDataState = {
  sponsorshipTitle: "",
  sponsorshipType: "",
  budget: "",
  category: "",
  targetAudience: "",
  city: "",
  locationPreference: "",
  campaignGoal: "",
  deliverablesExpected: "",
  customMessage: "",
  bannerRequirement: false,
  stallRequirement: false,
  mikeAnnouncement: false,
  socialMediaMention: false,
  productDisplay: false,
  contactPersonName: "",
  contactPhone: "",
  applicationDeadline: "",
};

export default function CreateSponsorshipPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(null);

  const [formData, setFormData] = useState<FormDataState>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
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
        setProfileLoading(true);
        setProfileError("");

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
        setSponsorProfile(profile);

        setFormData((prev) => ({
          ...prev,
          contactPersonName: prev.contactPersonName || data.user?.name || "",
          contactPhone: prev.contactPhone || profile?.phone || "",
          category:
            prev.category ||
            profile?.preferredCategories?.[0] ||
            "",
          locationPreference:
            prev.locationPreference ||
            profile?.preferredLocations?.[0] ||
            "",
        }));
      } catch (err: any) {
        setProfileError(err?.message || "Unable to load sponsor profile");
        setSponsorProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };

    loadSponsorProfile();
  }, [user]);

  const isProfileComplete = useMemo(() => {
    return Boolean(sponsorProfile?.isProfileComplete);
  }, [sponsorProfile]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
      setSubmitError("Only sponsors can create sponsorships.");
      return;
    }

    if (!isProfileComplete) {
      setSubmitError("Complete your sponsor profile before creating sponsorships.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      setSuccessMessage("");

      const payload = {
        ...formData,
        budget: Number(formData.budget),
        targetAudience: Number(formData.targetAudience),
      };

      const res = await fetch("/api/sponsorships/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create sponsorship");
      }

      setSuccessMessage("Sponsorship created successfully.");

      setTimeout(() => {
        router.push("/sponsorships");
      }, 1200);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to create sponsorship");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (user?.role === "SPONSOR" && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading sponsorship creation...
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
              Sponsor Creation Flow
            </p>

            <h1 className="text-4xl font-bold text-white md:text-5xl">
              Create Sponsorship
            </h1>

            <p className="mt-3 max-w-3xl text-text-muted">
              Publish a sponsorship opportunity so organizers can understand your
              campaign goals, expected deliverables, and sponsorship fit.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/sponsorships">
              <Button variant="secondary">My Sponsorships</Button>
            </Link>
            <Link href="/dashboard/sponsor">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        {profileError ? (
          <div className="mb-8 rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {profileError}
          </div>
        ) : null}

        {!sponsorProfile || !isProfileComplete ? (
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <EmptyState
              title="Complete your sponsor profile first"
              description="Your sponsorship posts should only be created after your sponsor profile is properly completed. This improves trust, visibility, and matching quality."
              actionLabel="Complete Profile"
              onAction={() => router.push("/settings")}
            />
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Brand</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {sponsorProfile.brandName || "Not added"}
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  Sponsor identity attached to this sponsorship post.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Company</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {sponsorProfile.companyName || "Not added"}
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  Organizers will evaluate trust and fit from this profile.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
                <p className="text-sm text-text-muted">Profile Status</p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  Ready to Publish
                </h3>
                <p className="mt-3 text-sm text-text-muted">
                  Your sponsor profile is complete enough to create sponsorship posts.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white">
                  Sponsorship Details
                </h2>
                <p className="mt-2 text-sm text-text-muted">
                  Add the core information that organizers need to evaluate your offer.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Sponsorship Title
                  </label>
                  <input
                    name="sponsorshipTitle"
                    value={formData.sponsorshipTitle}
                    onChange={handleInputChange}
                    placeholder="Example: College Tech Fest Brand Partnership"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Sponsorship Type
                  </label>
                  <input
                    name="sponsorshipType"
                    value={formData.sponsorshipType}
                    onChange={handleInputChange}
                    placeholder="Example: Title Sponsor / Co-Sponsor / Stall Partner"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Budget
                  </label>
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="Minimum ₹2000"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Category
                  </label>
                  <input
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Example: Tech / Cultural / Sports"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Expected Audience
                  </label>
                  <input
                    type="number"
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="Minimum 50"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Location Preference
                  </label>
                  <input
                    name="locationPreference"
                    value={formData.locationPreference}
                    onChange={handleInputChange}
                    placeholder="Example: Delhi NCR / Jaipur / Hybrid"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    City
                  </label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Example: Gurugram"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    name="applicationDeadline"
                    value={formData.applicationDeadline}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-white">
                    Campaign Goal
                  </label>
                  <textarea
                    name="campaignGoal"
                    value={formData.campaignGoal}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="What is the brand trying to achieve through this sponsorship?"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-white">
                    Deliverables Expected
                  </label>
                  <textarea
                    name="deliverablesExpected"
                    value={formData.deliverablesExpected}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Example: logo placement, stage branding, stalls, social promotion"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-white">
                    Custom Message
                  </label>
                  <textarea
                    name="customMessage"
                    value={formData.customMessage}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Add any specific note for organizers"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                  />
                </div>
              </div>

              <div className="my-8">
                <h3 className="text-xl font-semibold text-white">
                  Activation Requirements
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Select the kind of visibility or execution support you expect.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    {
                      key: "bannerRequirement",
                      label: "Banner Requirement",
                    },
                    {
                      key: "stallRequirement",
                      label: "Stall Requirement",
                    },
                    {
                      key: "mikeAnnouncement",
                      label: "Mike Announcement",
                    },
                    {
                      key: "socialMediaMention",
                      label: "Social Media Mention",
                    },
                    {
                      key: "productDisplay",
                      label: "Product Display",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white"
                    >
                      <input
                        type="checkbox"
                        name={item.key}
                        checked={Boolean(
                          formData[item.key as keyof FormDataState]
                        )}
                        onChange={handleInputChange}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white">
                  Contact Details
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  This helps organizers contact the right person for partnership discussion.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Contact Person Name
                    </label>
                    <input
                      name="contactPersonName"
                      value={formData.contactPersonName}
                      onChange={handleInputChange}
                      placeholder="Example: Rahul / Brand Manager"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Contact Phone
                    </label>
                    <input
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleInputChange}
                      placeholder="Primary contact number"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                      required
                    />
                  </div>
                </div>
              </div>

              {submitError ? (
                <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {submitError}
                </div>
              ) : null}

              {successMessage ? (
                <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {successMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Sponsorship"}
                </Button>

                <Link href="/sponsorships">
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}