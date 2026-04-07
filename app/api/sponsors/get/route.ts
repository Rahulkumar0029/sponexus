import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Sponsor } from '@/models/Sponsor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const category = searchParams.get('category');
    const location = searchParams.get('location');

    // Build query
    const query: any = {};

    if (category) {
      query.preferredCategories = { $in: [category] };
    }

    if (location) {
      query.locationPreference = { $regex: location, $options: 'i' };
    }

    // Connect to database
    await connectDB();

    // Fetch sponsors
    const sponsors = await Sponsor.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Sponsor.countDocuments(query);

    return NextResponse.json({
      success: true,
      sponsors,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching sponsors:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sponsors' },
      { status: 500 }
    );
  }
}
