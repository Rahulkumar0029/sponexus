"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";

type MediaType = "image" | "video";

type UploadedMedia = {
  url: string;
  publicId: string;
  type: MediaType;
  title?: string;
  uploadedAt?: string;
};

const EVENT_TYPES = [
  "CONFERENCE",
  "WORKSHOP",
  "WEBINAR",
  "FESTIVAL",
  "MEETUP",
  "OTHER",
] as const;

function splitCommaValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLineValues(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function guessMediaType(url: string): MediaType {
  const lower = url.toLowerCase();

  if (
    lower.includes(".mp4") ||
    lower.includes(".mov") ||
    lower.includes(".avi") ||
    lower.includes(".webm") ||
    lower.includes(".mkv")
  ) {
    return "video";
  }

  return "image";
}

function toMediaItems(urls: string[], titlePrefix: string): UploadedMedia[] {
  return urls.map((url, index) => ({
    url,
    publicId: url,
    type: guessMediaType(url),
    title: `${titlePrefix} ${index + 1}`,
    uploadedAt: new Date().toISOString(),
  }));
}

export default function CreateEventPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoriesInput, setCategoriesInput] = useState("");
  const [targetAudienceInput, setTargetAudienceInput] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [attendeeCount, setAttendeeCount] = useState("");
  const [eventType, setEventType] =
    useState<(typeof EVENT_TYPES)[number]>("CONFERENCE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [coverImage, setCoverImage] = useState("");
  const [venueImagesInput, setVenueImagesInput] = useState("");
  const [pastEventMediaInput, setPastEventMediaInput] = useState("");

  const [publishMode, setPublishMode] = useState<"draft" | "publish">("publish");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const categories = useMemo(() => splitCommaValues(categoriesInput), [categoriesInput]);
  const targetAudience = useMemo(
    () => splitCommaValues(targetAudienceInput),
    [targetAudienceInput]
  );
  const venueImages = useMemo(
    () => toMediaItems(splitLineValues(venueImagesInput), "Venue Media"),
    [venueImagesInput]
  );
  const pastEventMedia = useMemo(
    () => toMediaItems(splitLineValues(pastEventMediaInput), "Past Event Media"),
    [pastEventMediaInput]
  );

  const today = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

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
      return "At least one category is required.";
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
        targetAudience,
        location: location.trim(),
        budget: Number(budget),
        startDate,
        endDate,
        attendeeCount: Number(attendeeCount),
        eventType,
        coverImage: coverImage.trim(),
        venueImages,
        pastEventMedia,
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
    } catch (err) {
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
            budget, and trust media so the right sponsors can evaluate fit fast.
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
                  Categories
                </label>
                <input
                  value={categoriesInput}
                  onChange={(e) => setCategoriesInput(e.target.value)}
                  placeholder="Tech, College Fest, Sports"
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
                <p className="mt-2 text-xs text-text-muted">
                  Use comma separated values.
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
                  onChange={(e) =>
                    setEventType(e.target.value as (typeof EVENT_TYPES)[number])
                  }
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                >
                  {EVENT_TYPES.map((type) => (
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
            <h2 className="text-xl font-semibold">Media & Trust Proof</h2>
            <div className="mt-6 grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Cover Image URL
                </label>
                <input
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Venue Media URLs
                </label>
                <textarea
                  value={venueImagesInput}
                  onChange={(e) => setVenueImagesInput(e.target.value)}
                  placeholder={"One URL per line\nhttps://...\nhttps://..."}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
                <p className="mt-2 text-xs text-text-muted">
                  Add one image/video URL per line for venue or event space proof.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-light">
                  Past Event Media URLs
                </label>
                <textarea
                  value={pastEventMediaInput}
                  onChange={(e) => setPastEventMediaInput(e.target.value)}
                  placeholder={"One URL per line\nhttps://...\nhttps://..."}
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-dark-layer px-4 py-3 text-text-light outline-none transition focus:border-accent-orange"
                />
                <p className="mt-2 text-xs text-text-muted">
                  Add proof from previous editions to build sponsor trust.
                </p>
              </div>
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