import type { Metadata } from "next";
import EventsClient from "./EventsClient";

export const metadata: Metadata = {
  title: "Browse Events | Sponexus",
  description:
    "Discover events looking for sponsors. Find the right partnership opportunities on Sponexus.",
};

export default function EventsPage() {
  return <EventsClient />;
}