import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { comparePasswords, generateToken } from "@/lib/auth";
import { validateLogin } from "@/lib/validations";
import { LoginInput } from "@/types/user";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: LoginInput = await request.json();
    const { email, password } = body;

    const validation = validateLogin({ email, password });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = generateToken({
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });

    const safeUser = {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: user.companyName,
      avatar: user.avatar || "",
      bio: user.bio || "",
      phone: user.phone || "",
      organizationName: user.organizationName || "",
      eventFocus: user.eventFocus || "",
      organizerTargetAudience: user.organizerTargetAudience || "",
      organizerLocation: user.organizerLocation || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: safeUser,
        token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { success: false, message: "Login failed" },
      { status: 500 }
    );
  }
}