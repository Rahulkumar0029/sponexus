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
      images,
      video,
      organizerProvides,
    } = body;

    if (!title || !description || !organizerId || !location || budget === undefined || !startDate || !endDate) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json({ success: false, message: 'At least one category is required' }, { status: 400 });
    }

    if (!Array.isArray(images) || images.length < 3 || images.length > 5) {
      return NextResponse.json({ success: false, message: 'Please provide 3 to 5 event images' }, { status: 400 });
    }

    if (!Array.isArray(organizerProvides) || organizerProvides.length === 0 || organizerProvides.length > 5) {
      return NextResponse.json(
        { success: false, message: 'Select 1 to 5 sponsor value options' },
        { status: 400 }
      );
    }

    const parsedBudget = Number(budget);
    const parsedAttendeeCount = Number(attendeeCount || 100);

    if (Number.isNaN(parsedBudget) || parsedBudget < 0) {
      return NextResponse.json({ success: false, message: 'Budget must be a valid non-negative number' }, { status: 400 });
    }

    if (Number.isNaN(parsedAttendeeCount) || parsedAttendeeCount <= 0) {
      return NextResponse.json({ success: false, message: 'Attendee count must be greater than 0' }, { status: 400 });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      return NextResponse.json({ success: false, message: 'Invalid event dates' }, { status: 400 });
    }

    if (parsedEndDate < parsedStartDate) {
      return NextResponse.json({ success: false, message: 'End date cannot be before start date' }, { status: 400 });
    }

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
      image: image || images[0],
      coverImage: image || images[0],
      images,
      video: video || '',
      organizerProvides,
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
    return NextResponse.json({ success: false, message: 'Event creation failed' }, { status: 500 });
  }
}
