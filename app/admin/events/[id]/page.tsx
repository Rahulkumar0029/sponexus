"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminActionButton from "@/app/admin/components/AdminActionButton";
import AdminStepUpNotice from "@/app/admin/components/AdminStepUpNotice";

export default function AdminEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${id}`, { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ success: false, message: "Failed to load event detail" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading) return <div className="rounded-3xl border border-white/10 bg-white/5 p-6">Loading event detail...</div>;
  if (!data?.success || !data.event) return <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">{data?.message || "Unable to load event detail"}</div>;

  const event = data.event;

  return (
    <div className="space-y-6">
      <AdminStepUpNotice />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">Event Detail</p>
            <h2 className="mt-3 text-3xl font-semibold">{event.title}</h2>
            <p className="mt-2 text-sm text-[#94A3B8]">{event.location}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminActionButton
              endpoint={`/api/admin/events/${id}/hide`}
              body={{ reason: "Hidden from admin event detail page", moderationStatus: "FLAGGED" }}
              label="Hide Event"
              confirmText="Hide this event?"
              successMessage="Event hidden"
              className="border-red-500/20 bg-red-500/10 text-red-200"
              onSuccess={loadData}
            />
            <AdminActionButton
              endpoint={`/api/admin/events/${id}/restore`}
              body={{ reason: "Restored from admin event detail page" }}
              label="Restore Event"
              confirmText="Restore this event?"
              successMessage="Event restored"
              onSuccess={loadData}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Lifecycle" value={event.status} />
        <InfoCard label="Visibility" value={event.visibilityStatus} />
        <InfoCard label="Moderation" value={event.moderationStatus} />
        <InfoCard label="Budget" value={`₹${Number(event.budget || 0).toLocaleString("en-IN")}`} />
      </div>

      <Panel title="Event Overview">
        <Field label="Type" value={event.eventType} />
        <Field label="Location" value={event.location} />
        <Field label="Audience" value={String(event.attendeeCount || 0)} />
        <Field label="Start Date" value={event.startDate ? new Date(event.startDate).toLocaleString("en-IN") : "-"} />
        <Field label="End Date" value={event.endDate ? new Date(event.endDate).toLocaleString("en-IN") : "-"} />
        <Field label="Hidden Reason" value={event.hiddenReason} />
        <Field label="Flag Reason" value={event.flagReason} />
      </Panel>

      <Panel title="Description">
        <p className="text-sm text-white/90 whitespace-pre-wrap">{event.description || "-"}</p>
      </Panel>

      <Panel title="Related Deals">
        {!data.relatedDeals?.length ? (
          <p className="text-sm text-[#94A3B8]">No related deals found</p>
        ) : (
          <div className="space-y-3">
            {data.relatedDeals.map((deal: any) => (
              <div key={deal._id} className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
                <p className="font-medium">{deal.title || "Untitled deal"}</p>
                <p className="mt-1 text-sm text-[#94A3B8]">
                  {deal.status} • {deal.paymentStatus}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <button onClick={() => router.push("/admin/events")} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
        Back to Events
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