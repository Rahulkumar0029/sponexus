'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-dark-layer">
      <div className="container-custom px-4 py-10">
        <div className="mb-8 grid grid-cols-1 items-start gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <h3 className="mb-3 text-2xl font-bold gradient-text">Sponexus</h3>
            <p className="max-w-sm text-sm leading-relaxed text-text-muted">
              A real two-sided marketplace where events and sponsorship campaigns match with clear
              fit logic and controlled deal flow.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-text-light">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/events" className="text-text-muted hover:text-accent-orange">Events</Link></li>
              <li><Link href="/sponsorships" className="text-text-muted hover:text-accent-orange">Sponsorships</Link></li>
              <li><Link href="/match" className="text-text-muted hover:text-accent-orange">Matches</Link></li>
              <li><Link href="/deals" className="text-text-muted hover:text-accent-orange">Deals</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-text-light">Account</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/register" className="text-text-muted hover:text-accent-orange">Register</Link></li>
              <li><Link href="/login" className="text-text-muted hover:text-accent-orange">Login</Link></li>
              <li><Link href="/settings" className="text-text-muted hover:text-accent-orange">Settings</Link></li>
              <li><Link href="/dashboard" className="text-text-muted hover:text-accent-orange">Dashboard</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-5 text-center">
          <p className="text-xs text-text-muted">© {currentYear} Sponexus. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
