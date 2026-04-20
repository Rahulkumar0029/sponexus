export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: "1. Introduction",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus is a platform that helps sponsors and event organizers
          connect for meaningful partnership opportunities. We value your
          privacy and are committed to protecting your personal data. This
          Privacy Policy explains what information we collect, how we use it,
          and how we protect it when you use Sponexus.
        </p>
      ),
    },
    {
      title: "2. Information We Collect",
      content: (
        <ul className="space-y-3 text-sm leading-7 text-[#94A3B8] sm:text-base">
          <li>• Personal information such as your name, email address, and phone number</li>
          <li>• Profile information such as company details, event details, sponsorship preferences, and public profile content</li>
          <li>• Usage data such as pages visited, actions performed, requests sent, and interactions with platform features</li>
          <li>• Device and technical data such as IP address, browser type, device information, and general log data</li>
        </ul>
      ),
    },
    {
      title: "3. How We Use Your Information",
      content: (
        <ul className="space-y-3 text-sm leading-7 text-[#94A3B8] sm:text-base">
          <li>• To create and manage your account on Sponexus</li>
          <li>• To enable connections between sponsors and organizers</li>
          <li>• To power matching, discovery, and platform recommendations</li>
          <li>• To send important updates, platform notifications, and support communication</li>
          <li>• To improve product performance, trust, and platform security</li>
        </ul>
      ),
    },
    {
      title: "4. Marketplace Data Visibility",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus operates as a controlled marketplace. Public profile details,
          event listings, sponsorship listings, and other non-sensitive platform
          information may be visible to other users. Sensitive contact details,
          including phone numbers and direct contact information, are not shared
          publicly by default and are only revealed when a request is accepted
          by the relevant user.
        </p>
      ),
    },
    {
      title: "5. Requests, Messages, and Future Communication Tools",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Users may send requests and short descriptive messages through
          platform actions to explain their interest in a post or partnership.
          At present, Sponexus does not provide a full internal live chat
          system. We may introduce expanded communication tools in the future,
          and this Privacy Policy may be updated accordingly.
        </p>
      ),
    },
    {
      title: "6. Data Sharing",
      content: (
        <>
          <ul className="space-y-3 text-sm leading-7 text-[#94A3B8] sm:text-base">
            <li>• With another user when a connection request is accepted and contact details are intentionally shared</li>
            <li>• With service providers that help us operate the platform, such as hosting, authentication, analytics, email, and infrastructure partners</li>
            <li>• With legal authorities when required by law, regulation, legal process, or to protect platform rights and safety</li>
          </ul>
          <p className="mt-4 text-sm leading-7 text-[#94A3B8] sm:text-base">
            Sponexus does not sell your personal data to third parties.
          </p>
        </>
      ),
    },
    {
      title: "7. Your Rights and Controls",
      content: (
        <ul className="space-y-3 text-sm leading-7 text-[#94A3B8] sm:text-base">
          <li>• You may review and update your profile information</li>
          <li>• You may control what information you publish on your profile or listings</li>
          <li>• You may request account deletion or support assistance for account-related concerns</li>
        </ul>
      ),
    },
    {
      title: "8. Data Security",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          We use reasonable technical and organizational measures to help
          protect your information, including controlled access, platform
          monitoring, and secure service infrastructure. However, no digital
          platform can guarantee absolute security, and users should also take
          care to protect their own credentials and account access.
        </p>
      ),
    },
    {
      title: "9. Cookies and Similar Technologies",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus may use cookies and similar technologies to keep users signed
          in, improve user experience, measure performance, and understand how
          the platform is being used.
        </p>
      ),
    },
    {
      title: "10. Third-Party Services",
      content: (
        <ul className="space-y-3 text-sm leading-7 text-[#94A3B8] sm:text-base">
          <li>• Authentication and account services</li>
          <li>• Hosting and deployment infrastructure</li>
          <li>• Database and storage systems</li>
          <li>• Email and communication delivery services</li>
          <li>• Analytics and platform monitoring tools</li>
        </ul>
      ),
    },
    {
      title: "11. Platform Disclaimer",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus helps users discover and connect with relevant opportunities,
          but does not guarantee sponsorship results, event outcomes, business
          success, responses, or completed partnerships. Users are responsible
          for evaluating opportunities and handling their own agreements,
          negotiations, and offline decisions.
        </p>
      ),
    },
    {
      title: "12. Payments and Off-Platform Transactions",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus does not currently process payments on the platform. Any
          payment discussions, transfers, or commercial arrangements presently
          happen outside the platform between users. If payment features are
          introduced in the future, this Privacy Policy and related legal terms
          may be updated.
        </p>
      ),
    },
    {
      title: "13. Fraud, Misuse, and Trust Protection",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          We reserve the right to review, restrict, suspend, or terminate
          accounts, listings, or activity that appears fraudulent, abusive,
          misleading, harmful, or in violation of platform rules, without prior
          notice where necessary for platform integrity and safety.
        </p>
      ),
    },
    {
      title: "14. Children’s Policy",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          Sponexus is not intended for individuals under the age of 18. If we
          become aware that personal data has been submitted by a person under
          18 in violation of this policy, we may remove the information and take
          appropriate account action.
        </p>
      ),
    },
    {
      title: "15. Changes to This Policy",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          We may update this Privacy Policy from time to time to reflect product
          changes, legal requirements, security improvements, or business
          updates. Continued use of Sponexus after updates means you accept the
          revised policy.
        </p>
      ),
    },
    {
      title: "16. Contact Us",
      content: (
        <p className="text-sm leading-7 text-[#94A3B8] sm:text-base">
          For privacy-related questions, support concerns, or data requests,
          contact us at:
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
            Privacy Policy
          </h1>

          <p className="max-w-3xl text-sm leading-7 text-[#94A3B8] sm:text-base">
            This policy explains how Sponexus collects, uses, shares, and
            protects user information across the platform.
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