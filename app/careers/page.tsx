export default function CareersPage() {
  return (
    <div className="relative min-h-screen px-4 py-16">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Careers at Sponexus</h1>
          <p className="text-text-muted max-w-2xl mx-auto text-lg">
            We’re building a smarter way for sponsors and events to connect.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-xl">
          <h2 className="text-2xl font-semibold text-white mb-4">We’re Growing</h2>
          <p className="text-text-muted leading-relaxed">
            Sponexus is in its early stage, and we’re focused on building a strong product
            foundation. As we grow, we plan to open roles across product, engineering,
            design, and partnerships.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <h3 className="text-xl font-semibold text-white mb-3">Who We’ll Need</h3>
            <ul className="text-text-muted text-sm space-y-2">
              <li>• Frontend Developers</li>
              <li>• Backend Developers</li>
              <li>• UI/UX Designers</li>
              <li>• Product & Growth Support</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl">
            <h3 className="text-xl font-semibold text-white mb-3">How to Reach Us</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Interested in working with us in the future? Reach out at{' '}
              <span className="text-accent-orange">sponexus.team@gmail.com</span>.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-8 text-center backdrop-blur-xl">
          <h2 className="text-2xl font-semibold text-white mb-3">No open roles right now</h2>
          <p className="text-text-muted">
            We’ll update this page when opportunities become available.
          </p>
        </div>
      </div>
    </div>
  );
}