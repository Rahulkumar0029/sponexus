import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { EventModel } from '@/models/Event';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const eventId = params.id;

    // ✅ Validate ID
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const event = await EventModel.findById(eventId)
      .populate('organizerId', 'firstName lastName companyName')
      .lean();

    // ❌ Not found
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    // 🚫 Prevent showing draft events publicly
    if (event.status === 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Event not available' },
        { status: 403 }
      );
    }

    // 📊 Add computed fields (VERY IMPORTANT for frontend)
    const isPast = event.endDate ? new Date(event.endDate) < today : false;
    const isActive =
      event.status === 'PUBLISHED' || event.status === 'ONGOING';

    return NextResponse.json(
      {
        success: true,
        event: {
          ...event,
          isPast,
          isActive,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching event:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}