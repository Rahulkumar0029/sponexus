"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminActionButton from "@/app/admin/components/AdminActionButton";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  adminRole: string;
  accountStatus: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone?: string;
  organizationName?: string;
  isEmailVerified: boolean;
  isProfileComplete: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
};

type UsersResponse = {
  success: boolean;
  users?: AdminUser[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (role) params.set("role", role);
    if (accountStatus) params.set("accountStatus", accountStatus);
    params.set("page", "1");
    params.set("limit", "20");
    return params.toString();
  }, [query, role, accountStatus]);

  const loadUsers = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?${searchParams}`, {
        cache: "no-store",
        signal,
      });
      const json = await res.json();
      setData(json);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setData({
          success: false,
          message: "Failed to load users",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadUsers(controller.signal);
    return () => controller.abort();
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">
          User Control
        </p>
        <h2 className="mt-3 text-3xl font-semibold">Admin Users</h2>
        <p className="mt-2 text-sm text-[#94A3B8]">
          Search, filter, review, suspend, reactivate, and inspect user accounts.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none placeholder:text-[#94A3B8] focus:border-[#FF7A18]/50"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A18]/50"
          >
            <option value="">All Roles</option>
            <option value="ORGANIZER">Organizer</option>
            <option value="SPONSOR">Sponsor</option>
          </select>

          <select
            value={accountStatus}
            onChange={(e) => setAccountStatus(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#07152F] px-4 py-3 text-sm text-white outline-none focus:border-[#FF7A18]/50"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DISABLED">Disabled</option>
            <option value="PENDING_REVIEW">Pending Review</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          Loading users...
        </div>
      ) : !data?.success ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-200">
          {data?.message || "Unable to load users"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-[#94A3B8]">
                <tr>
                  <th className="px-4 py-4 font-medium">User</th>
                  <th className="px-4 py-4 font-medium">Role</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Verified</th>
                  <th className="px-4 py-4 font-medium">Last Login</th>
                  <th className="px-4 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data.users || []).map((user) => (
                  <tr key={user._id} className="border-t border-white/10 align-top">
                    <td className="px-4 py-4">
                      <Link href={`/admin/users/${user._id}`} className="block">
                        <div className="font-medium text-white hover:text-[#FFB347]">
                          {user.name}
                        </div>
                        <div className="mt-1 text-xs text-[#94A3B8]">{user.email}</div>
                        {(user.companyName || user.organizationName) && (
                          <div className="mt-1 text-xs text-[#94A3B8]">
                            {user.companyName || user.organizationName}
                          </div>
                        )}
                      </Link>
                    </td>

                    <td className="px-4 py-4 text-white/90">
                      <div>{user.role}</div>
                      <div className="mt-1 text-xs text-[#94A3B8]">{user.adminRole}</div>
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/90">
                        {user.accountStatus}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-white/90">
                      {user.isEmailVerified ? "Email verified" : "Not verified"}
                    </td>

                    <td className="px-4 py-4 text-white/90">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString("en-IN")
                        : "Never"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {user.accountStatus !== "SUSPENDED" ? (
                          <AdminActionButton
                            endpoint={`/api/admin/users/${user._id}/suspend`}
                            body={{ reason: "Suspended from users list" }}
                            label="Suspend"
                            confirmText="Suspend this user?"
                            successMessage="User suspended"
                            className="border-red-500/20 bg-red-500/10 text-red-200"
                            onSuccess={() => loadUsers()}
                          />
                        ) : (
                          <AdminActionButton
                            endpoint={`/api/admin/users/${user._id}/reactivate`}
                            body={{ reason: "Reactivated from users list" }}
                            label="Reactivate"
                            confirmText="Reactivate this user?"
                            successMessage="User reactivated"
                            onSuccess={() => loadUsers()}
                          />
                        )}

                        <Link
                          href={`/admin/users/${user._id}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/10"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-white/10 px-4 py-4 text-sm text-[#94A3B8]">
            Total users: {data.pagination?.total ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}