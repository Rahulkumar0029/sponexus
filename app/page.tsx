'use client';

import Link from 'next/link';
import { Button } from '@/components/Button';

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden pt-24 pb-20 sm:pt-28 sm:pb-24">
        <div className="absolute inset-0 -z-30 bg-[linear-gradient(140deg,#020617_0%,#0a1734_52%,#020617_100%)]" />
        <div className="absolute inset-0 -z-20 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:72px_72px]" />

        <div className="container-custom">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-text-muted">
                Real sponsorship marketplace for organizers and sponsors
              </p>
              <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                Find the Right Sponsorship Partner — Faster
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-muted">
                Sponexus matches event organizers and sponsors using category, audience, location,
                budget, and requirements fit with a controlled deal flow.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <Link href="/register?role=organizer">
                  <Button size="lg" fullWidth>
                    I&apos;m an Organizer
                  </Button>
                </Link>
                <Link href="/register?role=sponsor">
                  <Button size="lg" variant="secondary" fullWidth>
                    I&apos;m a Sponsor
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">What you can do now</h2>
              <div className="mt-4 space-y-3 text-sm text-text-muted">
                <p>• Create events and sponsorship campaigns with real business details.</p>
                <p>• Get ranked matches with clear reasons and fit scores.</p>
                <p>• Send deal requests and unlock contact only after acceptance.</p>
                <p>• Track pending, active, completed, and disputed deals in one place.</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href="/match">
                  <Button variant="secondary" fullWidth>
                    Open Matches
                  </Button>
                </Link>
                <Link href="/deals">
                  <Button fullWidth>Open Deals</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-dark-layer/40">
        <div className="container-custom">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">How Sponexus Works</h2>
            <p className="mt-4 text-text-muted">Built for real conversion, not vanity metrics.</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="card">
              <h3 className="text-xl font-semibold text-accent-orange">1. Publish</h3>
              <p className="mt-3 text-text-muted">Organizers publish events. Sponsors publish sponsorship campaigns.</p>
            </article>
            <article className="card">
              <h3 className="text-xl font-semibold text-accent-orange">2. Match</h3>
              <p className="mt-3 text-text-muted">The matching engine ranks opportunities using category, audience, location, budget, and requirement fit.</p>
            </article>
            <article className="card">
              <h3 className="text-xl font-semibold text-accent-orange">3. Deal</h3>
              <p className="mt-3 text-text-muted">Users send requests, accept or reject, and only then unlock contact information safely.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section pb-24">
        <div className="container-custom">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/[0.05] px-7 py-12 text-center backdrop-blur-xl sm:px-10 sm:py-14">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to launch your sponsorship pipeline?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-text-muted">
              Start with profile setup, publish your first listing, and move from match to real-world deal.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/sponsorships/create" className="sm:min-w-[220px]">
                <Button size="lg" fullWidth>
                  Sponsor Now
                </Button>
              </Link>
              <Link href="/events/create" className="sm:min-w-[220px]">
                <Button variant="secondary" size="lg" fullWidth>
                  Create Event
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
