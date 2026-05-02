"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  EventDeliverable,
  EventCategory,
  EVENT_CATEGORY_OPTIONS,
} from "@/types/event";

type MediaType = "image" | "video";

type UploadedMedia = {
  url: string;
  publicId: string;
  type: MediaType;
  title?: string;
  uploadedAt?: string;
};

const MAX_DELIVERABLES = 3;
const DELIVERABLE_OPTIONS: { value: EventDeliverable; label: string }[] = [
  { value: "Stage Branding", label: "Stage Branding" },
  { value: "Stall Space", label: "Stall Space" },
  { value: "Social Media Promotion", label: "Social Media Promotion" },
  { value: "Product Display", label: "Product Display" },
  { value: "Announcements / Stage Mentions", label: "Announcements / Stage Mentions" },
  { value: "Email Promotion", label: "Email Promotion" },
  { value: "Title Sponsorship", label: "Title Sponsorship" },
  { value: "Co-Branding", label: "Co-Branding" },
];


function splitCommaValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
} 

export default function CreateEventPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
 const [selectedCategory, setSelectedCategory] =
  useState<EventCategory>("Technology");
const [customCategory, setCustomCategory] = useState("");
  const [targetAudienceInput, setTargetAudienceInput] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [attendeeCount, setAttendeeCount] = useState("");
  const [eventType, setEventType] = useState<string>("Technology");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [providedDeliverables, setProvidedDeliverables] = useState<EventDeliverable[]>([]);

  const [coverImage] = useState("");
const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);

  const [publishMode, setPublishMode] = useState<"draft" | "publish">("publish");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

 const categories = useMemo(() => {
  if (selectedCategory === "Other") {
    return customCategory.trim() ? [customCategory.trim()] : [];
  }

  return [selectedCategory];
}, [selectedCategory, customCategory]);

  const targetAudience = useMemo(
    () => splitCommaValues(targetAudienceInput),
    [targetAudienceInput]
  );
  const today = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const toggleDeliverable = (value: EventDeliverable) => {
  setError("");

  setProvidedDeliverables((prev) => {
    if (prev.includes(value)) {
      return prev.filter((item) => item !== value);
    }

    if (prev.length >= MAX_DELIVERABLES) {
      setError("You can select only your top 3 sponsor deliverables.");
      return prev;
    }

    return [...prev, value];
  });
};

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;

  setError("");

  const formData = new FormData();
  formData.append("uploadType", "eventImage");

  Array.from(files).forEach((file) => {
    formData.append("files", file);
  });

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Upload failed");
      return;
    }

    setUploadedMedia((prev) => [...prev, ...data.files]);
  } catch {
    setError("Upload failed");
  }
};
  const validateForm = () => {
    if (!user) {
      return "Please login first.";
    }

    if (user.role !== "ORGANIZER") {
      return "Only organizers can create events.";
    }

    if (!title.trim()) {
      return "Event title is required.";
    }

    if (!description.trim()) {
      return "Event description is required.";
    }

    if (categories.length === 0) {
  return "Please select a category.";
}

if (selectedCategory === "Other" && !customCategory.trim()) {
  return "Please enter your custom category.";
}

    if (!location.trim()) {
      return "Location is required.";
    }

    if (!budget || Number.isNaN(Number(budget)) || Number(budget) < 0) {
      return "Budget must be a valid non-negative number.";
    }

    if (
      !attendeeCount ||
      Number.isNaN(Number(attendeeCount)) ||
      Number(attendeeCount) < 1
    ) {
      return "Expected attendees must be at least 1.";
    }

    if (!startDate || !endDate) {
      return "Start date and end date are required.";
    }

    if (new Date(endDate) < new Date(startDate)) {
  return "End date cannot be before start date.";
}

if (providedDeliverables.length !== MAX_DELIVERABLES) {
  return "Please select exactly 3 sponsor deliverables.";
}

if (uploadedMedia.length < 2) {
  return "Please upload at least 2 event images.";
}

return "";
  };

  const submitEvent = async (mode: "draft" | "publish") => {
    setError("");
    setSuccessMessage("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

   setSubmitting(true);
setPublishMode(mode);

try {
  const payload = {
  title: title.trim(),
  description: description.trim(),
  categories,
  customCategory: selectedCategory === "Other" ? customCategory.trim() : "",
  targetAudience,
  location: location.trim(),
  budget: Number(budget),
  startDate,
  endDate,
  attendeeCount: Number(attendeeCount),
  eventType: selectedCategory === "Other" ? customCategory.trim() : eventType,
  providedDeliverables,
  coverImage:
    coverImage.trim() ||
    uploadedMedia.find((m) => m.type === "image")?.url ||
    "",
  venueImages: uploadedMedia,
  pastEventMedia: [],
  status: mode === "publish" ? "PUBLISHED" : "DRAFT",
};

      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
  setError(data.message || "Failed to create event.");

  if (data.redirectTo) {
    router.push(data.redirectTo);
  }

  return;
}
      setSuccessMessage(
        mode === "publish"
          ? "Event published successfully."
          : "Event saved as draft successfully."
      );

      if (data?.event?._id) {
        router.push(`/events/${data.event._id}`);
        return;
      }

      router.push("/dashboard/organizer");
    } catch {
      setError("Something went wrong while creating the event.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-base px-4 text-text-light">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-base px-4">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-text-light">
          <h1 className="text-2xl font-bold">Login required</h1>
          <p className="mt-3 text-text-muted">
            You need to login before creating an event.
          </p>
          <div className="mt-6">
            <Button asChild variant="primary">
              <a href="/login">Go to Login</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "ORGANIZER") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-base px-4">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-text-light">
          <h1 className="text-2xl font-bold">Organizer access only</h1>
          <p className="mt-3 text-text-muted">
            Only organizers can create events on Sponexus.
          </p>
          <div className="mt-6">
            <Button asChild variant="secondary">
              <a href="/dashboard/sponsor">Go to Dashboard</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-dark-base px-4 py-8 text-text-light">
      <div className="container-custom mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.18em] text-accent-orange">
            Organizer Portal
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Create Event</h1>
          <p className="mt-3 max-w-2xl text-text-muted">
            Build a sponsor-ready event listing with clear details, audience,
            budget, trust media, and clear sponsor deliverables so the right brands
            can evaluate fit fast.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {successMessage}
          </div>
        ) : null}

        <form
          className="space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            submitEvent("publish");
          }}
        >
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Basic Event Details</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Event Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter event title"
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your event clearly for sponsors"
                  rows={5}
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
              </div>

              <div>
  <label className="mb-2 block text-sm font-medium text-text-light">
    Category
  </label>

  <select
    value={selectedCategory}
    onChange={(e) => {
      const value = e.target.value as EventCategory;
      setSelectedCategory(value);
      setEventType(value);

      if (value !== "Other") {
        setCustomCategory("");
      }
    }}
    className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
  >
    {EVENT_CATEGORY_OPTIONS.map((category) => (
      <option key={category} value={category}>
        {category}
      </option>
    ))}
  </select>

  {selectedCategory === "Other" ? (
    <input
      value={customCategory}
      onChange={(e) => {
        setCustomCategory(e.target.value);
        setEventType("Other");
      }}
      placeholder="Enter custom category"
      className="mt-3 w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
    />
  ) : null}

  <p className="mt-2 text-xs text-text-muted">
    Category is used for matching events with sponsorships.
  </p>
</div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Target Audience
                </label>
                <input
                  value={targetAudienceInput}
                  onChange={(e) => setTargetAudienceInput(e.target.value)}
                  placeholder="Students, Founders, Gamers"
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
                <p className="mt-2 text-xs text-text-muted">
                  Use comma separated values.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Event Type
                </label>
                <select
  value={eventType}
  onChange={(e) => setEventType(e.target.value)}
  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
>
  {categories.map((type) => (
    <option key={type} value={type}>
      {type}
    </option>
  ))}
</select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Location
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Delhi NCR / Online / Campus Name"
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Budget Required
                </label>
                <input
                  type="number"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="50000"
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Expected Attendees
                </label>
                <input
                  type="number"
                  min="1"
                  value={attendeeCount}
                  onChange={(e) => setAttendeeCount(e.target.value)}
                  placeholder="1000"
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Start Date
                </label>
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">
                  End Date
                </label>
                <input
                  type="date"
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Sponsor Deliverables</h2>
            <p className="mt-3 max-w-2xl text-sm text-text-muted">
              Select your top 3 strongest sponsor deliverables. This helps us match your
event with the right sponsors more accurately.
            </p>
            <p className="mt-2 text-xs text-accent-orange">
  {providedDeliverables.length}/{MAX_DELIVERABLES} selected
</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {DELIVERABLE_OPTIONS.map((item) => {
                const checked = providedDeliverables.includes(item.value);

                return (
                  <label
                    key={item.value}
                    className={`cursor-pointer rounded-2xl border px-4 py-4 text-sm transition ${
                      checked
                        ? "border-accent-orange bg-accent-orange/10 text-white"
                        : "border-white/10 bg-dark-layer text-text-muted hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDeliverable(item.value)}
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
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Media & Trust Proof</h2>
            <div className="mt-6 grid gap-5">
              {coverImage ? (
  <div className="rounded-2xl border border-white/10 bg-dark-layer p-4">
    <p className="mb-3 text-sm font-medium text-text-light">
      Cover Image Preview
    </p>

    <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-white/10">
      <img
        src={coverImage}
        alt="Event cover preview"
        className="h-full w-full object-cover"
      />
    </div>
  </div>
) : null}
<div>
              <label className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-dark-layer px-4 py-4 text-sm transition hover:border-accent-orange">
  
  <div className="flex flex-col">
   <span className="text-text-light font-medium">
  Upload Event Media
</span>
<span className="text-xs text-text-muted">
  Photos, posters, logos • Max 5 files
</span>
  </div>

  <span className="rounded-lg bg-accent-orange px-3 py-1 text-xs font-semibold text-dark-base">
    Upload
  </span>

  <input
    type="file"
    multiple
    accept="image/jpeg,image/png,image/webp"
    onChange={handleFileUpload}
    className="hidden"
  />
</label>
<p className="mt-2 text-xs text-text-muted">
    Minimum 2 images required • Max 5 allowed
  </p>
</div>


{uploadedMedia.length > 0 && (
  <div className="flex gap-4 overflow-x-auto rounded-2xl border border-white/10 bg-dark-layer p-4">
    {uploadedMedia.map((item, index) => (
      <div
        key={`${item.publicId}-${index}`}
        className="relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10"
      >
        <img
          src={item.url}
          alt={item.title || "Event media"}
          className="h-full w-full object-cover"
        />

        <button
          type="button"
          onClick={() =>
            setUploadedMedia((prev) => prev.filter((_, i) => i !== index))
          }
          className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white"
        >
          ✕
        </button>
      </div>
    ))}
  </div>
)}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Publishing</h2>
            <div className="mt-4 rounded-2xl border border-white/10 bg-dark-layer px-4 py-4 text-sm text-text-muted">
              Save as <span className="text-white">Draft</span> if you still need to
              review details. Publish when the event is ready for sponsor discovery.
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard/organizer")}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="secondary"
                loading={submitting && publishMode === "draft"}
                disabled={submitting}
                onClick={() => submitEvent("draft")}
              >
                Save Draft
              </Button>

              <Button
                type="submit"
                variant="primary"
                loading={submitting && publishMode === "publish"}
                disabled={submitting}
              >
                Publish Event
              </Button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}