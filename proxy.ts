import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function redirectToDashboard(req: NextRequest, role?: string) {
  const fallback =
    role === "SPONSOR" ? "/dashboard/sponsor" : "/dashboard/organizer";

  return NextResponse.redirect(new URL(fallback, req.url));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("auth-token")?.value;

  if (!token) {
    return redirectToLogin(req);
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    const response = redirectToLogin(req);

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

  const role = payload.role;

  // Role-based create pages
  if (pathname.startsWith("/events/create") && role !== "ORGANIZER") {
    return redirectToDashboard(req, role);
  }

  if (pathname.startsWith("/sponsorships/create") && role !== "SPONSOR") {
    return redirectToDashboard(req, role);
  }

  // Organizer-only dashboard
  if (pathname.startsWith("/dashboard/organizer") && role !== "ORGANIZER") {
    return redirectToDashboard(req, role);
  }

  // Sponsor-only dashboard
  if (pathname.startsWith("/dashboard/sponsor") && role !== "SPONSOR") {
    return redirectToDashboard(req, role);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/create",
    "/sponsorships/create",
    "/match/:path*",
    "/settings/:path*",
    "/deals/:path*",
  ],
};