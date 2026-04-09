import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Sponsor } from '@/models/Sponsor';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const category = searchParams.get('category');
    const location = searchParams.get('location');

    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit = Number.isNaN(limit) || limit < 1 ? 12 : limit;

    const query: any = {};

    if (category) {
      query.preferredCategories = { $in: [category] };
    }

    if (location) {
      query.locationPreference = { $regex: location, $options: 'i' };
    }

    // Only show sponsors that have meaningful profile data
    query.brandName = { $exists: true, $ne: '' };
    query.preferredCategories = query.preferredCategories || { $exists: true, $ne: [] };
    query.officialPhone = { $exists: true, $ne: '' };

    const sponsors = await Sponsor.find(query)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit);

    const total = await Sponsor.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        sponsors,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          pages: Math.ceil(total / safeLimit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching sponsors:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to fetch sponsors' },
      { status: 500 }
    );
  }
}