"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminActionButton from "@/app/admin/components/AdminActionButton";
import AdminStepUpNotice from "@/app/admin/components/AdminStepUpNotice";

export default function AdminSponsorshipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sponsorships/${id}`, { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ success: false, message: "Failed to load sponsorship detail" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading) return <div className="rounded-3xl border border-white/10 bg-white/5 p-6">Loading sponsorship detail...</div>;
  if (!data?.success || !data.sponsorship) return <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">{data?.message || "Unable to load sponsorship detail"}</div>;

  const item = data.sponsorship;

  return (
    <div className="space-y-6">
      <AdminStepUpNotice />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">Sponsorship Detail</p>
            <h2 className="mt-3 text-3xl font-semibold">{item.sponsorshipTitle}</h2>
            <p className="mt-2 text-sm text-[#94A3B8]">{item.category} • {item.city || "No city"}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminActionButton
              endpoint={`/api/admin/sponsorships/${id}/hide`}
              body={{ reason: "Hidden from admin sponsorship detail page", moderationStatus: "FLAGGED" }}
              label="Hide Sponsorship"
              confirmText="Hide this sponsorship?"
              successMessage="Sponsorship hidden"
              className="border-red-500/20 bg-red-500/10 text-red-200"
              onSuccess={loadData}
            />
            <AdminActionButton
              endpoint={`/api/admin/sponsorships/${id}/restore`}
              body={{ reason: "Restored from admin sponsorship detail page" }}
              label="Restore Sponsorship"
              confirmText="Restore this sponsorship?"
              successMessage="Sponsorship restored"
              onSuccess={loadData}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Lifecycle" value={item.status} />
        <InfoCard label="Visibility" value={item.visibilityStatus} />
        <InfoCard label="Moderation" value={item.moderationStatus} />
        <InfoCard label="Budget" value={`₹${Number(item.budget || 0).toLocaleString("en-IN")}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Offer Details">
          <Field label="Type" value={item.sponsorshipType} />
          <Field label="Category" value={item.category} />
          <Field label="City" value={item.city} />
          <Field label="Location Preference" value={item.locationPreference} />
          <Field label="Campaign Goal" value={item.campaignGoal} />
          <Field label="Expires At" value={item.expiresAt ? new Date(item.expiresAt).toLocaleString("en-IN") : "-"} />
        </Panel>

        <Panel title="Contact & Moderation">
          <Field label="Contact Person" value={item.contactPersonName} />
          <Field label="Contact Phone" value={item.contactPhone} />
          <Field label="Flag Reason" value={item.flagReason} />
          <Field label="Admin Notes" value={item.adminNotes} />
        </Panel>
      </div>

      <Panel title="Custom Message">
        <p className="text-sm text-white/90 whitespace-pre-wrap">{item.customMessage || "-"}</p>
      </Panel>

      <Panel title="Related Deals">
        {!data.relatedDeals?.length ? (
          <p className="text-sm text-[#94A3B8]">No related deals found</p>
        ) : (
          <div className="space-y-3">
            {data.relatedDeals.map((deal: any) => (
              <div key={deal._id} className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
                <p className="font-medium">{deal.title || "Untitled deal"}</p>
                <p className="mt-1 text-sm text-[#94A3B8]">{deal.status} • {deal.paymentStatus}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <button onClick={() => router.push("/admin/sponsorships")} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
        Back to Sponsorships
      </button>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl border border-white/10 bg-white/5 p-5"><p className="text-sm text-[#94A3B8]">{label}</p><p className="mt-2 text-lg font-semibold">{value || "-"}</p></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-3xl border border-white/10 bg-white/5 p-6"><h3 className="text-lg font-semibold">{title}</h3><div className="mt-4 space-y-3">{children}</div></div>;
}
function Field({ label, value }: { label: string; value?: string }) {
  return <div><p className="text-xs uppercase tracking-[0.2em] text-[#94A3B8]">{label}</p><p className="mt-1 text-sm text-white/90">{value || "-"}</p></div>;
}