import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  response.cookies.set("user-role", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}

function redirectToDashboard(req: NextRequest, role?: string) {
  const fallback =
    role === "SPONSOR" ? "/dashboard/sponsor" : "/dashboard/organizer";

  return NextResponse.redirect(new URL(fallback, req.url));
}

function rewriteToUnavailable(req: NextRequest) {
  return NextResponse.rewrite(new URL("/_not-found", req.url));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth-token")?.value;

  const isFounderAccessRoute =
    pathname === "/founder-access-yr118" ||
    pathname.startsWith("/founder-access-yr118/");

  if (isFounderAccessRoute) {
    if (!token) {
      return NextResponse.next();
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return clearAuthCookies(NextResponse.next());
    }

    if (payload.adminRole && payload.adminRole !== "NONE") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return rewriteToUnavailable(req);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!token) {
      return rewriteToUnavailable(req);
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
      return clearAuthCookies(rewriteToUnavailable(req));
    }

    const adminRole = payload.adminRole || "NONE";

    if (adminRole === "NONE") {
      return rewriteToUnavailable(req);
    }

    return NextResponse.next();
  }

  if (!token) {
    return redirectToLogin(req);
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    return clearAuthCookies(redirectToLogin(req));
  }

  const role = payload.role;

  if (pathname.startsWith("/events/create") && role !== "ORGANIZER") {
    return redirectToDashboard(req, role);
  }

  if (pathname.startsWith("/sponsorships/create") && role !== "SPONSOR") {
    return redirectToDashboard(req, role);
  }

  if (pathname.startsWith("/dashboard/organizer") && role !== "ORGANIZER") {
    return redirectToDashboard(req, role);
  }

  if (pathname.startsWith("/dashboard/sponsor") && role !== "SPONSOR") {
    return redirectToDashboard(req, role);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/founder-access-yr118",
    "/founder-access-yr118/:path*",
    "/dashboard/:path*",
    "/events/create",
    "/sponsorships/create",
    "/match/:path*",
    "/settings/:path*",
    "/deals/:path*",
  ],
};