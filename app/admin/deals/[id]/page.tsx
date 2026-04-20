"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminActionButton from "@/app/admin/components/AdminActionButton";
import AdminStepUpNotice from "@/app/admin/components/AdminStepUpNotice";

export default function AdminDealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/deals/${id}`, { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ success: false, message: "Failed to load deal detail" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading) return <div className="rounded-3xl border border-white/10 bg-white/5 p-6">Loading deal detail...</div>;
  if (!data?.success || !data.deal) return <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">{data?.message || "Unable to load deal detail"}</div>;

  const deal = data.deal;

  return (
    <div className="space-y-6">
      <AdminStepUpNotice />

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[#94A3B8]">Deal Detail</p>
            <h2 className="mt-3 text-3xl font-semibold">{deal.title || "Untitled deal"}</h2>
            <p className="mt-2 text-sm text-[#94A3B8]">{deal.status} • {deal.paymentStatus}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <AdminActionButton
              endpoint={`/api/admin/deals/${id}/freeze`}
              body={{ reason: "Frozen from admin deal detail page" }}
              label="Freeze Deal"
              confirmText="Freeze this deal?"
              successMessage="Deal frozen"
              className="border-red-500/20 bg-red-500/10 text-red-200"
              onSuccess={loadData}
            />
            <AdminActionButton
              endpoint={`/api/admin/deals/${id}/resolve`}
              body={{ reason: "Resolved from admin deal detail page", internalNotes: "Resolved by admin from detail page", keepFrozen: false }}
              label="Resolve Deal"
              confirmText="Resolve this deal?"
              successMessage="Deal resolved"
              onSuccess={loadData}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard label="Status" value={deal.status} />
        <InfoCard label="Payment" value={deal.paymentStatus} />
        <InfoCard label="Frozen" value={deal.isFrozen ? "Yes" : "No"} />
        <InfoCard label="Admin Review" value={deal.adminReviewStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Deal Financials">
          <Field label="Proposed Amount" value={`₹${Number(deal.proposedAmount || 0).toLocaleString("en-IN")}`} />
          <Field label="Final Amount" value={`₹${Number(deal.finalAmount || 0).toLocaleString("en-IN")}`} />
          <Field label="Accepted At" value={deal.acceptedAt ? new Date(deal.acceptedAt).toLocaleString("en-IN") : "-"} />
          <Field label="Completed At" value={deal.completedAt ? new Date(deal.completedAt).toLocaleString("en-IN") : "-"} />
        </Panel>

        <Panel title="Admin Control">
          <Field label="Freeze Reason" value={deal.freezeReason} />
          <Field label="Internal Notes" value={deal.internalNotes} />
          <Field label="Resolved At" value={deal.resolvedAt ? new Date(deal.resolvedAt).toLocaleString("en-IN") : "-"} />
          <Field label="Dispute Reason" value={deal.disputeReason} />
        </Panel>
      </div>

      <Panel title="Description">
        <p className="text-sm text-white/90 whitespace-pre-wrap">{deal.description || "-"}</p>
      </Panel>

      <Panel title="Related Entities">
        <div className="grid gap-4 lg:grid-cols-3">
          <RelatedCard title="Organizer" data={data.related?.organizer} />
          <RelatedCard title="Sponsor" data={data.related?.sponsor} />
          <RelatedCard title="Event" data={data.related?.event} />
        </div>
      </Panel>

      <button onClick={() => router.push("/admin/deals")} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
        Back to Deals
      </button>
    </div>
  );
}

function RelatedCard({ title, data }: { title: string; data: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07152F]/70 p-4">
      <p className="text-sm font-semibold">{title}</p>
      {!data ? (
        <p className="mt-2 text-sm text-[#94A3B8]">No data</p>
      ) : (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-[#CBD5E1]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
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