'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-layer border-t border-white/10">
      <div className="container-custom px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold gradient-text mb-3">Sponexus</h3>
            <p className="text-text-muted text-sm mb-4 leading-relaxed max-w-sm">
              The intelligent marketplace connecting event organizers with ideal sponsors. 
              Find perfect partnerships based on data, not guesswork.
            </p>
            <div className="flex gap-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-accent-orange smooth-transition text-xl"
                aria-label="Twitter"
              >
                𝕏
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-accent-orange smooth-transition text-xl"
                aria-label="LinkedIn"
              >
                in
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-accent-orange smooth-transition text-xl"
                aria-label="GitHub"
              >
                ◐
              </a>
            </div>
          </div>

          {/* Products Column */}
          <div>
            <h4 className="text-text-light font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/events"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  href="/sponsors"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Sponsors
                </Link>
              </li>
              <li>
                <Link
                  href="/match"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Matching Engine
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="text-text-light font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="#"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-text-light font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="#"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Cookie Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-text-muted hover:text-accent-orange smooth-transition text-sm"
                >
                  Disclaimer
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-text-muted text-sm">
              © {currentYear} Sponexus. All rights reserved.
            </p>
            <p className="text-text-muted text-xs">
              Built with ❤️ for event organizers and sponsors
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
