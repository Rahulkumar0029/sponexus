import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/User';
import { Sponsor } from '@/models/Sponsor';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await UserModel.findById(userId).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    let sponsorProfile = null;

    if (role === 'SPONSOR') {
      sponsorProfile = await Sponsor.findOne({ ownerId: String(user._id) }).lean();
    }

    return NextResponse.json(
      {
        success: true,
        user,
        sponsorProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Settings me error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load settings' },
      { status: 500 }
    );
  }
}