"use client";

export default function AdminStepUpNotice() {
  return (
    <div className="rounded-2xl border border-[#FF7A18]/20 bg-[#FF7A18]/10 p-4 text-sm text-[#FFB347]">
      Sensitive admin actions require active step-up verification. If an action
      fails with a verification message, re-complete admin login or refresh your
      secure admin session flow.
    </div>
  );
}