"use client";

import { useEffect, useState } from "react";
import AdminActionButton from "@/app/admin/components/AdminActionButton";

type SessionItem = {
  _id: string;
  ipAddress: string;
  userAgent: string;
  isStepUpVerified: boolean;
  lastStepUpAt?: string | null;
  lastActiveAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  revokeReason?: string;
  createdAt: string;
};

type SessionsResponse = {
  success: boolean;
  sessions?: SessionItem[];
  message?: string;
};

export default function AdminSecurityPage() {
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sessions", {
        cache: "no-store",
      });
      const json = await res.json();
      setData(json);
    } catch {
      setData({
        success: false,
        message: "Failed to load admin sessions",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">
          Admin Security
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Security Center</h2>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Review admin session activity, step-up state, and revoke stale secure
          sessions when needed.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SecurityCard
          title="Admin OTP Login"
          desc="Password + OTP flow is enabled through admin auth routes."
        />
        <SecurityCard
          title="Admin Session Control"
          desc="Dedicated admin sessions are separate from normal user sessions."
        />
        <SecurityCard
          title="Step-up Verification"
          desc="Sensitive actions require step-up verification before execution."
        />
        <SecurityCard
          title="Audit Logging"
          desc="Each sensitive admin action is written to the audit system."
        />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-semibold">My Admin Sessions</h3>

        {loading ? (
          <p className="mt-4 text-sm text-[#94A3B8]">Loading sessions...</p>
        ) : !data?.success ? (
          <p className="mt-4 text-sm text-red-200">
            {data?.message || "Unable to load sessions"}
          </p>
        ) : !(data.sessions || []).length ? (
          <p className="mt-4 text-sm text-[#94A3B8]">No admin sessions found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {(data.sessions || []).map((session) => (
              <div
                key={session._id}
                className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-white">
                      Session {session._id}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      IP: {session.ipAddress || "Unknown"}
                    </p>
                    <p className="break-all text-xs text-[#94A3B8]">
                      User Agent: {session.userAgent || "Unknown"}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      Created: {new Date(session.createdAt).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      Last Active: {new Date(session.lastActiveAt).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      Expires: {new Date(session.expiresAt).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      Step-up Verified: {session.isStepUpVerified ? "Yes" : "No"}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      Last Step-up:{" "}
                      {session.lastStepUpAt
                        ? new Date(session.lastStepUpAt).toLocaleString("en-IN")
                        : "Never"}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      Revoked:{" "}
                      {session.revokedAt
                        ? new Date(session.revokedAt).toLocaleString("en-IN")
                        : "No"}
                    </p>
                  </div>

                  {!session.revokedAt ? (
                    <AdminActionButton
                      endpoint="/api/admin/sessions"
                      method="PATCH"
                      body={{
                        sessionId: session._id,
                        reason: "Revoked from admin security page",
                      }}
                      label="Revoke Session"
                      confirmText="Revoke this admin session?"
                      successMessage="Admin session revoked"
                      className="border-red-500/20 bg-red-500/10 text-red-200"
                      onSuccess={loadSessions}
                    />
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#94A3B8]">
                      Revoked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SecurityCard({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-2 text-sm text-[#94A3B8]">{desc}</p>
    </div>
  );
}