import { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth";
import AdminLogoutButton from "@/app/admin/components/AdminLogoutButton";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const token = cookies().get("auth-token")?.value;
  const payload = token ? verifyAccessToken(token) : null;

  if (!payload || !payload.adminRole || payload.adminRole === "NONE") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-white/10 bg-[#07152F] lg:border-b-0 lg:border-r">
          <div className="sticky top-0 p-6">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.3em] text-[#94A3B8]">
                Sponexus
              </p>
              <h1 className="mt-2 text-2xl font-semibold">Admin Panel</h1>
              <p className="mt-2 text-sm text-[#94A3B8]">
                Founder control, moderation, and security.
              </p>
            </div>

            <nav className="space-y-2">
              <Link
                href="/admin"
                className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/5"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/5"
              >
                Users
              </Link>
              <Link
                href="/admin/events"
                className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/5"
              >
                Events
              </Link>
              <Link
                href="/admin/sponsorships"
                className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/5"
              >
                Sponsorships
              </Link>
              <Link
                href="/admin/deals"
                className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/5"
              >
                Deals
              </Link>
              <Link
                href="/admin/search"
                className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/5"
              >
                Search
              </Link>
              <Link
                href="/admin/security"
                className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/5"
              >
                Security
              </Link>
              <Link
                href="/admin/audit-logs"
                className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/5"
              >
                Audit Logs
              </Link>
            </nav>

            <div className="mt-8 border-t border-white/10 pt-6">
              <AdminLogoutButton />
            </div>
          </div>
        </aside>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}