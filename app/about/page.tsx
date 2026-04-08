export default function AboutPage() {
  return (
    <div className="relative min-h-screen px-4 py-16">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">About Sponexus</h1>
          <p className="text-text-muted max-w-2xl mx-auto text-lg">
            Sponexus is a smart sponsorship marketplace that connects event organizers
            with sponsors through structured profiles and intelligent matching.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-white mb-3">Our Mission</h2>
            <p className="text-text-muted text-sm leading-relaxed">
              To remove guesswork from sponsorship discovery and make partnerships
              faster, smarter, and more transparent for both sides.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-white mb-3">What We Solve</h2>
            <p className="text-text-muted text-sm leading-relaxed">
              Organizers struggle to find relevant sponsors, and sponsors struggle to
              find events worth investing in. Sponexus bridges that gap.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <h2 className="text-xl font-semibold text-white mb-3">How It Works</h2>
            <p className="text-text-muted text-sm leading-relaxed">
              Users create event or sponsor profiles, and our matching engine evaluates
              compatibility using budget, category, audience, and location.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
          <h2 className="text-2xl font-semibold text-white mb-4">Why Sponexus Matters</h2>
          <p className="text-text-muted leading-relaxed">
            Sponsorship is often handled through random outreach, scattered contacts,
            and manual follow-ups. Sponexus turns that into a structured discovery
            process where organizers and sponsors can meet with more confidence and
            better alignment.
          </p>
        </div>
      </div>
    </div>
  );
}