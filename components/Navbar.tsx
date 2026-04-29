'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from './Button';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';

type NavItem = {
  label: string;
  href: string;
  cta?: boolean;
};

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    loading,
    isAuthenticated,
    logout,
    isAdmin,
    isOrganizer,
    isSponsor,
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const publicNav: NavItem[] = [
    { label: 'Events', href: '/events' },
    { label: 'Sponsors', href: '/sponsors' },
    { label: 'Match', href: '/match' },
  ];

  const appNav = useMemo<NavItem[]>(() => {
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

    if (isSponsor) {
      return [
        { label: 'Dashboard', href: '/dashboard/sponsor' },
        { label: 'Find Events', href: '/events' },
        { label: 'My Sponsorships', href: '/sponsorships' },
        { label: 'Matches', href: '/match' },
        { label: 'Deals', href: '/deals' },
        { label: 'Create Sponsorship', href: '/sponsorships/create', cta: true },
      ];
    }

    return [];
  }, [user, isOrganizer, isSponsor]);

  const adminNav = useMemo<NavItem[]>(() => {
    if (!isAdmin) return [];

    return [{ label: 'Admin', href: '/admin' }];
  }, [isAdmin]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setProfileOpen(false);
      setIsOpen(false);
      router.push('/');
    }
  };

  const userRoleLabel = isAdmin
    ? 'Admin'
    : isOrganizer
    ? 'Organizer'
    : isSponsor
    ? 'Sponsor'
    : 'User';

  const desktopNav = isAuthenticated && user ? [...adminNav, ...appNav] : publicNav;
  const mobileNav = desktopNav;

  const renderNavLink = (item: NavItem) => {
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
        className={`smooth-transition relative text-sm font-medium ${
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
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-[0_0_18px_rgba(255,122,24,0.14)]">
            <Image
              src="/logo-circle.jpeg"
              alt="Sponexus Logo"
              fill
              priority
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          <div className="flex flex-col leading-none">
            <span className="flex items-center text-[1.9rem] font-extrabold tracking-[-0.03em]">
              <span className="bg-gradient-to-r from-[#FF7A18] to-[#FFB347] bg-clip-text text-transparent">
                Spon
              </span>
              <span className="text-white">Exus</span>
            </span>

            <span className="hidden text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]/80 sm:block">
              Smart Matching
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {!loading && desktopNav.map(renderNavLink)}

          {loading ? (
            <div className="text-sm text-text-muted">Loading...</div>
         ) : isAuthenticated && user ? (
  <div className="flex items-center gap-3">
    <NotificationBell />

    <div className="relative border-l border-white/10 pl-4">
              <button
                onClick={() => setProfileOpen((prev) => !prev)}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-sm text-text-light shadow-[0_8px_30px_rgba(0,0,0,0.22)] transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FF7A18]/20 bg-gradient-to-br from-[#FF7A18]/20 to-[#FFB347]/10 font-semibold text-[#FFB347]">
                  {(user.firstName || user.name || 'U').charAt(0).toUpperCase()}
                </span>

                <div className="hidden min-w-0 text-left lg:block">
                  <p className="max-w-[150px] truncate text-sm font-semibold text-white">
                    {user.firstName || user.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
                    {userRoleLabel}
                  </p>
                </div>

                <svg
                  className={`hidden h-4 w-4 text-text-muted transition-transform duration-200 lg:block ${
                    profileOpen ? 'rotate-180' : ''
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-[320px] overflow-hidden rounded-3xl border border-white/10 bg-[#07152F]/95 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                  <div className="border-b border-white/10 bg-white/[0.03] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#FF7A18]/20 bg-gradient-to-br from-[#FF7A18]/20 to-[#FFB347]/10 font-semibold text-[#FFB347]">
                        {(user.firstName || user.name || 'U').charAt(0).toUpperCase()}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {user.firstName || user.name}
                        </p>
                        <p className="truncate text-xs text-text-muted">{user.email}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#FFB347]">
                          {userRoleLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-text-light transition hover:bg-white/[0.05] hover:text-white"
                        onClick={() => setProfileOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}

                    <Link
                      href="/settings"
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-text-light transition hover:bg-white/[0.05] hover:text-white"
                      onClick={() => setProfileOpen(false)}
                    >
                      Profile Settings
                    </Link>

                    <Link
                      href="/pricing"
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-text-light transition hover:bg-white/[0.05] hover:text-white"
                      onClick={() => setProfileOpen(false)}
                    >
                      Plans & Billing
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium text-text-light transition hover:bg-white/[0.05] hover:text-white"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/pricing">
                <Button variant="secondary" size="sm">
                  Pricing
                </Button>
              </Link>

              <Link href="/login">
                <Button variant="primary" size="sm">
                  Login
                </Button>
              </Link>
            </div>
          )}
        </div>
        

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-2xl text-accent-orange smooth-transition hover:text-[#FFB347] md:hidden"
          aria-label="Toggle menu"
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-white/10 bg-[#020617]/95 pb-4 pt-4 backdrop-blur-xl md:hidden">
          <div className="space-y-2 px-4">
            {!loading &&
              mobileNav.map((item) =>
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
                    className="block rounded-2xl px-4 py-3 text-sm font-medium text-text-light transition hover:bg-white/[0.05] hover:text-accent-orange"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                )
              )}

              {!loading && isAuthenticated && user && (
  <div className="mb-3 flex justify-end">
    <NotificationBell />
  </div>
)}

            {!loading && isAuthenticated && user && (
              <div className="mb-4 mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
                <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#FF7A18]/20 bg-gradient-to-br from-[#FF7A18]/20 to-[#FFB347]/10 font-semibold text-[#FFB347]">
                      {(user.firstName || user.name || 'U').charAt(0).toUpperCase()}
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {user.firstName || user.name}
                      </p>
                      <p className="truncate text-xs text-text-muted">{user.email}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#FFB347]">
                        {userRoleLabel}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-text-light transition hover:bg-white/[0.05] hover:text-white"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  <Link
                    href="/settings"
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-text-light transition hover:bg-white/[0.05] hover:text-white"
                    onClick={() => setIsOpen(false)}
                  >
                    Profile Settings
                  </Link>

                  <Link
                    href="/pricing"
                    className="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-text-light transition hover:bg-white/[0.05] hover:text-white"
                    onClick={() => setIsOpen(false)}
                  >
                    Plans & Billing
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium text-text-light transition hover:bg-white/[0.05] hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}

            {!loading && !isAuthenticated && (
              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                <Link href="/pricing" onClick={() => setIsOpen(false)}>
                  <Button variant="secondary" className="w-full">
                    Pricing
                  </Button>
                </Link>

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