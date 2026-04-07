import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { EventModel } from '@/models/Event';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const organizer = searchParams.get('organizer');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Build query
    const query: any = { status: { $ne: 'DRAFT' } }; // Don't show draft events in listings

    if (organizer) {
      query.organizerId = organizer;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    // Fetch events
    const events = await EventModel.find(query)
      .sort({ startDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('organizerId', 'firstName lastName companyName');

    const total = await EventModel.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        events,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
