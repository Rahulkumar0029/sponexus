"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Event } from "@/types/event";

interface EventCardProps {
  event: Event;
  matchScore?: number;
}

type EventMedia = {
  url?: string;
  type?: "image" | "video";
  title?: string;
};

function getStatusBadgeClasses(status?: string) {
  switch ((status || "").toUpperCase()) {
    case "PUBLISHED":
      return "border border-[#FF7A18]/30 bg-[#FF7A18]/10 text-[#FFB347]";
    case "ONGOING":
      return "border border-[#FFB347]/30 bg-[#FFB347]/10 text-[#FFB347]";
    case "DRAFT":
      return "border border-white/10 bg-white/5 text-[#94A3B8]";
    case "COMPLETED":
      return "border border-white/10 bg-white/5 text-white";
    case "CANCELLED":
      return "border border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border border-white/10 bg-white/5 text-[#94A3B8]";
  }
}

function getStatusLabel(status?: string) {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function EventCard({ event, matchScore }: EventCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  const formattedDate = event.startDate
    ? new Date(event.startDate).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date not set";

  const categories = Array.isArray(event.categories) ? event.categories : [];

  const formattedBudget =
    typeof event.budget === "number" && event.budget > 0
      ? `₹${event.budget.toLocaleString("en-IN")}`
      : "Not specified";

  const formattedAttendees =
    typeof event.attendeeCount === "number" && event.attendeeCount > 0
      ? event.attendeeCount.toLocaleString("en-IN")
      : "N/A";

  const coverImage =
    typeof event.coverImage === "string" && event.coverImage.trim()
      ? event.coverImage.trim()
      : "";

  const venueImages = Array.isArray((event as any).venueImages)
    ? ((event as any).venueImages as EventMedia[])
    : [];

  const pastEventMedia = Array.isArray((event as any).pastEventMedia)
    ? ((event as any).pastEventMedia as EventMedia[])
    : [];

  const galleryImages = [
  coverImage,
  ...venueImages
    .filter((item) => item?.type !== "video" && item?.url)
    .map((item) => item.url || ""),
  ...pastEventMedia
    .filter((item) => item?.type !== "video" && item?.url)
    .map((item) => item.url || ""),
].filter((url, index, array) => Boolean(url) && array.indexOf(url) === index);

  const activeImage = galleryImages[activeImageIndex] || "";

  const eventTypeLabel =
    typeof event.eventType === "string" && event.eventType.trim()
      ? event.eventType
      : "Event";

  const eventStatus =
    typeof event.status === "string" && event.status.trim()
      ? event.status
      : "";

  const showPreviousImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setActiveImageIndex((prev) =>
      prev === 0 ? galleryImages.length - 1 : prev - 1
    );
  };

  const showNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setActiveImageIndex((prev) =>
      prev === galleryImages.length - 1 ? 0 : prev + 1
    );
  };

  const openPreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewOpen(true);
  };

  const closePreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewOpen(false);
  };

  return (
    <>
      <Link href={`/events/${event._id}`} className="block h-full">
        <article className="group relative flex h-full cursor-pointer flex-col rounded-2xl border border-white/10 bg-white/[0.05] p-5 transition-all duration-300 hover:border-accent-orange/40 hover:shadow-[0_0_25px_rgba(255,122,24,0.12)]">
          <div className="absolute right-4 top-4 z-10 flex flex-wrap items-center justify-end gap-2">
            {eventStatus ? (
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
                  eventStatus
                )}`}
              >
                {getStatusLabel(eventStatus)}
              </span>
            ) : null}

            {matchScore != null && (
              <div className="rounded-full bg-accent-orange/90 px-3 py-1 text-sm font-bold text-dark-base">
                {matchScore}% Match
              </div>
            )}
          </div>

          {activeImage ? (
            <div
  onClick={openPreview}
  role="button"
  tabIndex={0}
  className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#07152F]"
>
              <Image
                src={activeImage}
                alt={event.title || "Event cover image"}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 400px"
              />

              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={showPreviousImage}
                   className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-sm text-white backdrop-blur-sm transition opacity-0 group-hover:opacity-100 hover:bg-accent-orange hover:text-black"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={showNextImage}
                    className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-sm text-white backdrop-blur-sm transition opacity-0 group-hover:opacity-100 hover:bg-accent-orange hover:text-black"
                  >
                    ›
                  </button>

                  <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                    {galleryImages.map((image, index) => (
                      <span
                        key={`${image}-${index}`}
                        className={`h-1.5 rounded-full transition-all ${
  index === activeImageIndex
    ? "w-6 bg-accent-orange shadow-[0_0_12px_rgba(255,122,24,0.8)]"
    : "w-1.5 bg-white/40"
}`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="relative mb-4 flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-dark-layer text-sm text-text-muted">
              No cover image
            </div>
          )}

          <div className="flex flex-1 flex-col space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 flex-1 pr-2 text-lg font-semibold text-text-light transition group-hover:text-accent-orange">
                {event.title || "Untitled Event"}
              </h3>

              <span className="whitespace-nowrap rounded-full bg-accent-orange/10 px-3 py-1 text-xs font-medium text-accent-orange">
                {eventTypeLabel}
              </span>
            </div>

            <p className="line-clamp-2 flex-1 text-sm text-text-muted">
              {event.description || "No description available."}
            </p>

            <div className="flex flex-wrap gap-2">
              {categories.length > 0 ? (
                <>
                  {categories.slice(0, 2).map((cat) => (
                    <span
                      key={cat}
                      className="rounded-md bg-white/5 px-2 py-1 text-xs text-text-muted"
                    >
                      {cat}
                    </span>
                  ))}
                  {categories.length > 2 && (
                    <span className="text-xs text-text-muted">
                      +{categories.length - 2}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-text-muted">No categories added</span>
              )}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-4 border-t border-white/10 pt-3 text-sm">
              <div>
                <p className="text-xs text-text-muted">Date</p>
                <p className="font-medium text-text-light">{formattedDate}</p>
              </div>

              <div>
                <p className="text-xs text-text-muted">Budget</p>
                <p className="font-bold text-accent-orange">{formattedBudget}</p>
              </div>

              <div className="col-span-2">
                <p className="text-xs text-text-muted">Location • Attendees</p>
                <p className="font-medium text-text-light">
                  {event.location || "Location not specified"} • 👥{" "}
                  {formattedAttendees}
                </p>
              </div>
            </div>
          </div>
        </article>
      </Link>

      {previewOpen && activeImage ? (
        <div
          onClick={closePreview}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
        >
          <div className="relative h-[80vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-dark-layer">
            <Image
              src={activeImage}
              alt={event.title || "Event image preview"}
              fill
              className="object-contain"
              sizes="100vw"
            />

{galleryImages.length > 1 ? (
  <>
    <button
      type="button"
      onClick={showPreviousImage}
      className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-2xl font-bold text-white backdrop-blur transition hover:bg-black/80"
    >
      ‹
    </button>

    <button
      type="button"
      onClick={showNextImage}
      className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-2xl font-bold text-white backdrop-blur transition hover:bg-black/80"
    >
      ›
    </button>
  </>
) : null}

            <button
              type="button"
              onClick={closePreview}
              className="absolute right-4 top-4 z-20 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}