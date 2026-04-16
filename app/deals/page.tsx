'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { DealItem, DealStatus } from '@/types/deal';

const sectionOrder: { key: string; title: string; statuses: DealStatus[] }[] = [
  { key: 'pending', title: 'Pending Requests', statuses: ['pending'] },
  { key: 'active', title: 'Active Deals', statuses: ['connected', 'negotiating'] },
  { key: 'completed', title: 'Completed Deals', statuses: ['completed'] },
  { key: 'closed', title: 'Cancelled / Rejected', statuses: ['cancelled', 'rejected'] },
  { key: 'disputed', title: 'Disputed Deals', statuses: ['disputed'] },
];

function statusClass(status: DealStatus) {
  if (status === 'connected' || status === 'completed') return 'bg-green-500/20 text-green-300';
  if (status === 'negotiating') return 'bg-blue-500/20 text-blue-300';
  if (status === 'pending') return 'bg-amber-500/20 text-amber-300';
  if (status === 'disputed') return 'bg-red-500/20 text-red-300';
  return 'bg-white/10 text-text-muted';
}

export default function DealsPage() {
  const { user, loading: authLoading } = useAuth();
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');

  const loadDeals = async () => {
    if (!user?._id || !user.role) return;

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`/api/deals?userId=${user._id}&role=${user.role}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load deals');
      }

      setDeals(data.deals || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    loadDeals();
  }, [authLoading, user?._id]);

  const grouped = useMemo(() => {
    const bySection: Record<string, DealItem[]> = {};
    sectionOrder.forEach((section) => {
      bySection[section.key] = deals.filter((deal) => section.statuses.includes(deal.status));
    });
    return bySection;
  }, [deals]);

  const updateStatus = async (dealId: string, status: DealStatus) => {
    if (!user?._id || !user.role) return;

    try {
      setActionLoadingId(dealId + status);
      const res = await fetch(`/api/deals/${dealId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, actorId: user._id, actorRole: user.role }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update status');

      await loadDeals();
    } catch (err: any) {
      setError(err?.message || 'Failed to update deal');
    } finally {
      setActionLoadingId('');
    }
  };

  const reportDispute = async (dealId: string) => {
    if (!user?._id || !user.role) return;
    const reason = window.prompt('Describe the issue briefly:');
    if (!reason?.trim()) return;

    try {
      setActionLoadingId(dealId + 'dispute');
      const res = await fetch(`/api/deals/${dealId}/dispute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, actorId: user._id, actorRole: user.role }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to report dispute');
      await loadDeals();
    } catch (err: any) {
      setError(err?.message || 'Failed to report dispute');
    } finally {
      setActionLoadingId('');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container-custom py-12">
        <h1 className="text-3xl font-bold text-white">Deals</h1>
        <div className="mt-6 grid gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container-custom px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Deals</h1>
          <p className="mt-2 text-text-muted">
            Controlled connection flow. Contact details unlock only after acceptance.
          </p>
        </div>
        <Link href={user.role === 'SPONSOR' ? '/sponsorships/create' : '/events/create'}>
          <Button>Start New Opportunity</Button>
        </Link>
      </div>

      {error && <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-300">{error}</div>}

      {deals.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h2 className="text-xl font-semibold text-white">No deals yet</h2>
          <p className="mt-2 text-text-muted">Send interest from match results to start your first deal.</p>
          <div className="mt-5 flex justify-center">
            <Link href="/match"><Button variant="secondary">Go to Matches</Button></Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {sectionOrder.map((section) => {
            const items = grouped[section.key] || [];
            if (items.length === 0) return null;

            return (
              <section key={section.key}>
                <h2 className="mb-4 text-xl font-semibold text-white">{section.title}</h2>
                <div className="grid gap-4">
                  {items.map((deal) => (
                    <article key={deal._id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {deal.eventTitle} ↔ {deal.sponsorshipTitle}
                          </h3>
                          <p className="mt-1 text-sm text-text-muted">Counterparty: {deal.counterpartyName}</p>
                          <p className="mt-1 text-sm text-text-muted">
                            Proposed Amount: ₹{deal.proposedAmount.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(deal.status)}`}>
                          {deal.status}
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
                        {deal.canViewContact ? (
                          <div className="flex flex-col gap-1 text-text-light">
                            <span>Contact Name: {deal.counterpartyContact?.name || '-'}</span>
                            <span>Phone: {deal.counterpartyContact?.phone || '-'}</span>
                            <span>Email: {deal.counterpartyContact?.email || '-'}</span>
                          </div>
                        ) : (
                          <p className="text-text-muted">Contact is locked until deal is accepted by both parties.</p>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {deal.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateStatus(deal._id, 'connected')}
                              loading={actionLoadingId === deal._id + 'connected'}
                            >
                              Accept & Reveal Contact
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateStatus(deal._id, 'rejected')}
                              loading={actionLoadingId === deal._id + 'rejected'}
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {['connected', 'negotiating'].includes(deal.status) && (
                          <>
                            {deal.status === 'connected' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => updateStatus(deal._id, 'negotiating')}
                                loading={actionLoadingId === deal._id + 'negotiating'}
                              >
                                Mark Negotiating
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => updateStatus(deal._id, 'completed')}
                              loading={actionLoadingId === deal._id + 'completed'}
                            >
                              Mark Completed
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateStatus(deal._id, 'cancelled')}
                              loading={actionLoadingId === deal._id + 'cancelled'}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => reportDispute(deal._id)}
                              loading={actionLoadingId === deal._id + 'dispute'}
                            >
                              Report Issue
                            </Button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
