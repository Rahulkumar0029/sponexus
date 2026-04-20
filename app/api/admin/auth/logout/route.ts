import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import AdminSession from "@/lib/models/AdminSession";
import { hashToken } from "@/lib/auth";
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const rawAdminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

    if (rawAdminToken) {
      const tokenHash = hashToken(rawAdminToken);

      await AdminSession.findOneAndUpdate(
        {
          sessionTokenHash: tokenHash,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
            revokeReason: "Admin logged out",
          },
        }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Admin logout successful",
      },
      { status: 200 }
    );

    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      ...getAdminSessionCookieOptions(),
      expires: new Date(0),
      maxAge: 0,
    });

    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });

    response.cookies.set("user-role", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Admin logout error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to logout admin",
      },
      { status: 500 }
    );
  }
}