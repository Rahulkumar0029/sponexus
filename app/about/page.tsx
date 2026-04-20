export default function AboutPage() {
  const values = [
    {
      title: "Clarity Over Noise",
      description:
        "Sponexus is built to reduce random outreach and help both sides discover opportunities with stronger intent, better visibility, and clearer fit.",
    },
    {
      title: "Trust Before Scale",
      description:
        "We want the platform to grow on trust, responsible connections, and controlled visibility instead of uncontrolled spam or low-quality interactions.",
    },
    {
      title: "Built for Real Outcomes",
      description:
        "Sponexus is not made to look like a startup only on the surface. It is being shaped to solve real event–sponsor discovery problems in a practical way.",
    },
    {
      title: "Better Matching",
      description:
        "The goal is to help organizers and sponsors spend less time guessing and more time finding relevant opportunities worth exploring.",
    },
  ];

  const focusAreas = [
    "Helping event organizers present opportunities more clearly",
    "Helping sponsors discover relevant events with stronger context",
    "Creating more structured request and acceptance flows",
    "Reducing friction in the first stage of partnership discovery",
    "Building a stronger foundation for future smart matching and deal workflows",
  ];

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-sm sm:mb-12 sm:p-8 md:p-10">
          <div className="mb-4 inline-flex rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#FFB347]">
            About Sponexus
          </div>

          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Where sponsors and events find the right fit
          </h1>

          <p className="max-w-3xl text-sm leading-7 text-[#94A3B8] sm:text-base">
            Sponexus is a growing platform built to connect event organizers and
            sponsors through better discovery, stronger visibility, smarter
            intent, and more meaningful partnership opportunities.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6 md:p-7">
          <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl">
            What Sponexus is solving
          </h2>

          <div className="space-y-4 text-sm leading-7 text-[#94A3B8] sm:text-base">
            <p>
              Finding the right sponsor for an event is often messy, slow, and
              full of uncertainty. Organizers may struggle to get visibility in
              front of the right brands, while sponsors may find it difficult to
              identify events that actually match their goals, audience, and
              intent.
            </p>

            <p>
              Sponexus is being built to make that discovery process more
              structured. Instead of relying only on scattered outreach, cold
              messages, or unclear listings, the platform aims to create a
              clearer environment where both sides can evaluate fit before they
              move forward.
            </p>

            <p>
              The goal is simple: help the right opportunities meet each other
              with less friction and better context.
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {values.map((value) => (
            <section
              key={value.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6"
            >
              <h2 className="mb-3 text-xl font-semibold text-white">
                {value.title}
              </h2>
              <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
                {value.description}
              </p>
            </section>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6 md:p-7">
          <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl">
            What the platform focuses on
          </h2>

          <ul className="space-y-3 text-sm leading-7 text-[#94A3B8] sm:text-base">
            {focusAreas.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6 md:p-7">
          <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl">
            How Sponexus works today
          </h2>

          <div className="space-y-4 text-sm leading-7 text-[#94A3B8] sm:text-base">
            <p>
              Sponsors and organizers can create profiles, publish relevant
              opportunities, explore the marketplace, and send partnership
              requests with context. Public platform information helps users
              evaluate whether there is a potential fit before moving ahead.
            </p>

            <p>
              Sensitive contact details are not publicly visible by default.
              They are only shared when a request is accepted through the
              platform flow. This helps create a more controlled and trust-first
              experience for both sides.
            </p>

            <p>
              Sponexus currently supports discovery and connection flow. Payment
              handling and deeper communication systems may evolve later as the
              platform grows.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6 md:p-7">
          <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl">
            What comes next
          </h2>

          <div className="space-y-4 text-sm leading-7 text-[#94A3B8] sm:text-base">
            <p>
              The long-term vision of Sponexus is to become a smarter and more
              trusted ecosystem for sponsor–organizer partnerships. That means
              improving relevance, reducing low-quality outreach, and building
              stronger platform systems around matching, trust, and deal flow.
            </p>

            <p>
              As the product matures, Sponexus may expand with stronger
              matchmaking logic, richer communication tools, better trust
              controls, and more advanced workflows that support serious
              partnership building.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#FF7A18]/20 bg-[#FF7A18]/10 p-5 sm:p-6 md:p-7">
          <h2 className="mb-3 text-xl font-semibold text-white sm:text-2xl">
            Contact
          </h2>

          <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
            For support, platform questions, or business-related inquiries,
            contact:
            <br />
            <span className="font-medium text-white">sponexus.team@gmail.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}