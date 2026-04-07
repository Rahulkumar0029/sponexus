'use client';

import Link from 'next/link';
import { Button } from '@/components/Button';

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 -z-30 bg-[linear-gradient(135deg,#020617_0%,#07152f_45%,#020617_100%)]" />

        {/* Ambient glows */}
        <div className="absolute inset-0 -z-20 pointer-events-none">
          <div className="absolute top-24 left-12 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute top-1/3 right-16 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-40 w-[34rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        {/* Subtle grid */}
        <div className="absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:72px_72px]" />

        {/* Bottom light streak */}
        <div className="absolute bottom-20 left-0 right-0 -z-10 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        <div className="container-custom relative z-10 py-24">
          <div className="mx-auto max-w-5xl text-center">
            {/* Top badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted backdrop-blur-md shadow-[0_0_24px_rgba(245,158,11,0.08)]">
              <span className="h-2 w-2 rounded-full bg-accent-orange" />
              Intelligent sponsorship marketplace for events and brands
            </div>

            {/* Headline */}
            <h1 className="mx-auto max-w-5xl text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
              <span className="block bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                Where Sponsors
              </span>
              <span className="mt-2 block text-white">Meet Events</span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-text-muted sm:text-xl">
              Sponexus helps event organizers and sponsors discover the right opportunities
              through intelligent matching based on budget, category, audience, and location.
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button variant="primary" size="lg">
                  Get Started
                </Button>
              </Link>

              <Link href="/events">
                <Button variant="secondary" size="lg">
                  Explore Events
                </Button>
              </Link>
            </div>

            {/* Trust line */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-text-muted/80">
              <span>Smart matching</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>Better discovery</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>Built for organizers & sponsors</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="section bg-dark-layer/40">
        <div className="container-custom">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-white">The Problem</h2>
            <p className="mt-4 text-text-muted">
              Great events and great sponsors exist everywhere, but finding the right match is still
              slow, inconsistent, and inefficient.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="card">
              <div className="mb-4 text-4xl">🎤</div>
              <h3 className="mb-3 text-xl font-semibold text-text-light">For Event Organizers</h3>
              <p className="leading-relaxed text-text-muted">
                Reaching out to sponsors takes time, effort, and often leads to low response rates.
                Valuable opportunities are lost before the right connection is ever made.
              </p>
            </div>

            <div className="card">
              <div className="mb-4 text-4xl">💼</div>
              <h3 className="mb-3 text-xl font-semibold text-text-light">For Sponsors</h3>
              <p className="leading-relaxed text-text-muted">
                Identifying events that truly fit your audience, budget, and business goals is
                difficult. Good sponsorship opportunities often go unnoticed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Sponexus */}
      <section className="section">
        <div className="container-custom">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-white">Why Sponexus</h2>
            <p className="mt-4 text-text-muted">
              Sponexus brings both sides together through a smarter, more structured discovery and
              matching experience.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="card text-center">
              <div className="mb-4 text-5xl">🧠</div>
              <h3 className="mb-3 text-xl font-semibold text-accent-orange">Intelligent Matching</h3>
              <p className="leading-relaxed text-text-muted">
                Match events and sponsors using real criteria like budget, category, audience, and
                location relevance.
              </p>
            </div>

            <div className="card text-center">
              <div className="mb-4 text-5xl">⚡</div>
              <h3 className="mb-3 text-xl font-semibold text-accent-orange">Faster Discovery</h3>
              <p className="leading-relaxed text-text-muted">
                Spend less time searching manually and more time building valuable sponsorship
                opportunities.
              </p>
            </div>

            <div className="card text-center">
              <div className="mb-4 text-5xl">🎯</div>
              <h3 className="mb-3 text-xl font-semibold text-accent-orange">Better Fit</h3>
              <p className="leading-relaxed text-text-muted">
                Connect with opportunities that make strategic sense for both organizers and
                sponsors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section bg-dark-layer/40">
        <div className="container-custom">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-white">How It Works</h2>
            <p className="mt-4 text-text-muted">
              A simple flow designed to make event sponsorship discovery smarter and easier.
            </p>
          </div>

          <div className="mx-auto max-w-4xl space-y-8">
            <div className="flex gap-5 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-orange text-xl font-bold text-dark-base">
                1
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-text-light">Create Your Account</h3>
                <p className="text-text-muted">
                  Sign up as an organizer or sponsor and set up your basic profile.
                </p>
              </div>
            </div>

            <div className="flex gap-5 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-orange text-xl font-bold text-dark-base">
                2
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-text-light">Add Your Details</h3>
                <p className="text-text-muted">
                  Organizers publish events, while sponsors add budget, categories, and audience
                  preferences.
                </p>
              </div>
            </div>

            <div className="flex gap-5 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-orange text-xl font-bold text-dark-base">
                3
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-text-light">Get Smart Matches</h3>
                <p className="text-text-muted">
                  Sponexus analyzes your data and recommends the most relevant opportunities.
                </p>
              </div>
            </div>

            <div className="flex gap-5 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-orange text-xl font-bold text-dark-base">
                4
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-text-light">Explore and Connect</h3>
                <p className="text-text-muted">
                  Review opportunities, explore relevant profiles, and move toward the right
                  sponsorship partnerships.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section relative overflow-hidden py-24">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-orange/10 blur-3xl" />
        </div>

        <div className="container-custom">
          <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/5 px-8 py-14 text-center backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.08)]">
            <h2 className="text-4xl font-bold text-white">Start Smarter Sponsorship Discovery</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-text-muted">
              Build better event partnerships with a platform designed for both organizers and
              sponsors.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button variant="primary" size="lg">
                  Create Your Account
                </Button>
              </Link>
              <Link href="/match">
                <Button variant="secondary" size="lg">
                  See How Matching Works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}