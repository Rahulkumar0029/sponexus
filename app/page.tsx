'use client';

import Link from 'next/link';

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-xl bg-accent-orange px-6 py-3 text-sm font-semibold text-dark-base transition-all hover:scale-[1.02] hover:opacity-95 sm:px-7 sm:py-4 sm:text-base';

const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:scale-[1.02] sm:px-7 sm:py-4 sm:text-base';

const ghostButtonClass =
  'inline-flex items-center justify-center rounded-xl border border-accent-orange/30 bg-accent-orange/10 px-6 py-3 text-sm font-semibold text-accent-orange transition-all hover:bg-accent-orange/15 hover:scale-[1.02] sm:px-7 sm:py-4 sm:text-base';

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-30 bg-[linear-gradient(135deg,#020617_0%,#07152f_45%,#020617_100%)]" />

        {/* Ambient Glows */}
        <div className="pointer-events-none absolute inset-0 -z-20">
          <div className="absolute left-12 top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute right-16 top-1/3 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-40 w-[34rem] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        {/* Grid */}
        <div className="absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:72px_72px]" />

        {/* Bottom streak */}
        <div className="absolute bottom-20 left-0 right-0 -z-10 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        <div className="container-custom relative z-10 py-24">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted backdrop-blur-md shadow-[0_0_24px_rgba(245,158,11,0.08)]">
              <span className="h-2 w-2 rounded-full bg-accent-orange" />
              Built for sponsors and event organizers
            </div>

            <p className="mb-4 text-xs uppercase tracking-[0.18em] text-text-muted/70">
              Early-stage platform for sponsors and organizers
            </p>

            <h1 className="mx-auto max-w-5xl text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
              <span className="block bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                Where Sponsors and Events
              </span>
              <span className="mt-2 block text-white">Find the Right Fit</span>
            </h1>

            <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-text-muted sm:text-xl">
              Stop wasting time on random outreach and low-response deals.
              <br />
              <span className="font-medium text-white">
                Find sponsors and events that actually match your audience,
                budget, and intent.
              </span>
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 lg:flex-row">
              <Link href="/events" className={primaryButtonClass}>
                I&apos;m a Sponsor → Find Events
              </Link>

              <Link href="/sponsors" className={secondaryButtonClass}>
                I&apos;m an Organizer → Find Sponsors
              </Link>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/match" className={ghostButtonClass}>
                Explore Smart Matches
              </Link>
            </div>

            <p className="mt-6 text-sm text-text-muted/80">
              ⚡ Get relevant opportunities in minutes — not weeks of cold
              outreach
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-text-muted/80">
              <span>Relevant discovery</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>Better-fit opportunities</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>Made for both sides of sponsorship</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Opportunities */}
      <section className="section">
        <div className="container-custom">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-white">
              🔥 Live Opportunities on Sponexus
            </h2>
            <p className="mt-3 text-text-muted">
              Explore what&apos;s happening right now — real needs, real
              opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Link href="/events" className="block h-full">
              <div className="card h-full transition-transform hover:-translate-y-1">
                <h3 className="text-lg font-semibold text-white">
                  College Tech Fest – Delhi
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Looking for ₹50,000 sponsorship • 2,000+ audience
                </p>
              </div>
            </Link>

            <Link href="/sponsors" className="block h-full">
              <div className="card h-full transition-transform hover:-translate-y-1">
                <h3 className="text-lg font-semibold text-white">
                  Fitness Brand – Sponsor
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Interested in sports & youth events • Budget ₹1L+
                </p>
              </div>
            </Link>

            <Link href="/events" className="block h-full">
              <div className="card h-full transition-transform hover:-translate-y-1">
                <h3 className="text-lg font-semibold text-white">
                  Cultural Fest – Jaipur
                </h3>
                <p className="mt-2 text-sm text-text-muted">
                  Looking for youth-focused brand partners • 1,500+ attendees
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Pain to Solution */}
      <section className="section bg-dark-layer/30">
        <div className="container-custom">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-white">
              Still Doing This Manually?
            </h2>

            <div className="mt-6 space-y-3 text-lg text-text-muted">
              <p>❌ Sending 50+ emails with no replies</p>
              <p>❌ Searching random events with no relevance</p>
              <p>❌ Wasting weeks finding the right match</p>
            </div>

            <p className="mt-6 text-lg font-medium text-white">
              Sponexus fixes this with smarter, focused matching.
            </p>
          </div>
        </div>
      </section>

      {/* Role-based usage section */}
      <section className="section">
        <div className="container-custom">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-white">
              Choose Your Side. Move With Clarity.
            </h2>
            <p className="mt-4 text-text-muted">
              Sponexus is built for both sides of the sponsorship journey, so
              each user can start from their real goal instead of wasting time
              on irrelevant outreach.
            </p>
            <p className="mt-4 text-sm text-text-muted/70">
              Less guesswork. Better connections. Stronger sponsorship outcomes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-orange/15 text-3xl">
                💼
              </div>
              <h3 className="text-2xl font-semibold text-white">
                For Sponsors
              </h3>
              <p className="mt-3 leading-relaxed text-text-muted">
                Find events that align with your brand goals, audience focus,
                category, and budget — without manually sorting through low-fit
                opportunities.
              </p>

              <div className="mt-6 space-y-3 text-sm text-text-muted">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent-orange" />
                  <span>
                    Explore event opportunities that match your brand direction
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent-orange" />
                  <span>
                    Review better-fit options with smarter filtering and
                    matching
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent-orange" />
                  <span>
                    Connect with organizers whose events make business sense
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/events" className={primaryButtonClass}>
                  🔍 Find Events That Fit
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 text-3xl">
                🎤
              </div>
              <h3 className="text-2xl font-semibold text-white">
                For Organizers
              </h3>
              <p className="mt-3 leading-relaxed text-text-muted">
                Discover sponsors that fit your event type, audience profile,
                sponsorship needs, and market positioning more efficiently.
              </p>

              <div className="mt-6 space-y-3 text-sm text-text-muted">
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                  <span>
                    Find sponsors that are relevant to your event and audience
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                  <span>
                    Reduce random outreach and focus on stronger opportunities
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
                  <span>
                    Move toward better sponsorship conversations with more
                    intent
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <Link href="/sponsors" className={secondaryButtonClass}>
                  🤝 Find Sponsors That Fit
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="section bg-dark-layer/40">
        <div className="container-custom">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-white">
              Why This Platform Matters
            </h2>
            <p className="mt-4 text-text-muted">
              Sponsorship discovery is still fragmented. Organizers struggle to
              reach the right brands, and sponsors struggle to find the right
              events at the right time.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="card">
              <div className="mb-4 text-4xl">🎤</div>
              <h3 className="mb-3 text-xl font-semibold text-text-light">
                For Event Organizers
              </h3>
              <p className="leading-relaxed text-text-muted">
                Sponsorship outreach often becomes slow, repetitive, and
                uncertain. A lot of effort goes into finding brands, pitching
                manually, and still not knowing who is actually a strong fit.
              </p>
            </div>

            <div className="card">
              <div className="mb-4 text-4xl">💼</div>
              <h3 className="mb-3 text-xl font-semibold text-text-light">
                For Sponsors
              </h3>
              <p className="leading-relaxed text-text-muted">
                Many sponsorship opportunities lack relevance or clarity.
                Without structured discovery, it becomes harder to identify
                events that truly align with your audience, budget, and campaign
                goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Sponexus */}
      <section className="section">
        <div className="container-custom">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-white">
              What Makes Sponexus Better
            </h2>
            <p className="mt-4 text-text-muted">
              Instead of relying on scattered outreach and random discovery,
              Sponexus creates a more focused path to better sponsorship
              opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="card text-center">
              <div className="mb-4 text-5xl">🧠</div>
              <h3 className="mb-3 text-xl font-semibold text-accent-orange">
                Smarter Matching
              </h3>
              <p className="leading-relaxed text-text-muted">
                Discover more relevant opportunities using practical factors
                like category, audience, budget, and location fit.
              </p>
            </div>

            <div className="card text-center">
              <div className="mb-4 text-5xl">⚡</div>
              <h3 className="mb-3 text-xl font-semibold text-accent-orange">
                Less Wasted Effort
              </h3>
              <p className="leading-relaxed text-text-muted">
                Reduce manual searching, scattered outreach, and low-fit
                conversations that slow both sides down.
              </p>
            </div>

            <div className="card text-center">
              <div className="mb-4 text-5xl">🎯</div>
              <h3 className="mb-3 text-xl font-semibold text-accent-orange">
                More Relevant Outcomes
              </h3>
              <p className="leading-relaxed text-text-muted">
                Focus on sponsorship opportunities that are more likely to make
                strategic sense for both organizers and sponsors.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section bg-dark-layer/40">
        <div className="container-custom">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-white">
              How Sponexus Works
            </h2>
            <p className="mt-4 text-text-muted">
              A simple flow that helps both sides move from setup to discovery
              with more direction.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-orange text-xl font-bold text-dark-base">
                1
              </div>
              <h3 className="mb-2 text-xl font-semibold text-text-light">
                Create Your Account
              </h3>
              <p className="text-text-muted">
                Join as a sponsor or organizer and start with the role that
                matches your purpose on the platform.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-orange text-xl font-bold text-dark-base">
                2
              </div>
              <h3 className="mb-2 text-xl font-semibold text-text-light">
                Add Relevant Details
              </h3>
              <p className="text-text-muted">
                Share the information that matters — event needs, audience type,
                preferred categories, budgets, and location relevance.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-orange text-xl font-bold text-dark-base">
                3
              </div>
              <h3 className="mb-2 text-xl font-semibold text-text-light">
                Discover Better Matches
              </h3>
              <p className="text-text-muted">
                Sponexus helps surface more relevant opportunities so users can
                spend less time guessing and more time evaluating fit.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-orange text-xl font-bold text-dark-base">
                4
              </div>
              <h3 className="mb-2 text-xl font-semibold text-text-light">
                Take the Next Step
              </h3>
              <p className="text-text-muted">
                Review opportunities, compare relevance, and move toward
                stronger sponsorship partnerships with more confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform value section */}
      <section className="section">
        <div className="container-custom">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-4xl font-bold text-white">
              Built for Real Sponsorship Discovery
            </h2>
            <p className="mt-4 text-text-muted">
              Sponexus is not just about browsing listings. It is designed to
              help both sides discover, evaluate, and move toward better-fit
              sponsorship opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 text-xl font-semibold text-accent-orange">
                Discover
              </h3>
              <p className="leading-relaxed text-text-muted">
                Explore relevant events and sponsors in one focused platform
                built around sponsorship use cases.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 text-xl font-semibold text-accent-orange">
                Evaluate Fit
              </h3>
              <p className="leading-relaxed text-text-muted">
                Understand alignment through the details that actually matter:
                audience, category, budget, and location.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="mb-3 text-xl font-semibold text-accent-orange">
                Move Forward
              </h3>
              <p className="leading-relaxed text-text-muted">
                Spend less time chasing low-fit leads and more time focusing on
                opportunities with stronger potential.
              </p>
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
            <h2 className="text-4xl font-bold text-white">
              Start Finding Better Sponsorship Fits
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-text-muted">
              Whether you are looking for the right sponsor or the right event,
              Sponexus gives both sides a smarter place to begin.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/register" className={primaryButtonClass}>
                🚀 Start Finding Matches
              </Link>
              <Link href="/match" className={secondaryButtonClass}>
                View Smart Match Flow
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}