import { withAuth } from 'next-auth/middleware';
import { NextRequest } from 'next/server';

export const middleware = withAuth(
  function middleware(req: NextRequest & { nextauth: any }) {
    const token = req.nextauth.token;
    if (!token) {
      return Response.redirect(new URL('/login', req.url));
    }

    const role = token.role as string;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith('/events/create') && role !== 'ORGANIZER') {
      return Response.redirect(new URL('/dashboard', req.url));
    }

    if (pathname.startsWith('/sponsors/create') && role !== 'SPONSOR') {
      return Response.redirect(new URL('/dashboard', req.url));
    }

    return;
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/events/create',
    '/sponsors/create',
    '/match/:path*',
    '/settings/:path*',
  ],
};
