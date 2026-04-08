import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { EventModel } from '@/models/Event';
import { CreateEventInput } from '@/types/event';

type EventMediaMeta = {
  name: string;
  type: string;
  size: number;
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: CreateEventInput & {
      organizerId: string;
      venueImagesMeta?: EventMediaMeta[];
      pastEventMediaMeta?: EventMediaMeta[];
    } = await request.json();

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
      venueImagesMeta,
      pastEventMediaMeta,
    } = body;

    // Basic validation
    if (
      !title ||
      !description ||
      !organizerId ||
      !location ||
      budget === undefined ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one category is required' },
        { status: 400 }
      );
    }

    const parsedBudget = Number(budget);
    const parsedAttendeeCount = Number(attendeeCount || 100);

    if (Number.isNaN(parsedBudget) || parsedBudget < 0) {
      return NextResponse.json(
        { success: false, message: 'Budget must be a valid non-negative number' },
        { status: 400 }
      );
    }

    if (Number.isNaN(parsedAttendeeCount) || parsedAttendeeCount < 0) {
      return NextResponse.json(
        { success: false, message: 'Attendee count must be a valid non-negative number' },
        { status: 400 }
      );
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Invalid event dates' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizedStartDate = new Date(parsedStartDate);
    normalizedStartDate.setHours(0, 0, 0, 0);

    const normalizedEndDate = new Date(parsedEndDate);
    normalizedEndDate.setHours(0, 0, 0, 0);

    if (normalizedStartDate < today) {
      return NextResponse.json(
        { success: false, message: 'Start date cannot be in the past' },
        { status: 400 }
      );
    }

    if (normalizedEndDate < today) {
      return NextResponse.json(
        { success: false, message: 'End date cannot be in the past' },
        { status: 400 }
      );
    }

    if (normalizedEndDate < normalizedStartDate) {
      return NextResponse.json(
        { success: false, message: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    // Create event
    const event = await EventModel.create({
      title: title.trim(),
      description: description.trim(),
      organizerId,
      categories,
      targetAudience: Array.isArray(targetAudience) ? targetAudience : [],
      location: location.trim(),
      budget: parsedBudget,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      attendeeCount: parsedAttendeeCount,
      eventType: eventType || 'CONFERENCE',
      image: image || '',
      venueImagesMeta: Array.isArray(venueImagesMeta) ? venueImagesMeta : [],
      pastEventMediaMeta: Array.isArray(pastEventMediaMeta) ? pastEventMediaMeta : [],
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