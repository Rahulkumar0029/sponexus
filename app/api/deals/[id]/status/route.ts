import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { DealModel } from '@/models/Deal';

const allowedTransitions: Record<string, string[]> = {
  pending: ['connected', 'rejected', 'cancelled'],
  connected: ['negotiating', 'completed', 'cancelled', 'disputed'],
  negotiating: ['completed', 'cancelled', 'disputed'],
  completed: [],
  cancelled: [],
  rejected: [],
  disputed: ['negotiating', 'completed', 'cancelled'],
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const dealId = params.id;
    const body = await request.json();
    const { status, actorId, actorRole, finalAmount } = body;

    if (!status || !actorId || !actorRole) {
      return NextResponse.json({ success: false, message: 'Missing status, actorId, or actorRole' }, { status: 400 });
    }

    const deal = await DealModel.findById(dealId);
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

    const currentStatus = deal.status;
    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json({ success: false, message: `Cannot move from ${currentStatus} to ${status}` }, { status: 400 });
    }

    deal.status = status;

    if (status === 'connected') {
      deal.acceptedAt = new Date();
      deal.contactSharedAt = new Date();
    }

    if (status === 'rejected') {
      deal.rejectedAt = new Date();
    }

    if (status === 'completed') {
      deal.completedAt = new Date();
      if (finalAmount !== undefined && finalAmount !== null) {
        const parsedFinal = Number(finalAmount);
        if (Number.isFinite(parsedFinal) && parsedFinal >= 0) {
          deal.finalAmount = parsedFinal;
        }
      }
    }

    if (status === 'cancelled') {
      deal.cancelledAt = new Date();
    }

    await deal.save();

    return NextResponse.json({ success: true, deal });
  } catch (error) {
    console.error('Deal status PATCH error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update deal status' }, { status: 500 });
  }
}
