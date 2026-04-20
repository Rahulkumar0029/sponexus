import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Login to your Sponexus account to manage events, sponsorships, and deals.",
};

export default function LoginPage() {
  return <LoginClient />;
}