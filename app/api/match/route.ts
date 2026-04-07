import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { EventModel } from '@/models/Event';
import { Sponsor } from '@/models/Sponsor';
import { matchSponsorToEvents, matchEventToSponsors } from '@/lib/matcher';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const sponsorId = url.searchParams.get('sponsorId');
    const sponsorOwnerId = url.searchParams.get('sponsorOwnerId');
    const eventId = url.searchParams.get('eventId');

    if ((sponsorId || sponsorOwnerId) && eventId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Provide only sponsorId or eventId, not both',
          matches: [],
        },
        { status: 400 }
      );
    }

    if (!sponsorId && !sponsorOwnerId && !eventId) {
      return NextResponse.json(
        { success: false, message: 'Missing matching query parameter', matches: [] },
        { status: 400 }
      );
    }

    await connectDB();

    if (sponsorId || sponsorOwnerId) {
      const sponsor = sponsorId
        ? await Sponsor.findById(sponsorId)
        : await Sponsor.findOne({ ownerId: sponsorOwnerId });

      if (!sponsor) {
        return NextResponse.json(
          { success: false, message: 'Sponsor profile not found', matches: [] },
          { status: 404 }
        );
      }

      const events = await EventModel.find({ status: { $in: ['PUBLISHED', 'ONGOING'] } });
      const matches = matchSponsorToEvents(sponsor, events);

      return NextResponse.json({ success: true, matches }, { status: 200 });
    }

    if (eventId) {
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid event ID', matches: [] },
          { status: 400 }
        );
      }

      const event = await EventModel.findById(eventId);
      if (!event) {
        return NextResponse.json(
          { success: false, message: 'Event not found', matches: [] },
          { status: 404 }
        );
      }

      const sponsors = await Sponsor.find();
      const matches = matchEventToSponsors(event, sponsors);

      return NextResponse.json({ success: true, matches }, { status: 200 });
    }

    return NextResponse.json(
      { success: false, message: 'Unable to process match request', matches: [] },
      { status: 400 }
    );
  } catch (error) {
    console.error('Match API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to compute matches', matches: [] },
      { status: 500 }
    );
  }
}
