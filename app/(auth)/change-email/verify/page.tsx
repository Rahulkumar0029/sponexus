"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token");

  const [message, setMessage] = useState("Verifying...");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid verification link");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/change-email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Verification failed");
        } else {
          setMessage("Email updated successfully");

          setTimeout(() => {
            router.push("/settings");
          }, 2000);
        }
      } catch {
        setError("Something went wrong");
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-text-light bg-dark-base">
      <div className="text-center">
        {error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <p className="text-green-400">{message}</p>
        )}
      </div>
    </div>
  );
}