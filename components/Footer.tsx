'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-layer border-t border-white/10">
      <div className="container-custom px-4 py-10">
        {/* Main Footer */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8 items-start">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold gradient-text mb-3">Sponexus</h3>
            <p className="text-text-muted text-sm mb-5 leading-relaxed max-w-sm">
              The intelligent marketplace connecting event organizers with ideal sponsors.
              Find perfect partnerships based on data, not guesswork.
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

          {/* Product */}
          <div>
            <h4 className="text-text-light font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/events" className="text-text-muted hover:text-accent-orange transition">
                  Events
                </Link>
              </li>
              <li>
                <Link href="/sponsors" className="text-text-muted hover:text-accent-orange transition">
                  Sponsors
                </Link>
              </li>
              <li>
                <Link href="/match" className="text-text-muted hover:text-accent-orange transition">
                  Matching Engine
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-text-muted hover:text-accent-orange transition">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-text-light font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about" className="text-text-muted hover:text-accent-orange transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-text-muted hover:text-accent-orange transition">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-text-muted hover:text-accent-orange transition">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/legal" className="text-text-muted hover:text-accent-orange transition">
                  Legal & Policies
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-text-light font-semibold mb-4">Contact</h4>
            <div className="space-y-3 text-sm">
              <a
                href="mailto:sponexus.team@gmail.com"
                className="block text-text-muted hover:text-accent-orange transition"
              >
                📧 sponexus.team@gmail.com
              </a>

              <a
                href="tel:+919876543210"
                className="block text-text-muted hover:text-accent-orange transition"
              >
                📱 +91 98765 43210
              </a>

              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 hover:bg-green-500/20 transition"
              >
                💬 WhatsApp Chat
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-5 flex flex-col items-center gap-1 text-center">
          <p className="text-text-muted text-xs">
            © {currentYear} Sponexus. All rights reserved.
          </p>

          <p className="text-text-muted text-xs">
            Connecting Sponsors &amp; Events with Smart Matching
          </p>
        </div>
      </div>
    </footer>
  );
}