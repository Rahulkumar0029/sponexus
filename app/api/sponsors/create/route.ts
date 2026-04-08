import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import { Sponsor } from '@/models/Sponsor';
import { validateSponsor } from '@/lib/validations';
import { authOptions } from '@/lib/nextAuthOptions';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    if (user.role !== 'SPONSOR') {
      return NextResponse.json(
        { success: false, message: 'Only sponsors can create sponsor profiles' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const validation = validateSponsor(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.message || 'Invalid sponsor data' },
        { status: 400 }
      );
    }

    await connectDB();

    const existingSponsor = await Sponsor.findOne({ ownerId: user.id });
    if (existingSponsor) {
      return NextResponse.json(
        { success: false, message: 'You already have a sponsor profile' },
        { status: 400 }
      );
    }

    const sponsor = await Sponsor.create({
      ...body,
      ownerId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Sponsor profile created successfully',
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating sponsor:', error);

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}