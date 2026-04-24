'use client';

import { useEffect, useState } from 'react';
import PaymentAccessGate from '@/components/admin/payments/PaymentAccessGate';

type Summary = {
  totalGrossRevenue: number;
  totalDiscountGiven: number;
  totalNetRevenue: number;
  totalSuccessfulPayments: number;
  totalNewSubscriptionRevenue: number;
  totalRenewalRevenue: number;
};

type PlanBreakdown = {
  planId: string;
  name: string | null;
  code: string | null;
  role: string | null;
  totalNetRevenue: number;
  successfulPayments: number;
};

type CouponBreakdown = {
  code: string;
  successfulPayments: number;
  totalDiscountGiven: number;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default function RevenuePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [plans, setPlans] = useState<PlanBreakdown[]>([]);
  const [coupons, setCoupons] = useState<CouponBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchRevenue() {
    setLoading(true);

    const res = await fetch('/api/admin/payments/revenue', {
      cache: 'no-store',
    });

    const data = await res.json();

    if (data.success) {
      setSummary(data.summary);
      setPlans(data.planBreakdown || []);
      setCoupons(data.couponBreakdown || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchRevenue();
  }, []);

  return (
    <PaymentAccessGate>
      <div className="min-h-screen bg-[#020617] text-white p-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Revenue Dashboard</h1>
          <p className="text-[#94A3B8]">
            Full financial overview of Sponexus
          </p>
        </div>

        {loading || !summary ? (
          <p>Loading...</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">

              <Card title="Net Revenue">
                {formatCurrency(summary.totalNetRevenue)}
              </Card>

              <Card title="Gross Revenue">
                {formatCurrency(summary.totalGrossRevenue)}
              </Card>

              <Card title="Discount Given">
                {formatCurrency(summary.totalDiscountGiven)}
              </Card>

              <Card title="Total Payments">
                {summary.totalSuccessfulPayments}
              </Card>

              <Card title="New Revenue">
                {formatCurrency(summary.totalNewSubscriptionRevenue)}
              </Card>

              <Card title="Renewal Revenue">
                {formatCurrency(summary.totalRenewalRevenue)}
              </Card>

            </div>

            {/* Plan Breakdown */}
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-4">Revenue by Plans</h2>

              <div className="space-y-3">
                {plans.map((p) => (
                  <div
                    key={p.planId}
                    className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between"
                  >
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-[#94A3B8]">{p.code}</p>
                    </div>

                    <div className="text-right">
                      <p>{formatCurrency(p.totalNetRevenue)}</p>
                      <p className="text-xs text-[#94A3B8]">
                        {p.successfulPayments} payments
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon Breakdown */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Coupon Impact</h2>

              <div className="space-y-3">
                {coupons.map((c) => (
                  <div
                    key={c.code}
                    className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between"
                  >
                    <p className="font-semibold">{c.code}</p>

                    <div className="text-right">
                      <p>{formatCurrency(c.totalDiscountGiven)}</p>
                      <p className="text-xs text-[#94A3B8]">
                        {c.successfulPayments} uses
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PaymentAccessGate>
  );
}

/* ===============================
   SMALL COMPONENT
=================================*/
function Card({
  title,
  children,
}: {
  title: string;
  children: any;
}) {
  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
      <p className="text-sm text-[#94A3B8]">{title}</p>
      <h3 className="text-xl font-bold mt-2">{children}</h3>
    </div>
  );
}