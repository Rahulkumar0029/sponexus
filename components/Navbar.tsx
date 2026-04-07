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

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-dark-layer/80 backdrop-blur-md border-b border-white/10">
      <div className="container-custom px-4 py-4 flex justify-between items-center">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-[0_0_18px_rgba(245,158,11,0.10)]">
            <Image
              src="/logo-circle.jpeg"
              alt="Sponexus Logo"
              fill
              priority
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-2xl font-bold gradient-text">Sponexus</span>
            <span className="hidden sm:block text-[11px] tracking-[0.18em] uppercase text-text-muted/80">
              Smart Matching
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex gap-8 items-center">
          <Link href="/events" className="text-text-light hover:text-accent-orange smooth-transition">
            Events
          </Link>
          <Link href="/sponsors" className="text-text-light hover:text-accent-orange smooth-transition">
            Sponsors
          </Link>
          <Link href="/match" className="text-text-light hover:text-accent-orange smooth-transition">
            Match
          </Link>

          {loading ? (
            <div className="text-text-muted">Loading...</div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-white/10">
              <span className="hidden sm:inline text-text-muted">
                Hello, {user.firstName || user.name}
              </span>

              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
                  Dashboard
                </Button>
              </Link>

              <Link href="/settings" className="text-text-light hover:text-accent-orange smooth-transition">
                Settings
              </Link>

              <button
                onClick={handleLogout}
                className="text-text-light hover:text-accent-orange smooth-transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>

              <Link href="/register">
                <Button variant="primary" size="sm">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-accent-orange text-2xl hover:text-yellow-400 smooth-transition"
          aria-label="Toggle menu"
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-dark-base border-t border-white/10 mt-4 pt-4 space-y-4 pb-4">
          <Link
            href="/events"
            className="block text-text-light hover:text-accent-orange py-2 px-4"
            onClick={() => setIsOpen(false)}
          >
            Events
          </Link>

          <Link
            href="/sponsors"
            className="block text-text-light hover:text-accent-orange py-2 px-4"
            onClick={() => setIsOpen(false)}
          >
            Sponsors
          </Link>

          <Link
            href="/match"
            className="block text-text-light hover:text-accent-orange py-2 px-4"
            onClick={() => setIsOpen(false)}
          >
            Match
          </Link>

          <div className="border-t border-white/10 pt-4 px-4 space-y-3">
            {loading ? (
              <div className="text-text-muted">Loading...</div>
            ) : isAuthenticated && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block text-text-light hover:text-accent-orange py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Dashboard
                </Link>

                <Link
                  href="/settings"
                  className="block text-text-light hover:text-accent-orange py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Settings
                </Link>

                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="block text-text-light hover:text-accent-orange py-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-text-light hover:text-accent-orange py-2"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>

                <Link href="/register" onClick={() => setIsOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}