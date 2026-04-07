import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Sponsor } from '@/models/Sponsor';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Sponsor ID is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Fetch sponsor
    const sponsor = await Sponsor.findById(id);

    if (!sponsor) {
      return NextResponse.json(
        { success: false, message: 'Sponsor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sponsor,
    });

  } catch (error) {
    console.error('Error fetching sponsor:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sponsor' },
      { status: 500 }
    );
  }
}