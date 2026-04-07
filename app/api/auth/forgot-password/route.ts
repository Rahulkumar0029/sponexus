import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/User';

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({ email }).select('+password');

    // Always return same message (security)
    if (!user) {
      return NextResponse.json(
        { message: 'If this email exists, a reset link has been generated.' },
        { status: 200 }
      );
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Set expiry as Date object (15 minutes)
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Save reset details
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;

    await user.save();

    // Development-only reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    return NextResponse.json(
      {
        message: 'Reset link generated',
        resetLink,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);

    return NextResponse.json(
      { message: 'Server error' },
      { status: 500 }
    );
  }
}