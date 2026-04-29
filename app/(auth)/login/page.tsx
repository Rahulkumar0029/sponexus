import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login",
  description:
    "Login to your Sponexus account to manage events, sponsorships, and deals.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-dark-base px-4 text-text-light">
          Loading login...
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}