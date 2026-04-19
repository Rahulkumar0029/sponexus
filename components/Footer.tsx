"use client";

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#020617]">
      <div className="container-custom px-4 py-14">
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-5">
          <div className="md:col-span-2">
            <h3 className="mb-3 text-2xl font-bold gradient-text">Sponexus</h3>
            <p className="max-w-md text-sm leading-relaxed text-text-muted">
              Where sponsors and events find the right fit. Sponexus helps event
              organizers and sponsors discover better partnership opportunities
              through stronger visibility, smarter matching, and clearer intent.
            </p>
<div className="flex items-center gap-4 mt-2">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/_sponexus/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-pink-500 transition flex items-center justify-center"
                aria-label="Instagram"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M7.75 2C4.678 2 2 4.678 2 7.75v8.5C2 19.322 4.678 22 7.75 22h8.5c3.072 0 5.75-2.678 5.75-5.75v-8.5C22 4.678 19.322 2 16.25 2h-8.5zm0 2h8.5C18.216 4 20 5.784 20 7.75v8.5c0 1.966-1.784 3.75-3.75 3.75h-8.5C5.784 20 4 18.216 4 16.25v-8.5C4 5.784 5.784 4 7.75 4zm8.25 2a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-blue-500 transition flex items-center justify-center"
                aria-label="LinkedIn"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M4.983 3.5C4.983 4.604 4.1 5.5 3 5.5S1.017 4.604 1.017 3.5 1.9 1.5 3 1.5s1.983.896 1.983 2zM.5 8h5v14h-5V8zm7.5 0h4.8v1.917h.069c.669-1.269 2.304-2.605 4.743-2.605C21.23 7.312 24 9.614 24 14.145V22h-5v-7.167c0-1.708-.031-3.908-2.381-3.908-2.382 0-2.747 1.86-2.747 3.786V22h-5V8z" />
                </svg>
              </a>

              {/* X */}
              <a
                href="https://x.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-white transition flex items-center justify-center"
                aria-label="X (Twitter)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M18.244 2H21l-6.5 7.43L22 22h-6.828l-5.36-7.02L3.9 22H1l6.96-7.96L2 2h6.828l4.86 6.39L18.244 2zm-2.4 18h1.88L8.24 4H6.22l9.624 16z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Platform
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/events"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Explore Events
                </Link>
              </li>
              <li>
                <Link
                  href="/sponsors"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Explore Sponsors
                </Link>
              </li>
              <li>
                <Link
                  href="/sponsorships"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Sponsorship Opportunities
                </Link>
              </li>
              <li>
                <Link
                  href="/match"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Smart Matching
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Get Started
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/register"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Join Sponexus
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  href="/events/create"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Create Event
                </Link>
              </li>
              <li>
                <Link
                  href="/sponsorships/create"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Create Sponsorship
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Company
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  About Sponexus
                </Link>
              </li>
              <li>
                <a
                  href="mailto:sponexus.team@gmail.com"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Contact Support
                </a>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-text-muted transition hover:text-[#FFB347]"
                >
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>

         {/* Bottom */}
        <div className="border-t border-white/10 pt-5 flex flex-col items-center gap-1 text-center">
          <p className="text-text-muted text-xs">
            © {currentYear} Sponexus. All rights reserved.
          </p>

          <p className="text-text-muted text-xs">
            Built for smarter sponsor–organizer partnerships.
          </p>
        </div>
      </div>
    </footer>
  );
}