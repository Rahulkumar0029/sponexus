import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { EventModel } from '@/models/Event';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const eventId = params.id;

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }

    const event = await EventModel.findById(eventId).populate(
      'organizerId',
      'firstName lastName companyName'
    );

    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        event,
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