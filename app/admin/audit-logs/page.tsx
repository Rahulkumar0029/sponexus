"use client";

import { useEffect, useMemo, useState } from "react";

type AuditLog = {
  _id: string;
  actorUserId: string;
  actorAdminRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type AuditResponse = {
  success: boolean;
  logs?: AuditLog[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

export default function AdminAuditLogsPage() {
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "20");
    if (action) params.set("action", action);
    if (targetType) params.set("targetType", targetType);
    return params.toString();
  }, [action, targetType]);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const res = await fetch(`/api/admin/audit-logs?${searchParams}`, {
          cache: "no-store",
        });
        const json = await res.json();
        setData(json);
      } catch {
        setData({
          success: false,
          message: "Failed to load audit logs",
        });
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">
          Audit Trail
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Admin Audit Logs</h2>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Filter admin actions by target type and inspect what happened.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filter by action name..."
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/50"
          />

          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A18]/50"
          >
            <option value="">All Target Types</option>
            <option value="USER">USER</option>
            <option value="EVENT">EVENT</option>
            <option value="SPONSOR_PROFILE">SPONSOR_PROFILE</option>
            <option value="SPONSORSHIP">SPONSORSHIP</option>
            <option value="DEAL">DEAL</option>
            <option value="ADMIN_SESSION">ADMIN_SESSION</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          Loading audit logs...
        </div>
      ) : !data?.success ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          {data?.message || "Unable to load audit logs"}
        </div>
      ) : (
        <div className="space-y-4">
          {(data.logs || []).map((log) => (
            <div
              key={log._id}
              className="rounded-3xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-base font-semibold text-white">{log.action}</p>
                  <p className="mt-1 text-sm text-[#94A3B8]">
                    {log.targetType}
                    {log.targetId ? ` • ${log.targetId}` : ""}
                  </p>
                </div>

                <div className="text-sm text-[#94A3B8]">
                  {new Date(log.createdAt).toLocaleString("en-IN")}
                </div>
              </div>

              {log.reason ? (
                <p className="mt-3 text-sm text-white/90">{log.reason}</p>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">
                    Actor
                  </p>
                  <p className="mt-2 text-sm text-white/90">{log.actorUserId}</p>
                  <p className="mt-1 text-xs text-[#94A3B8]">{log.actorAdminRole}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">
                    Request Context
                  </p>
                  <p className="mt-2 text-sm text-white/90">{log.ipAddress || "No IP"}</p>
                  <p className="mt-1 break-all text-xs text-[#94A3B8]">
                    {log.userAgent || "No user agent"}
                  </p>
                </div>
              </div>

              {log.metadata ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-[#07152F]/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">
                    Metadata
                  </p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-[#CBD5E1]">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ))}

          <div className="text-sm text-[#94A3B8]">
            Total logs: {data.pagination?.total ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}