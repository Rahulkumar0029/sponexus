'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from './Button';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, isAuthenticated, logout } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isOrganizer = user?.role === 'ORGANIZER';

  const publicNav = [
    { label: 'Events', href: '/events' },
    { label: 'Sponsors', href: '/sponsors' },
    { label: 'Match', href: '/match' },
  ];

  const appNav = useMemo(() => {
    if (!user) return [];

    if (isOrganizer) {
      return [
        { label: 'Dashboard', href: '/dashboard/organizer' },
        { label: 'My Events', href: '/events' },
        { label: 'Find Sponsors', href: '/sponsors' },
        { label: 'Matches', href: '/match' },
        { label: 'Deals', href: '/deals' },
        { label: 'Create Event', href: '/events/create', cta: true },
      ];
    }

    return [
      { label: 'Dashboard', href: '/dashboard/sponsor' },
      { label: 'Find Events', href: '/events' },
      { label: 'My Sponsorships', href: '/sponsorships' },
      { label: 'Matches', href: '/match' },
      { label: 'Deals', href: '/deals' },
      { label: 'Create Sponsorship', href: '/sponsorships/create', cta: true },
    ];
  }, [user, isOrganizer]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setProfileOpen(false);
      setIsOpen(false);
      router.push('/');
    }
  };

  const renderNavLink = (item: { label: string; href: string; cta?: boolean }) => {
    const isActive =
      pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

    if (item.cta) {
      return (
        <Link key={item.href} href={item.href}>
          <Button variant="primary" size="sm">
            {item.label}
          </Button>
        </Link>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`smooth-transition ${
          isActive
            ? 'text-accent-orange'
            : 'text-text-light hover:text-accent-orange'
        }`}
      >
        {item.label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-dark-layer/80 backdrop-blur-md">
      <div className="container-custom flex items-center justify-between px-4 py-4">
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-3">
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
            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-text-muted/80 sm:block">
              Smart Matching
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {!loading && !isAuthenticated && publicNav.map(renderNavLink)}

          {!loading && isAuthenticated && user && appNav.map(renderNavLink)}

          {loading ? (
            <div className="text-text-muted">Loading...</div>
          ) : isAuthenticated && user ? (
            <div className="relative ml-2 border-l border-white/10 pl-4">
              <button
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-light transition hover:border-white/20 hover:bg-white/10"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-orange/15 font-semibold text-accent-orange">
                  {(user.firstName || user.name || 'U').charAt(0).toUpperCase()}
                </span>
                <div className="hidden text-left lg:block">
                  <p className="max-w-[140px] truncate text-sm font-medium text-white">
                    {user.firstName || user.name}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-text-muted">
                    {user.role === 'ORGANIZER' ? 'Organizer' : 'Sponsor'}
                  </p>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-white/10 bg-dark-base shadow-2xl">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="truncate text-sm font-medium text-white">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-text-muted">{user.email}</p>
                  </div>

                  <div className="py-2">
                    <Link
                      href="/settings"
                      className="block px-4 py-3 text-sm text-text-light transition hover:bg-white/5 hover:text-accent-orange"
                      onClick={() => setProfileOpen(false)}
                    >
                      Settings
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-3 text-left text-sm text-text-light transition hover:bg-white/5 hover:text-accent-orange"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="primary" size="sm">
                  Login
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-2xl text-accent-orange smooth-transition hover:text-yellow-400 md:hidden"
          aria-label="Toggle menu"
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-t border-white/10 bg-dark-base pb-4 pt-4 md:hidden">
          <div className="space-y-1 px-4">
            {!loading &&
              !isAuthenticated &&
              publicNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl px-4 py-3 text-text-light transition hover:bg-white/5 hover:text-accent-orange"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

            {!loading && isAuthenticated && user && (
              <>
                <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-accent-orange">
                    {user.role === 'ORGANIZER' ? 'Organizer' : 'Sponsor'}
                  </p>
                </div>

                {appNav.map((item) =>
                  item.cta ? (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                    >
                      <Button variant="primary" className="mt-2 w-full">
                        {item.label}
                      </Button>
                    </Link>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-xl px-4 py-3 text-text-light transition hover:bg-white/5 hover:text-accent-orange"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )
                )}

                <div className="mt-4 border-t border-white/10 pt-4">
                  <Link
                    href="/settings"
                    className="block rounded-xl px-4 py-3 text-text-light transition hover:bg-white/5 hover:text-accent-orange"
                    onClick={() => setIsOpen(false)}
                  >
                    Settings
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="block w-full rounded-xl px-4 py-3 text-left text-text-light transition hover:bg-white/5 hover:text-accent-orange"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}

            {!loading && !isAuthenticated && (
              <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}