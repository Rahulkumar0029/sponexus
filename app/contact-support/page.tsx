export default function ContactSupportPage() {
  const supportCards = [
    {
      title: "General Support",
      description:
        "For account help, profile issues, listing problems, request flow confusion, or general platform questions.",
    },
    {
      title: "Trust & Safety",
      description:
        "Report fake profiles, misleading listings, suspicious behavior, spam, misuse of shared details, or policy concerns.",
    },
    {
      title: "Technical Issues",
      description:
        "Report bugs, broken pages, loading issues, dashboard problems, or anything not working properly on the platform.",
    },
    {
      title: "Business & Partnership Queries",
      description:
        "For startup collaboration, platform-related opportunities, media interest, or serious business inquiries related to Sponexus.",
    },
  ];

  const steps = [
    "Use a clear subject line so we can understand your issue faster.",
    "Mention your role on Sponexus, such as sponsor or organizer.",
    "Explain the issue clearly with relevant details.",
    "If needed, include screenshots, page names, or actions that caused the issue.",
    "For safety reports, include enough context for us to review responsibly.",
  ];

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-sm sm:mb-12 sm:p-8 md:p-10">
          <div className="mb-4 inline-flex rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#FFB347]">
            Support
          </div>

          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Contact Support
          </h1>

          <p className="max-w-3xl text-sm leading-7 text-[#94A3B8] sm:text-base">
            Need help with Sponexus? Reach out for account support, platform
            issues, trust and safety concerns, or business-related questions.
            We want the platform experience to stay clear, safe, and reliable
            for both sponsors and organizers.
          </p>

          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-sm text-[#94A3B8]">
              Support email:{" "}
              <span className="font-medium text-white">
                sponexus.team@gmail.com
              </span>
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {supportCards.map((card) => (
            <section
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6"
            >
              <h2 className="mb-3 text-xl font-semibold text-white">
                {card.title}
              </h2>
              <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
                {card.description}
              </p>
            </section>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6 md:p-7">
          <h2 className="mb-3 text-xl font-semibold text-white sm:text-2xl">
            How to Reach Us
          </h2>

          <p className="mb-4 text-sm leading-7 text-[#94A3B8] sm:text-base">
            You can contact the Sponexus team by email for support, reporting,
            or platform-related help.
          </p>

          <div className="rounded-2xl border border-[#FF7A18]/20 bg-[#FF7A18]/10 p-4">
            <p className="text-sm text-[#94A3B8] sm:text-base">
              Email us at
            </p>
            <a
              href="mailto:sponexus.team@gmail.com"
              className="mt-1 inline-block text-base font-semibold text-white transition hover:text-[#FFB347] sm:text-lg"
            >
              sponexus.team@gmail.com
            </a>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6 md:p-7">
          <h2 className="mb-3 text-xl font-semibold text-white sm:text-2xl">
            What to Include in Your Message
          </h2>

          <ul className="space-y-3 text-sm leading-7 text-[#94A3B8] sm:text-base">
            {steps.map((step) => (
              <li key={step}>• {step}</li>
            ))}
          </ul>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6 md:p-7">
          <h2 className="mb-3 text-xl font-semibold text-white sm:text-2xl">
            Important Support Notes
          </h2>

          <div className="space-y-4 text-sm leading-7 text-[#94A3B8] sm:text-base">
            <p>
              Sponexus currently helps users discover opportunities, send
              requests, and connect through controlled visibility. Contact
              details are not publicly visible by default and are only shared
              after request acceptance through the platform flow.
            </p>

            <p>
              Sponexus does not currently process payments on-platform. If your
              issue relates to an off-platform payment, private agreement, or
              sponsorship deal between users, we may review related misuse or
              safety concerns, but we do not guarantee enforcement of private
              commercial arrangements.
            </p>

            <p>
              For fake profiles, fraudulent behavior, harassment, misuse of
              contact information, or suspicious platform activity, please
              contact us with as much context as possible so we can review it
              responsibly.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6 md:p-7">
          <h2 className="mb-3 text-xl font-semibold text-white sm:text-2xl">
            Response Expectations
          </h2>

          <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
            We aim to review support messages as efficiently as possible.
            Response times may vary depending on issue type, message clarity,
            and platform workload. Trust and safety concerns may be prioritized
            where necessary to protect users and platform integrity.
          </p>
        </div>
      </div>
    </div>
  );
}