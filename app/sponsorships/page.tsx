import type { Metadata } from "next";
import SponsorshipsClient from "./SponsorshipsClient";

export const metadata: Metadata = {
  title: "Sponsorship Opportunities | Sponexus",
  description:
    "Explore sponsorship listings and connect with event organizers for impactful brand collaborations.",
};

export default function SponsorshipsPage() {
  return <SponsorshipsClient />;
}