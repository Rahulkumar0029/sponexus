import { Suspense } from "react";
import AdminVerifyClient from "./AdminVerifyClient";

export default function FounderVerifyPage() {
  return (
    <div className="min-h-screen bg-[#020617] px-4 py-10 text-white">
      <div className="mx-auto max-w-md">
        <Suspense
          fallback={
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              Loading OTP verification...
            </div>
          }
        >
          <AdminVerifyClient />
        </Suspense>
      </div>
    </div>
  );
}