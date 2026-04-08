export default function LegalPage() {
  const sections = [
    {
      id: 'privacy-policy',
      title: 'Privacy Policy',
      content: [
        'Sponexus respects your privacy and is committed to protecting your personal information. We collect only the data necessary to provide and improve our platform, such as account details, profile information, event information, sponsor details, and usage-related interactions.',
        'We use the information you provide to operate the platform, improve matching quality, communicate important updates, and maintain account security. We do not sell your personal information to third parties.',
        'By using Sponexus, you understand that information shared in event and sponsor profiles may be visible to other users of the platform where relevant to discovery, matching, and collaboration.',
        'We take reasonable measures to protect user data, but no online platform can guarantee absolute security. Users are responsible for maintaining the confidentiality of their login credentials.',
      ],
    },
    {
      id: 'terms-of-service',
      title: 'Terms of Service',
      content: [
        'By accessing or using Sponexus, you agree to use the platform lawfully and responsibly. You must provide accurate information while creating an account, event listing, or sponsor profile.',
        'Users may not misuse the platform, attempt unauthorized access, submit false or misleading information, or engage in harmful, fraudulent, or abusive activity.',
        'Sponexus acts as a matchmaking and discovery platform between event organizers and sponsors. We do not guarantee successful sponsorship deals, funding outcomes, or final agreements between parties.',
        'We reserve the right to suspend, restrict, or remove access to accounts or content that violate platform rules, harm user trust, or create legal or operational risk.',
      ],
    },
    {
      id: 'cookie-policy',
      title: 'Cookie Policy',
      content: [
        'Sponexus may use cookies and similar technologies to improve user experience, remember session information, understand usage behavior, and support performance optimization.',
        'Cookies help us recognize returning users, maintain login sessions, and improve how the platform functions across devices and sessions.',
        'By continuing to use Sponexus, you agree to our use of cookies for platform functionality, analytics, and user experience improvements.',
        'You may control or disable cookies through your browser settings, but doing so may affect some platform functionality.',
      ],
    },
    {
      id: 'disclaimer',
      title: 'Disclaimer',
      content: [
        'Sponexus is a technology platform designed to facilitate discovery and matching between event organizers and sponsors. We do not act as a direct financial intermediary, legal advisor, or guarantor of partnership outcomes.',
        'Any sponsorship discussions, negotiations, contracts, or financial arrangements made through or after the use of the platform are solely the responsibility of the involved parties.',
        'While we aim to maintain useful and relevant information on the platform, Sponexus does not guarantee the completeness, accuracy, or suitability of all user-submitted content.',
        'Users should independently review opportunities, verify claims, and use their own judgment before entering into agreements or collaborations.',
      ],
    },
  ];

  return (
    <div className="relative min-h-screen px-4 py-16">
      {/* Background */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_30%,rgba(251,191,36,0.08),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.08),transparent_40%),linear-gradient(135deg,#020617,#07152f,#020617)]" />

      {/* Glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
            Legal & Policies
          </h1>
          <p className="mx-auto max-w-3xl text-base text-text-muted sm:text-lg">
            This page outlines the key legal, privacy, and usage principles for
            Sponexus. It is designed to give users a clear understanding of how the
            platform operates and what responsibilities apply while using it.
          </p>
        </div>

        {/* Quick Nav */}
        <div className="mb-10 rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold text-white">Quick Navigation</h2>
          <div className="flex flex-wrap gap-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-text-muted transition hover:border-accent-orange hover:text-accent-orange"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl sm:p-8"
            >
              <h2 className="mb-5 text-2xl font-semibold text-white">
                {section.title}
              </h2>

              <div className="space-y-4">
                {section.content.map((paragraph, index) => (
                  <p
                    key={index}
                    className="leading-relaxed text-text-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Final Note */}
        <div className="mt-10 rounded-2xl border border-accent-orange/20 bg-accent-orange/5 p-6 text-center">
          <h3 className="mb-2 text-xl font-semibold text-white">Need clarification?</h3>
          <p className="mb-3 text-text-muted">
            For questions related to legal, privacy, or platform usage, contact us at
          </p>
          <a
            href="mailto:sponexus.team@gmail.com"
            className="text-accent-orange transition hover:text-yellow-400"
          >
            sponexus.team@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}