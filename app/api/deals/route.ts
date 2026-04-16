import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { DealModel } from '@/models/Deal';
import { EventModel } from '@/models/Event';
import Sponsorship from '@/models/Sponsorship';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    if (!userId || !role) {
      return NextResponse.json({ success: false, message: 'Missing userId or role' }, { status: 400 });
    }

    const query = role === 'SPONSOR' ? { sponsorId: userId } : { organizerId: userId };

    const deals = await DealModel.find(query)
      .populate('eventId', 'title location categories targetAudience organizerProvides')
      .populate('sponsorshipId', 'sponsorshipTitle budget category targetAudience locationPreference contactPersonName contactPhone')
      .populate('organizerId', 'name email phone')
      .populate('sponsorId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = deals.map((deal: any) => {
      const isConnected = ['connected', 'negotiating', 'completed'].includes(deal.status);
      const isSponsorViewer = role === 'SPONSOR';
      const counterparty = isSponsorViewer ? deal.organizerId : deal.sponsorId;

      return {
        _id: String(deal._id),
        organizerId: String(deal.organizerId?._id || deal.organizerId),
        sponsorId: String(deal.sponsorId?._id || deal.sponsorId),
        eventId: String(deal.eventId?._id || deal.eventId),
        sponsorshipId: String(deal.sponsorshipId?._id || deal.sponsorshipId),
        initiatedBy: deal.initiatedBy,
        status: deal.status,
        proposedAmount: deal.proposedAmount,
        finalAmount: deal.finalAmount,
        message: deal.message,
        contactSharedAt: deal.contactSharedAt,
        acceptedAt: deal.acceptedAt,
        rejectedAt: deal.rejectedAt,
        completedAt: deal.completedAt,
        cancelledAt: deal.cancelledAt,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
        disputeReason: deal.disputeReason,
        disputeReportedBy: deal.disputeReportedBy,
        disputeReportedAt: deal.disputeReportedAt,
        eventTitle: deal.eventId?.title || 'Event',
        sponsorshipTitle: deal.sponsorshipId?.sponsorshipTitle || 'Sponsorship',
        counterpartyName: counterparty?.name || 'User',
        canViewContact: isConnected,
        counterpartyContact: isConnected
          ? {
              phone: counterparty?.phone || '',
              email: counterparty?.email || '',
              name: counterparty?.name || '',
            }
          : undefined,
      };
    });

    return NextResponse.json({ success: true, deals: formatted });
  } catch (error) {
    console.error('Deals GET error:', error);
    return NextResponse.json({ success: false, message: 'Failed to load deals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      organizerId,
      sponsorId,
      eventId,
      sponsorshipId,
      initiatedBy,
      proposedAmount,
      message,
      expiresAt,
    } = body;

    if (!organizerId || !sponsorId || !eventId || !sponsorshipId || !initiatedBy) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    if (!['organizer', 'sponsor'].includes(initiatedBy)) {
      return NextResponse.json({ success: false, message: 'Invalid initiator' }, { status: 400 });
    }

    const amount = Number(proposedAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ success: false, message: 'Invalid proposed amount' }, { status: 400 });
    }

    const [organizer, sponsor, event, sponsorship] = await Promise.all([
      User.findById(organizerId),
      User.findById(sponsorId),
      EventModel.findById(eventId),
      Sponsorship.findById(sponsorshipId),
    ]);

    if (!organizer || !sponsor || !event || !sponsorship) {
      return NextResponse.json({ success: false, message: 'Invalid relation entities' }, { status: 404 });
    }

    const existing = await DealModel.findOne({ organizerId, sponsorId, eventId, sponsorshipId });
    if (existing && ['pending', 'connected', 'negotiating'].includes(existing.status)) {
      return NextResponse.json({ success: false, message: 'An active deal already exists for this pair' }, { status: 409 });
    }

    const deal = await DealModel.create({
      organizerId,
      sponsorId,
      eventId,
      sponsorshipId,
      initiatedBy,
      status: 'pending',
      proposedAmount: amount,
      message: (message || '').trim(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    return NextResponse.json({ success: true, deal }, { status: 201 });
  } catch (error) {
    console.error('Deals POST error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create deal' }, { status: 500 });
  }
}
