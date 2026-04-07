import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/User';
import { hashPassword, generateToken } from '@/lib/auth';
import { validateRegistration } from '@/lib/validations';
import { RegisterInput } from '@/types/user';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: RegisterInput = await request.json();
    const { email, password, confirmPassword, role, firstName, lastName, companyName } = body;

    // Validation
    const validation = validateRegistration({
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      companyName,
      role,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await UserModel.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role.toUpperCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      companyName: companyName.trim(),
    });

    // Generate token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user: userResponse,
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Registration failed' },
      { status: 500 }
    );
  }
}
