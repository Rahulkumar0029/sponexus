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
  baseLocation?: string;
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
  customCategory: string;
  targetAudience: string;
  city: string;
  locationPreference: string;
  campaignGoal: string;
  coverImage: string;
  deliverablesExpected: string[];
  customMessage: string;
  contactPersonName: string;
  contactPhone: string;
  applicationDeadline: string;
};

const initialFormData: FormDataState = {
  sponsorshipTitle: "",
  sponsorshipType: "",
  budget: "",
  category: "",
  customCategory: "",
  targetAudience: "",
  city: "",
  locationPreference: "",
  campaignGoal: "",
  coverImage: "",
  deliverablesExpected: [],
  customMessage: "",
  contactPersonName: "",
  contactPhone: "",
  applicationDeadline: "",
};

const DELIVERABLE_OPTIONS = [
  "Stage Branding",
  "Stall Space",
  "Social Media Promotion",
  "Product Display",
  "Announcements / Stage Mentions",
  "Email Promotion",
  "Title Sponsorship",
  "Co-Branding",
];

const SPONSORSHIP_CATEGORY_OPTIONS = [
  "Technology",
  "Education",
  "Sports",
  "Cultural",
  "Music & Entertainment",
  "Startup & Business",
  "Food & Beverage",
  "Fashion & Lifestyle",
  "Health & Wellness",
  "Finance & Fintech",
  "Gaming & Esports",
  "Automobile",
  "Travel & Tourism",
  "Social Impact / NGO",
  "College Fest",
  "Corporate Event",
  "Exhibition / Expo",
  "Influencer / Creator Campaign",
  "Community Event",
  "Other",
];

export default function CreateSponsorshipPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [sponsorProfile, setSponsorProfile] = useState<SponsorProfile | null>(null);

  const [formData, setFormData] = useState<FormDataState>(initialFormData);
const [submitting, setSubmitting] = useState(false);
const [uploadingCover, setUploadingCover] = useState(false);
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
  city: prev.city || profile?.baseLocation || "",
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
  const { name, value } = e.target;

  setFormData((prev) => ({
    ...prev,
    [name]: value,
    ...(name === "category" && value !== "Other" ? { customCategory: "" } : {}),
  }));
};

  const handleCoverImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setUploadingCover(true);
    setSubmitError("");
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("uploadType", "sponsorshipMedia");
    formData.append("files", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.success || !data.files?.[0]?.url) {
      throw new Error(data.message || "Cover image upload failed");
    }

    setFormData((prev) => ({
      ...prev,
      coverImage: data.files[0].url,
    }));

    setSuccessMessage("Cover image uploaded. It will be saved when you create the sponsorship.");
  } catch (err: any) {
    setSubmitError(err?.message || "Cover image upload failed");
  } finally {
    setUploadingCover(false);
    e.target.value = "";
  }
};

     const handleDeliverableToggle = (deliverable: string, checked: boolean) => {
  setFormData((prev) => {
    const alreadySelected = prev.deliverablesExpected.includes(deliverable);

    if (checked) {
      if (alreadySelected) return prev;

      if (prev.deliverablesExpected.length >= 3) {
        setSubmitError("You can select only 3 sponsor deliverables.");
        return prev;
      }

      setSubmitError("");

      return {
        ...prev,
        deliverablesExpected: [...prev.deliverablesExpected, deliverable],
      };
    }

    setSubmitError("");

    return {
      ...prev,
      deliverablesExpected: prev.deliverablesExpected.filter(
        (item) => item !== deliverable
      ),
    };
  });
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

        if (formData.deliverablesExpected.length !== 3) {
      setSubmitError("Please select exactly 3 sponsor deliverables.");
      return;
    }

    if (Number(formData.budget) < 2000) {
      setSubmitError("Budget must be at least ₹2000.");
      return;
    }

    if (Number(formData.targetAudience) < 50) {
      setSubmitError("Expected audience must be at least 50.");
      return;
    }

    const today = new Date();
today.setHours(0, 0, 0, 0);

const deadline = new Date(formData.applicationDeadline);
deadline.setHours(0, 0, 0, 0);

// ❗ must be strictly after today (tomorrow onwards)
if (deadline <= today) {
  setSubmitError("Application deadline must be from tomorrow onwards.");
  return;
}

const finalCategory =
  formData.category === "Other"
    ? formData.customCategory.trim()
    : formData.category.trim();

if (!finalCategory) {
  setSubmitError("Please select or enter a valid category.");
  return;
}

if (finalCategory.length > 80) {
  setSubmitError("Category cannot exceed 80 characters.");
  return;
}

if (!formData.city && !sponsorProfile?.baseLocation) {
  setSubmitError("Please add your sponsor base location from Settings first.");
  return;
}

if (!formData.contactPersonName.trim()) {
  setSubmitError("Contact person name is required.");
  return;
}

    try {
      setSubmitting(true);
      setSubmitError("");
      setSuccessMessage("");

      const payload = {
  ...formData,
  category: finalCategory,
  city: formData.city || sponsorProfile?.baseLocation || "",
  budget: Number(formData.budget),
  targetAudience: Number(formData.targetAudience),
};

delete (payload as any).customCategory;

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
                    min="2000"
                    placeholder="Minimum ₹2000"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                    required
                  />
                </div>

              <div>
  <label className="mb-2 block text-sm font-medium text-white">
    Category
  </label>

  <select
    name="category"
    value={formData.category}
    onChange={handleInputChange}
    className="w-full rounded-2xl border border-white/10 bg-[#1E293B] px-4 py-3 text-white outline-none"
    required
  >
    <option className="bg-[#1E293B] text-white" value="">
      Select category
    </option>

    {SPONSORSHIP_CATEGORY_OPTIONS.map((option) => (
      <option className="bg-[#1E293B] text-white" key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
</div>

{formData.category === "Other" ? (
  <div>
    <label className="mb-2 block text-sm font-medium text-white">
      Custom Category
    </label>
    <input
      name="customCategory"
      value={formData.customCategory}
      onChange={handleInputChange}
      placeholder="Example: Campus Activation / Rural Marketing / Local Business"
      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
      required
    />
  </div>
) : null}

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Expected Audience
                  </label>
                  <input
                    type="number"
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleInputChange}
                    min="50"
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
    Sponsor Base Location
  </label>

  <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
    {formData.city || "Not added in settings"}
  </div>

  <p className="mt-2 text-xs text-text-muted">
    This comes from your sponsor profile settings. Update it from Settings if needed.
  </p>
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
  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
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
    Campaign Cover Image
    <span className="ml-2 text-xs font-normal text-text-muted">
      Optional
    </span>
  </label>

  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
    <div className="flex flex-col gap-5 md:flex-row md:items-center">
      <div className="h-36 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 md:w-64">
        {formData.coverImage ? (
          <img
            src={formData.coverImage}
            alt="Campaign cover"
            className="h-full w-full object-cover"
          />
        ) : sponsorProfile?.logoUrl ? (
          <img
            src={sponsorProfile.logoUrl}
            alt="Sponsor profile logo fallback"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-text-muted">
            No cover uploaded
          </div>
        )}
      </div>

      <div className="flex-1">
        <input
          id="sponsorship-cover-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleCoverImageUpload}
          className="hidden"
        />

        <label
          htmlFor="sponsorship-cover-upload"
          className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          {uploadingCover ? "Uploading..." : "Upload Campaign Cover"}
        </label>

        {formData.coverImage ? (
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                coverImage: "",
              }))
            }
            className="ml-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300"
          >
            Remove
          </button>
        ) : null}

        <p className="mt-3 text-xs leading-relaxed text-text-muted">
          JPG, PNG, or WEBP. Maximum 2MB. If you do not upload a campaign cover,
          your sponsor profile logo will be used automatically.
        </p>
      </div>
    </div>
  </div>
</div>

                <div className="md:col-span-2 rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
  <h3 className="text-xl font-semibold text-white">
    Sponsor Deliverables
  </h3>

  <p className="mt-2 text-sm text-text-muted">
    Select your top 3 strongest sponsor deliverables. This helps us match your sponsorship with the right events.
  </p>

  <p className="mt-3 text-sm font-semibold text-accent-orange">
    {formData.deliverablesExpected.length}/3 selected
  </p>

  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {DELIVERABLE_OPTIONS.map((deliverable) => {
      const selected = formData.deliverablesExpected.includes(deliverable);
      const disabled = !selected && formData.deliverablesExpected.length >= 3;

      return (
        <label
          key={deliverable}
          className={`flex cursor-pointer items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
            selected
              ? "border-accent-orange bg-accent-orange/10 text-accent-orange"
              : disabled
              ? "border-white/10 bg-white/5 text-text-muted opacity-60"
              : "border-white/10 bg-white/5 text-white hover:border-white/20"
          }`}
        >
          <input
            type="checkbox"
            checked={selected}
            disabled={disabled}
            onChange={(e) =>
              handleDeliverableToggle(deliverable, e.target.checked)
            }
            className="h-5 w-5 cursor-pointer accent-orange-500"
          />

          <span className="text-sm font-semibold">{deliverable}</span>
        </label>
      );
    })}
  </div>
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
  required
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
                <Button type="submit" variant="primary" disabled={submitting || uploadingCover}>
  {submitting
    ? "Creating..."
    : uploadingCover
    ? "Uploading cover..."
    : "Create Sponsorship"}
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