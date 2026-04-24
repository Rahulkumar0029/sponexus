'use client';

import { useEffect, useState } from 'react';
import PaymentAccessGate from '@/components/admin/payments/PaymentAccessGate';

type SecurityEvent = {
  _id: string;
  userId?: string | null;
  actorId?: string | null;
  paymentId?: string | null;
  subscriptionId?: string | null;
  couponId?: string | null;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  route?: string | null;
  method?: string | null;
  fingerprint?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  resolved?: boolean;
  metadata?: any;
};

type FraudFlag = {
  _id: string;
  userId?: string | null;
  paymentId?: string | null;
  subscriptionId?: string | null;
  couponId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'RESOLVED';
  score?: number | null;
  signals?: string[];
  ipAddress?: string | null;
  fingerprint?: string | null;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

function severityColor(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return 'text-red-400 border-red-500/30 bg-red-500/10';
    case 'HIGH':
      return 'text-[#FF7A18] border-[#FF7A18]/30 bg-[#FF7A18]/10';
    case 'MEDIUM':
      return 'text-[#FFB347] border-[#FFB347]/30 bg-[#FFB347]/10';
    default:
      return 'text-[#94A3B8] border-white/10 bg-white/5';
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString();
}

export default function PaymentSecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function fetchSecurityData() {
    try {
      setLoading(true);
      setError('');

      const [eventsRes, flagsRes] = await Promise.all([
        fetch('/api/admin/security/events?limit=20', { cache: 'no-store' }),
        fetch('/api/admin/security/flags?limit=20', { cache: 'no-store' }),
      ]);

      const eventsJson = await eventsRes.json();
      const flagsJson = await flagsRes.json();

      if (!eventsRes.ok || !eventsJson.success) {
        throw new Error(eventsJson.message || 'Failed to load security events.');
      }

      if (!flagsRes.ok || !flagsJson.success) {
        throw new Error(flagsJson.message || 'Failed to load fraud flags.');
      }

      setEvents(Array.isArray(eventsJson.data) ? eventsJson.data : []);
      setFlags(Array.isArray(flagsJson.data) ? flagsJson.data : []);
    } catch (e: any) {
      console.error('Security fetch error', e);
      setError(e?.message || 'Failed to load security dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSecurityData();
  }, []);

  async function resolveFlag(flagId: string) {
    try {
      setActionLoading(`resolve-${flagId}`);
      setError('');

      const res = await fetch('/api/admin/security/flags/resolve', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to resolve fraud flag.');
      }

      await fetchSecurityData();
    } catch (e: any) {
      console.error('Resolve error', e);
      setError(e?.message || 'Failed to resolve fraud flag.');
    } finally {
      setActionLoading(null);
    }
  }

  async function blockUser(userId: string) {
    try {
      setActionLoading(`block-user-${userId}`);
      setError('');

      const res = await fetch('/api/admin/security/block-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          reason: 'Blocked from payment security dashboard by super admin.',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to block user.');
      }

      await fetchSecurityData();
    } catch (e: any) {
      console.error('Block user error', e);
      setError(e?.message || 'Failed to block user.');
    } finally {
      setActionLoading(null);
    }
  }

  async function freezePayment(paymentId: string) {
    try {
      setActionLoading(`freeze-payment-${paymentId}`);
      setError('');

      const res = await fetch('/api/admin/security/freeze-payment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          reason: 'Payment frozen from payment security dashboard by super admin.',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to freeze payment.');
      }

      await fetchSecurityData();
    } catch (e: any) {
      console.error('Freeze payment error', e);
      setError(e?.message || 'Failed to freeze payment.');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <PaymentAccessGate>
      <div className="min-h-screen bg-[#020617] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-red-400">
                Security Monitoring
              </p>
              <h1 className="text-3xl font-bold">Payment Security Dashboard</h1>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Monitor fraud signals, suspicious activity, and protect Sponexus payments.
              </p>
            </div>

            <button
              onClick={fetchSecurityData}
              className="rounded-xl bg-[#FF7A18] px-4 py-2 text-sm font-semibold text-black"
            >
              Refresh
            </button>
          </div>

          {error ? (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="text-[#94A3B8]">Loading security data...</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h2 className="mb-4 text-lg font-semibold">Security Events</h2>

                <div className="max-h-[600px] space-y-4 overflow-y-auto">
                  {events.length === 0 ? (
                    <p className="text-sm text-[#94A3B8]">No events found</p>
                  ) : (
                    events.map((event) => (
                      <div
                        key={event._id}
                        className={`rounded-xl border p-4 ${severityColor(event.severity)}`}
                      >
                        <div className="flex justify-between gap-3">
                          <span className="text-xs uppercase">{event.type}</span>
                          <span className="text-xs">{event.severity}</span>
                        </div>

                        <p className="mt-2 text-sm">{event.notes}</p>

                        {event.metadata?.fraudScore != null ? (
                          <div className="mt-2 text-xs text-[#94A3B8]">
                            Risk Score: {event.metadata.fraudScore}
                          </div>
                        ) : null}

                        <div className="mt-2 text-xs text-[#94A3B8]">
                          {event.ipAddress ? <span>IP: {event.ipAddress} • </span> : null}
                          {event.route ? <span>{event.route} • </span> : null}
                          {formatDateTime(event.createdAt)}
                        </div>

                        {(event.userId || event.paymentId) && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {event.userId ? (
                              <button
                                onClick={() => blockUser(event.userId!)}
                                disabled={actionLoading === `block-user-${event.userId}`}
                                className="rounded bg-red-500/20 px-3 py-1 text-xs text-red-300"
                              >
                                {actionLoading === `block-user-${event.userId}`
                                  ? 'Blocking...'
                                  : 'Block User'}
                              </button>
                            ) : null}

                            {event.paymentId ? (
                              <button
                                onClick={() => freezePayment(event.paymentId!)}
                                disabled={actionLoading === `freeze-payment-${event.paymentId}`}
                                className="rounded bg-[#FF7A18]/20 px-3 py-1 text-xs text-[#FFB347]"
                              >
                                {actionLoading === `freeze-payment-${event.paymentId}`
                                  ? 'Freezing...'
                                  : 'Freeze Payment'}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h2 className="mb-4 text-lg font-semibold">Fraud Flags</h2>

                <div className="max-h-[600px] space-y-4 overflow-y-auto">
                  {flags.length === 0 ? (
                    <p className="text-sm text-[#94A3B8]">No fraud flags</p>
                  ) : (
                    flags.map((flag) => (
                      <div
                        key={flag._id}
                        className={`rounded-xl border p-4 ${severityColor(flag.severity)}`}
                      >
                        <div className="flex justify-between gap-3">
                          <span className="font-semibold">{flag.title}</span>
                          <span className="text-xs">{flag.status}</span>
                        </div>

                        <p className="mt-2 text-sm">{flag.reason}</p>

                        {flag.score != null ? (
                          <div className="mt-2 text-xs text-[#94A3B8]">
                            Risk Score: {flag.score}
                          </div>
                        ) : null}

                        {Array.isArray(flag.signals) && flag.signals.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {flag.signals.slice(0, 4).map((signal) => (
                              <span
                                key={signal}
                                className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-[#94A3B8]"
                              >
                                {signal}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-2 text-xs text-[#94A3B8]">
                          {formatDateTime(flag.createdAt)}
                        </div>

                        {flag.status === 'OPEN' && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {flag.userId ? (
                              <button
                                onClick={() => blockUser(flag.userId!)}
                                disabled={actionLoading === `block-user-${flag.userId}`}
                                className="rounded bg-red-500/20 px-3 py-1 text-xs text-red-300"
                              >
                                {actionLoading === `block-user-${flag.userId}`
                                  ? 'Blocking...'
                                  : 'Block User'}
                              </button>
                            ) : null}

                            {flag.paymentId ? (
                              <button
                                onClick={() => freezePayment(flag.paymentId!)}
                                disabled={actionLoading === `freeze-payment-${flag.paymentId}`}
                                className="rounded bg-[#FF7A18]/20 px-3 py-1 text-xs text-[#FFB347]"
                              >
                                {actionLoading === `freeze-payment-${flag.paymentId}`
                                  ? 'Freezing...'
                                  : 'Freeze Payment'}
                              </button>
                            ) : null}

                            <button
                              onClick={() => resolveFlag(flag._id)}
                              disabled={actionLoading === `resolve-${flag._id}`}
                              className="rounded bg-green-500/20 px-3 py-1 text-xs text-green-300"
                            >
                              {actionLoading === `resolve-${flag._id}`
                                ? 'Resolving...'
                                : 'Resolve'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PaymentAccessGate>
  );
}
