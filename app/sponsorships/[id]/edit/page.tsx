"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";

type SponsorshipStatus = "active" | "paused" | "closed" | "expired";

type SponsorshipDetail = {
  _id?: string;
  sponsorshipTitle?: string;
  sponsorshipType?: string;
  budget?: number;
  category?: string;
  targetAudience?: string;
  city?: string;
  locationPreference?: string;
  campaignGoal?: string;
  coverImage?: string;
  deliverablesExpected?: string[];
  customMessage?: string;
  contactPersonName?: string;
  contactPhone?: string;
  status?: SponsorshipStatus;
  expiresAt?: string | null;
};

type SponsorshipDetailResponse = {
  success: boolean;
  mode?: "public_view" | "organizer_view" | "owner_view";
  data?: SponsorshipDetail;
  message?: string;
};

type FormDataState = {
  sponsorshipTitle: string;
  sponsorshipType: string;
  budget: string;
  category: string;
  customCategory: string;
  targetAudience: string;
  locationPreference: string;
  campaignGoal: string;
  coverImage: string;
  deliverablesExpected: string[];
  customMessage: string;
  contactPersonName: string;
  contactPhone: string;
  applicationDeadline: string;
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

const initialFormData: FormDataState = {
  sponsorshipTitle: "",
  sponsorshipType: "",
  budget: "",
  category: "",
  customCategory: "",
  targetAudience: "",
  locationPreference: "",
  campaignGoal: "",
  coverImage: "",
  deliverablesExpected: [],
  customMessage: "",
  contactPersonName: "",
  contactPhone: "",
  applicationDeadline: "",
};

function formatDateForInput(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().split("T")[0];
}

function tomorrowDateInput() {
  return new Date(Date.now() + 86400000).toISOString().split("T")[0];
}

function onlyPhoneChars(value: string) {
  return value.replace(/[^0-9+\-\s()]/g, "").slice(0, 20);
}

export default function EditSponsorshipPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const sponsorshipId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [item, setItem] = useState<SponsorshipDetail | null>(null);

  const [formData, setFormData] = useState<FormDataState>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(`/login?redirect=/sponsorships/${sponsorshipId}/edit`);
      return;
    }

    if (user.role !== "SPONSOR") {
      router.replace("/sponsorships");
    }
  }, [authLoading, user, router, sponsorshipId]);

  const loadSponsorship = useCallback(async () => {
    if (!sponsorshipId) {
      setPageError("Invalid sponsorship ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setPageError("");

      const res = await fetch(`/api/sponsorships/${sponsorshipId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: SponsorshipDetailResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load sponsorship");
      }

      if (data.mode !== "owner_view") {
        throw new Error("Only the sponsor owner can edit this sponsorship.");
      }

      const sponsorship = data.data || null;

      if (!sponsorship?._id) {
        throw new Error("Sponsorship not found");
      }

      setItem(sponsorship);

      const existingCategory = sponsorship.category || "";
      const isKnownCategory = SPONSORSHIP_CATEGORY_OPTIONS.includes(existingCategory);

      setFormData({
        sponsorshipTitle: sponsorship.sponsorshipTitle || "",
        sponsorshipType: sponsorship.sponsorshipType || "",
        budget:
          typeof sponsorship.budget === "number"
            ? String(sponsorship.budget)
            : "",
        category: isKnownCategory ? existingCategory : "Other",
        customCategory: isKnownCategory ? "" : existingCategory,
        targetAudience: sponsorship.targetAudience || "",
        locationPreference: sponsorship.locationPreference || "",
        campaignGoal: sponsorship.campaignGoal || "",
        coverImage: sponsorship.coverImage || "",
        deliverablesExpected: Array.isArray(sponsorship.deliverablesExpected)
          ? sponsorship.deliverablesExpected
          : [],
        customMessage: sponsorship.customMessage || "",
        contactPersonName: sponsorship.contactPersonName || "",
        contactPhone: sponsorship.contactPhone || "",
        applicationDeadline: formatDateForInput(sponsorship.expiresAt),
      });
    } catch (err: any) {
      setPageError(err?.message || "Failed to load sponsorship");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [sponsorshipId]);

  useEffect(() => {
    if (!user || user.role !== "SPONSOR") return;
    loadSponsorship();
  }, [user, loadSponsorship]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setSubmitError("");
    setSuccessMessage("");

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "contactPhone"
          ? onlyPhoneChars(value)
          : value,
      ...(name === "category" && value !== "Other"
        ? { customCategory: "" }
        : {}),
    }));
  };

  const handleCoverImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      setSubmitError("");
      setSuccessMessage("");

      const uploadData = new FormData();
      uploadData.append("uploadType", "sponsorshipMedia");
      uploadData.append("files", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: uploadData,
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.files?.[0]?.url) {
        throw new Error(data.message || "Cover image upload failed");
      }

      setFormData((prev) => ({
        ...prev,
        coverImage: data.files[0].url,
      }));

      setSuccessMessage("Cover image uploaded. Click Save Changes to store it.");
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

    if (!item?._id) {
      setSubmitError("Sponsorship details missing.");
      return;
    }

    if (item.status === "closed" || item.status === "expired") {
      setSubmitError("Closed or expired sponsorship cannot be edited. Create again instead.");
      return;
    }

    if (formData.deliverablesExpected.length !== 3) {
      setSubmitError("Please select exactly 3 sponsor deliverables.");
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

    if (Number(formData.budget) < 2000) {
      setSubmitError("Budget must be at least ₹2000.");
      return;
    }

    if (Number(formData.targetAudience) < 50) {
      setSubmitError("Expected audience must be at least 50.");
      return;
    }

    const deadline = new Date(formData.applicationDeadline);
    deadline.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(deadline.getTime()) || deadline <= today) {
      setSubmitError("Application deadline must be from tomorrow onwards.");
      return;
    }

    if (!formData.contactPersonName.trim()) {
      setSubmitError("Contact person name is required.");
      return;
    }

    if (!formData.contactPhone.trim()) {
      setSubmitError("Contact phone is required.");
      return;
    }

    try {
      setSaving(true);
      setSubmitError("");
      setSuccessMessage("");

      const payload = {
        action: "edit",
        sponsorshipTitle: formData.sponsorshipTitle,
        sponsorshipType: formData.sponsorshipType,
        budget: Number(formData.budget),
        category: finalCategory,
        targetAudience: Number(formData.targetAudience),
        locationPreference: formData.locationPreference,
        campaignGoal: formData.campaignGoal,
        coverImage: formData.coverImage,
        deliverablesExpected: formData.deliverablesExpected,
        customMessage: formData.customMessage,
        contactPersonName: formData.contactPersonName,
        contactPhone: formData.contactPhone,
        applicationDeadline: formData.applicationDeadline,
      };

      const res = await fetch(`/api/sponsorships/${item._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update sponsorship");
      }

      setSuccessMessage("Sponsorship updated successfully.");

      setTimeout(() => {
        router.push(`/sponsorships/${item._id}`);
      }, 900);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to update sponsorship");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">
        Loading sponsorship edit...
      </div>
    );
  }

  if (pageError || !item) {
    return (
      <div className="relative min-h-screen px-4 py-12">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

        <div className="container-custom max-w-4xl">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <EmptyState
              title="Sponsorship cannot be edited"
              description={pageError || "This sponsorship is not available for editing."}
              actionLabel="Go Back"
              onAction={() => router.back()}
            />
          </div>
        </div>
      </div>
    );
  }

  const editBlocked = item.status === "closed" || item.status === "expired";

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="container-custom max-w-5xl">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-accent-orange" />
              Sponsor Management
            </p>

            <h1 className="text-4xl font-bold text-white md:text-5xl">
              Edit Sponsorship
            </h1>

            <p className="mt-3 max-w-3xl text-text-muted">
              Update your active or paused sponsorship post details.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={`/sponsorships/${item._id}`}>
              <Button variant="secondary">Back to Detail</Button>
            </Link>

            <Link href="/sponsorships">
              <Button variant="secondary">My Sponsorships</Button>
            </Link>
          </div>
        </div>

        {editBlocked ? (
          <div className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            Closed or expired sponsorship cannot be edited. Use Create Again from the detail page.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">Sponsorship Details</h2>
              <p className="mt-2 text-sm text-text-muted">
                All important fields are required for real marketplace quality.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Sponsorship Title"
                name="sponsorshipTitle"
                value={formData.sponsorshipTitle}
                onChange={handleInputChange}
                required
              />

              <Input
                label="Sponsorship Type"
                name="sponsorshipType"
                value={formData.sponsorshipType}
                onChange={handleInputChange}
                required
              />

              <Input
                label="Budget"
                type="number"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                min="2000"
                required
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Category <span className="text-accent-orange">*</span>
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
                    <option
                      className="bg-[#1E293B] text-white"
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {formData.category === "Other" ? (
                <Input
                  label="Custom Category"
                  name="customCategory"
                  value={formData.customCategory}
                  onChange={handleInputChange}
                  required
                />
              ) : null}

              <Input
                label="Expected Audience"
                type="number"
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleInputChange}
                min="50"
                required
              />

              <Input
                label="Location Preference"
                name="locationPreference"
                value={formData.locationPreference}
                onChange={handleInputChange}
                required
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Sponsor Base Location
                </label>
                <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                  {item.city || "Not added"}
                </div>
                <p className="mt-2 text-xs text-text-muted">
                  This comes from sponsor settings and is not edited here.
                </p>
              </div>

              <Input
                label="Application Deadline"
                type="date"
                name="applicationDeadline"
                value={formData.applicationDeadline}
                onChange={handleInputChange}
                min={tomorrowDateInput()}
                required
              />

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-white">
                  Campaign Goal <span className="text-accent-orange">*</span>
                </label>
                <textarea
                  name="campaignGoal"
                  value={formData.campaignGoal}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-white">
                  Campaign Cover Image
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
                        JPG, PNG, or WEBP. Maximum 2MB.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
                <h3 className="text-xl font-semibold text-white">
                  Sponsor Deliverables <span className="text-accent-orange">*</span>
                </h3>

                <p className="mt-2 text-sm text-text-muted">
                  Select exactly 3 strongest sponsor deliverables.
                </p>

                <p className="mt-3 text-sm font-semibold text-accent-orange">
                  {formData.deliverablesExpected.length}/3 selected
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {DELIVERABLE_OPTIONS.map((deliverable) => {
                    const selected =
                      formData.deliverablesExpected.includes(deliverable);
                    const disabled =
                      !selected && formData.deliverablesExpected.length >= 3;

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
                          className="h-5 w-5 cursor-pointer"
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
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
                />
              </div>

              <Input
                label="Contact Person Name"
                name="contactPersonName"
                value={formData.contactPersonName}
                onChange={handleInputChange}
                required
              />

              <Input
                label="Contact Phone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                required
              />
            </div>

            {submitError ? (
              <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {submitError}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {successMessage}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                variant="primary"
                disabled={saving || uploadingCover}
              >
                {saving
                  ? "Saving..."
                  : uploadingCover
                  ? "Uploading cover..."
                  : "Save Changes"}
              </Button>

              <Link href={`/sponsorships/${item._id}`}>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  required,
  type = "text",
  min,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: string;
  min?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-white">
        {label}
        {required ? <span className="ml-1 text-accent-orange">*</span> : null}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-text-muted"
      />
    </div>
  );
}