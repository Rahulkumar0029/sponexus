"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminActionButton from "@/app/admin/components/AdminActionButton";
import AdminStepUpNotice from "@/app/admin/components/AdminStepUpNotice";

type UserDetailResponse = {
  success: boolean;
  user?: any;
  sponsorProfile?: any;
  related?: {
    events: any[];
    sponsorships: any[];
    dealsAsOrganizer: any[];
    dealsAsSponsor: any[];
  };
  message?: string;
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      setData({
        success: false,
        message: "Failed to load user detail",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading) {
    return <div className="rounded-3xl border border-white/10 bg-white/5 p-6">Loading user detail...</div>;
  }

  if (!data?.success || !data.user) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
        {data?.message || "Unable to load user detail"}
      </div>
    );
  }

  const user = data.user;

  return (
    <div className="space-y-6">
      <AdminStepUpNotice />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">User Detail</p>
            <h2 className="mt-3 text-3xl font-semibold">{user.name}</h2>
            <p className="mt-2 text-sm text-[#94A3B8]">{user.email}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminActionButton
              endpoint={`/api/admin/users/${id}/suspend`}
              body={{ reason: "Suspended from admin detail page" }}
              label="Suspend User"
              confirmText="Suspend this user?"
              successMessage="User suspended"
              className="border-red-500/20 bg-red-500/10 text-red-200"
              onSuccess={loadData}
            />
            <AdminActionButton
              endpoint={`/api/admin/users/${id}/reactivate`}
              body={{ reason: "Reactivated from admin detail page" }}
              label="Reactivate User"
              confirmText="Reactivate this user?"
              successMessage="User reactivated"
              onSuccess={loadData}
            />
            <AdminActionButton
              endpoint={`/api/admin/users/${id}/revoke-sessions`}
              body={{ reason: "Sessions revoked from admin detail page" }}
              label="Revoke Sessions"
              confirmText="Revoke this user's admin sessions?"
              successMessage="User sessions revoked"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Role" value={user.role} />
        <InfoCard label="Admin Role" value={user.adminRole} />
        <InfoCard label="Account Status" value={user.accountStatus} />
        <InfoCard label="Email Verified" value={user.isEmailVerified ? "Yes" : "No"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Profile Info">
          <Field label="First Name" value={user.firstName} />
          <Field label="Last Name" value={user.lastName} />
          <Field label="Company" value={user.companyName} />
          <Field label="Phone" value={user.phone} />
          <Field label="Organization" value={user.organizationName} />
          <Field label="Event Focus" value={user.eventFocus} />
          <Field label="Target Audience" value={user.organizerTargetAudience} />
          <Field label="Location" value={user.organizerLocation} />
          <Field label="Last Login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-IN") : "Never"} />
        </Panel>

        <Panel title="Risk / Moderation">
          <Field label="Suspended At" value={user.suspendedAt ? new Date(user.suspendedAt).toLocaleString("en-IN") : "-"} />
          <Field label="Suspension Reason" value={user.suspensionReason} />
          <Field label="Created At" value={new Date(user.createdAt).toLocaleString("en-IN")} />
          <Field label="Updated At" value={new Date(user.updatedAt).toLocaleString("en-IN")} />
        </Panel>
      </div>

      <Panel title="Recent Events">
        <SimpleList items={data.related?.events || []} emptyText="No related events" primaryKey="title" secondaryKey="status" />
      </Panel>

      <Panel title="Recent Sponsorships">
        <SimpleList items={data.related?.sponsorships || []} emptyText="No related sponsorships" primaryKey="sponsorshipTitle" secondaryKey="status" />
      </Panel>

      <Panel title="Deals as Organizer">
        <SimpleList items={data.related?.dealsAsOrganizer || []} emptyText="No organizer deals" primaryKey="title" secondaryKey="status" />
      </Panel>

      <Panel title="Deals as Sponsor">
        <SimpleList items={data.related?.dealsAsSponsor || []} emptyText="No sponsor deals" primaryKey="title" secondaryKey="status" />
      </Panel>

      <button
        onClick={() => router.push("/admin/users")}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm"
      >
        Back to Users
      </button>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-[#94A3B8]">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value || "-"}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">{label}</p>
      <p className="mt-1 text-sm text-white/90">{value || "-"}</p>
    </div>
  );
}

function SimpleList({
  items,
  emptyText,
  primaryKey,
  secondaryKey,
}: {
  items: any[];
  emptyText: string;
  primaryKey: string;
  secondaryKey: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-[#94A3B8]">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item._id} className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
          <p className="font-medium text-white">{item[primaryKey] || "Untitled"}</p>
          <p className="mt-1 text-sm text-[#94A3B8]">{item[secondaryKey] || "-"}</p>
        </div>
      ))}
    </div>
  );
}