import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { DealModel } from '@/models/Deal';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const { reason, actorId, actorRole } = await request.json();
    if (!reason || !actorId || !actorRole) {
      return NextResponse.json({ success: false, message: 'Missing reason, actorId, or actorRole' }, { status: 400 });
    }

    const deal = await DealModel.findById(params.id);
    if (!deal) {
      return NextResponse.json({ success: false, message: 'Deal not found' }, { status: 404 });
    }

    const isOrganizer = String(deal.organizerId) === actorId;
    const isSponsor = String(deal.sponsorId) === actorId;

    if (!isOrganizer && !isSponsor) {
      return NextResponse.json({ success: false, message: 'Unauthorized deal access' }, { status: 403 });
    }

    if ((isOrganizer && actorRole !== 'ORGANIZER') || (isSponsor && actorRole !== 'SPONSOR')) {
      return NextResponse.json({ success: false, message: 'Role mismatch' }, { status: 403 });
    }

    deal.status = 'disputed';
    deal.disputeReason = reason.trim();
    deal.disputeReportedBy = isOrganizer ? 'organizer' : 'sponsor';
    deal.disputeReportedAt = new Date();

    await deal.save();

    return NextResponse.json({ success: true, deal });
  } catch (error) {
    console.error('Deal dispute PATCH error:', error);
    return NextResponse.json({ success: false, message: 'Failed to report dispute' }, { status: 500 });
  }
}
