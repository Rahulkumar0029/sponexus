import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Sponsor } from '@/models/Sponsor';
import { validateSponsor } from '@/lib/validations';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is a sponsor
    const user = session.user as any;
    if (user.role !== 'SPONSOR') {
      return NextResponse.json(
        { success: false, message: 'Only sponsors can create sponsor profiles' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = validateSponsor(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Check if user already has a sponsor profile
    const existingSponsor = await Sponsor.findOne({ ownerId: user.id });
    if (existingSponsor) {
      return NextResponse.json(
        { success: false, message: 'You already have a sponsor profile' },
        { status: 400 }
      );
    }

    // Create sponsor
    const sponsor = new Sponsor({
      ...body,
      ownerId: user.id,
    });

    await sponsor.save();

    return NextResponse.json({
      success: true,
      sponsor: {
        _id: sponsor._id,
        brandName: sponsor.brandName,
        description: sponsor.description,
        budget: sponsor.budget,
        preferredCategories: sponsor.preferredCategories,
        targetAudience: sponsor.targetAudience,
        locationPreference: sponsor.locationPreference,
        createdAt: sponsor.createdAt,
      },
    });

  } catch (error) {
    console.error('Error creating sponsor:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
