import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Sponsor from "@/models/Sponsor";
import { hashPassword, generateToken } from "@/lib/auth";
import { validateRegistration } from "@/lib/validations";
import { RegisterInput } from "@/types/user";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: RegisterInput = await request.json();
    const { email, password, confirmPassword, role, firstName, lastName, companyName } =
      body;

    const normalizedRole = role.toUpperCase() as "ORGANIZER" | "SPONSOR";

    const validation = validateRegistration({
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      companyName,
      role: normalizedRole,
    });

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

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      role: normalizedRole,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      companyName: companyName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`.trim(),
    });

    if (normalizedRole === "SPONSOR") {
      await Sponsor.create({
        userId: user._id,
        brandName: companyName.trim(),
        companyName: companyName.trim(),
        website: "",
        officialEmail: email.toLowerCase(),
        phone: "",
        industry: "",
        companySize: "",
        about: "",
        logoUrl: "",
        targetAudience: "",
        preferredCategories: [],
        preferredLocations: [],
        sponsorshipInterests: [],
        instagramUrl: "",
        linkedinUrl: "",
        isProfileComplete: false,
        isPublic: true,
      });
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
        message: "User registered successfully",
        user: safeUser,
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    return NextResponse.json(
      { success: false, message: "Registration failed" },
      { status: 500 }
    );
  }
}