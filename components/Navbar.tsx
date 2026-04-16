'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from './Button';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
  const router = useRouter();
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isOrganizer = user?.role === 'ORGANIZER';
  const logoHref = isOrganizer ? '/dashboard/organizer' : '/';

  const primaryLinks = isOrganizer
    ? [
        { href: '/sponsorships', label: 'Explore Sponsorships' },
        { href: '/events', label: 'My Events' },
        { href: '/match', label: 'Matches' },
        { href: '/deals', label: 'Deals' },
      ]
    : [
        { href: '/events', label: 'Events' },
        { href: '/sponsors', label: 'Sponsors' },
        { href: '/match', label: 'Match' },
        { href: '/deals', label: 'Deals' },
      ];

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-dark-layer/80 backdrop-blur-md">
      <div className="container-custom flex items-center justify-between px-4 py-4">
        <Link href={logoHref} className="group flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
            <Image src="/logo-circle.jpeg" alt="Sponexus Logo" fill priority className="object-cover transition-transform duration-300 group-hover:scale-105" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-2xl font-bold gradient-text">Sponexus</span>
            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-text-muted/80 sm:block">
              Smart Matching
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className="smooth-transition text-text-light hover:text-accent-orange">
              {link.label}
            </Link>
          ))}

          {loading ? (
            <div className="text-text-muted">Loading...</div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-4 border-l border-white/10 pl-4">
              <span className="hidden text-text-muted sm:inline">Hello, {user.firstName || user.name}</span>
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">Dashboard</Button>
              </Link>
              <Link href="/settings" className="smooth-transition text-text-light hover:text-accent-orange">
                Profile
              </Link>
              <button onClick={handleLogout} className="smooth-transition text-text-light hover:text-accent-orange">
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
              <Link href="/register"><Button variant="primary" size="sm">Register</Button></Link>
            </div>
          )}
        </div>

        <button onClick={() => setIsOpen(!isOpen)} className="text-2xl text-accent-orange md:hidden" aria-label="Toggle menu">
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-2 space-y-2 border-t border-white/10 bg-dark-base px-4 py-4 md:hidden">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className="block py-2 text-text-light" onClick={() => setIsOpen(false)}>
              {link.label}
            </Link>
          ))}

          <div className="border-t border-white/10 pt-3">
            {loading ? (
              <div className="text-text-muted">Loading...</div>
            ) : isAuthenticated && user ? (
              <>
                <Link href="/dashboard" className="block py-2 text-text-light" onClick={() => setIsOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/settings" className="block py-2 text-text-light" onClick={() => setIsOpen(false)}>
                  Profile
                </Link>
                <button onClick={handleLogout} className="block py-2 text-text-light">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block py-2 text-text-light" onClick={() => setIsOpen(false)}>Login</Link>
                <Link href="/register" onClick={() => setIsOpen(false)}>
                  <Button className="w-full">Register</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
