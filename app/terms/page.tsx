export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          By accessing or using Sponexus, you agree to be bound by these Terms
          of Use. If you do not agree with these terms, you should not use the
          platform.
        </p>
      ),
    },
    {
      title: "2. About Sponexus",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus is a platform that helps event organizers and sponsors
          discover, evaluate, and connect with each other for potential
          partnerships. Sponexus acts as a facilitation platform and does not
          itself become a party to any sponsorship, commercial, or offline
          agreement between users.
        </p>
      ),
    },
    {
      title: "3. Eligibility",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          You must be at least 18 years old and legally capable of entering into
          binding arrangements to use Sponexus. By using the platform, you
          represent that the information you provide is accurate and that you
          meet these eligibility requirements.
        </p>
      ),
    },
    {
      title: "4. Account Registration and Responsibility",
      content: (
        <ul className="space-y-3 text-sm leading-7 text-[#94A3B8] sm:text-base">
          <li>• You are responsible for maintaining the confidentiality of your account credentials</li>
          <li>• You are responsible for activity that occurs under your account</li>
          <li>• You must provide accurate, current, and complete information during registration and profile creation</li>
          <li>• You must promptly update information that becomes inaccurate or outdated</li>
        </ul>
      ),
    },
    {
      title: "5. Organizer and Sponsor Content",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Users may publish profiles, event listings, sponsorship opportunities,
          requests, descriptions, and related information on the platform. You
          are solely responsible for the content you submit, publish, or share,
          including ensuring that it is truthful, lawful, non-misleading, and
          does not infringe the rights of others.
        </p>
      ),
    },
    {
      title: "6. Requests, Connections, and Contact Disclosure",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus may allow users to send requests and short explanatory
          messages to express partnership interest. Sensitive contact details
          are not publicly visible by default and may only be revealed after a
          request is accepted through the platform flow. Once details are shared
          after acceptance, users are responsible for how they communicate and
          proceed thereafter.
        </p>
      ),
    },
    {
      title: "7. No Guarantee of Results",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus does not guarantee responses, sponsorship outcomes, brand
          deals, event success, commercial benefits, or completed partnerships.
          Matching, discovery, and visibility features are provided to improve
          opportunity discovery, but outcomes depend on user decisions and
          off-platform actions.
        </p>
      ),
    },
    {
      title: "8. Payments and Commercial Arrangements",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus does not currently process payments or act as a financial
          intermediary between users. Any payment, sponsorship amount,
          commercial negotiation, invoice, transfer, or contractual commitment
          currently takes place outside the platform between users. Sponexus is
          not responsible for off-platform payment disputes, defaults, delays,
          fraud, or enforcement of private agreements between users.
        </p>
      ),
    },
    {
      title: "9. User Conduct",
      content: (
        <ul className="space-y-3 text-sm leading-7 text-[#94A3B8] sm:text-base">
          <li>• You must not post false, misleading, fraudulent, or deceptive information</li>
          <li>• You must not impersonate any person, company, or organization</li>
          <li>• You must not misuse another user's contact information or shared data</li>
          <li>• You must not attempt to interfere with platform security, access controls, or technical operations</li>
          <li>• You must not use the platform for unlawful, abusive, harassing, or harmful activity</li>
        </ul>
      ),
    },
    {
      title: "10. Platform Rights",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus reserves the right to review, restrict, remove, suspend, or
          terminate any account, listing, request, profile, or activity that
          appears false, harmful, fraudulent, abusive, suspicious, unlawful, or
          otherwise inconsistent with these terms, with or without prior notice
          where reasonably necessary.
        </p>
      ),
    },
    {
      title: "11. Intellectual Property",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          The Sponexus platform, including its branding, design, layout,
          interface elements, platform text, graphics, and software-related
          materials, is owned by or licensed to Sponexus and is protected by
          applicable intellectual property rights. Users may not copy, reverse
          engineer, reproduce, distribute, or commercially exploit platform
          materials except as expressly permitted by law or written permission.
        </p>
      ),
    },
    {
      title: "12. User Content License",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          By submitting content to Sponexus, you grant Sponexus a limited,
          non-exclusive, worldwide, royalty-free license to host, store,
          display, format, reproduce, and use that content as reasonably
          necessary to operate, maintain, improve, and promote the platform,
          subject to your privacy settings and applicable law.
        </p>
      ),
    },
    {
      title: "13. Disclaimers",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus is provided on an “as is” and “as available” basis to the
          fullest extent permitted by law. We do not guarantee uninterrupted
          availability, error-free operation, absolute security, or that the
          platform will always meet every user expectation, commercial outcome,
          or technical requirement.
        </p>
      ),
    },
    {
      title: "14. Limitation of Liability",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          To the fullest extent permitted by law, Sponexus shall not be liable
          for indirect, incidental, consequential, special, reputational,
          commercial, or business losses arising out of or related to use of
          the platform, user content, third-party conduct, off-platform
          communications, sponsorship disputes, payment issues, failed deals, or
          decisions made by users based on information available through the
          platform.
        </p>
      ),
    },
    {
      title: "15. Indemnity",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          You agree to defend, indemnify, and hold harmless Sponexus and its
          operators from claims, liabilities, losses, damages, costs, and
          expenses arising out of your use of the platform, your content, your
          conduct, your violation of these terms, or your violation of any
          third-party rights or applicable laws.
        </p>
      ),
    },
    {
      title: "16. Third-Party Services and Links",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          The platform may rely on or link to third-party tools, services, or
          websites. Sponexus is not responsible for third-party platforms,
          content, infrastructure, downtime, privacy practices, or acts and
          omissions outside our direct control.
        </p>
      ),
    },
    {
      title: "17. Changes to the Platform and Terms",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          We may modify, suspend, improve, discontinue, or update any part of
          the platform or these Terms of Use at any time. Continued use of
          Sponexus after changes become effective means you accept the updated
          terms.
        </p>
      ),
    },
    {
      title: "18. Termination",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          We may suspend or terminate access to Sponexus at our discretion where
          necessary to protect users, the platform, legal compliance, or
          business integrity. You may also stop using the platform at any time.
          Provisions that by nature should survive termination will continue to
          apply after access ends.
        </p>
      ),
    },
    {
      title: "19. Governing Use",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          These terms govern your use of the Sponexus platform and apply to your
          access to its features, content, requests, listings, and related
          services. Any future legal, commercial, or operational updates may
          also be reflected through revised policies or additional platform
          rules where required.
        </p>
      ),
    },
    {
      title: "20. Contact",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          For questions about these Terms of Use, platform issues, or legal
          concerns, contact us at:
          <br />
          <span className="font-medium text-white">sponexus.team@gmail.com</span>
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-sm sm:mb-12 sm:p-8 md:p-10">
          <div className="mb-4 inline-flex rounded-full border border-[#FF7A18]/20 bg-[#FF7A18]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#FFB347]">
            Legal
          </div>

          <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Terms of Use
          </h1>

          <p className="max-w-3xl text-sm leading-7 text-[#94A3B8] sm:text-base">
            These terms define the rules, responsibilities, rights, and
            limitations that apply when you use the Sponexus platform.
          </p>

          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-sm text-[#94A3B8]">
              Last updated: <span className="text-white">April 20, 2026</span>
            </p>
          </div>
        </div>

        <div className="space-y-5 sm:space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6 md:p-7"
            >
              <h2 className="mb-3 text-xl font-semibold text-white sm:text-2xl">
                {section.title}
              </h2>
              {section.content}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}