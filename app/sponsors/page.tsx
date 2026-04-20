import type { Metadata } from "next";
import SponsorsClient from "./SponsorsClient";

export const metadata: Metadata = {
  title: "Explore Sponsors | Sponexus",
  description:
    "Discover sponsor profiles, explore brand fit, and connect with the right partners for your events on Sponexus.",
};

export default function SponsorsPage() {
  return <SponsorsClient />;
}