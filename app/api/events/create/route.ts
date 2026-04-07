import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { EventModel } from '@/models/Event';
import { CreateEventInput } from '@/types/event';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: CreateEventInput & { organizerId: string } = await request.json();

    const {
      title,
      description,
      organizerId,
      categories,
      targetAudience,
      location,
      budget,
      startDate,
      endDate,
      attendeeCount,
      eventType,
      image,
    } = body;

    // Validation
    if (!title || !description || !organizerId || !categories || !location || budget === undefined) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create event
    const event = await EventModel.create({
      title,
      description,
      organizerId,
      categories,
      targetAudience: targetAudience || [],
      location,
      budget,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      attendeeCount,
      eventType,
      image,
      status: 'PUBLISHED',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Event created successfully',
        event,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Event creation failed' },
      { status: 500 }
    );
  }
}
