import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { SponsorshipModel } from '@/models/Sponsorship';
import { Sponsor } from '@/models/Sponsor';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      sponsorOwnerId,
      sponsorshipTitle,
      sponsorshipType,
      budget,
      category,
      targetAudience,
      city,
      locationPreference,
      campaignGoal,
      deliverablesExpected,
      customMessage,
      bannerRequirement,
      stallRequirement,
      mikeAnnouncement,
      socialMediaMention,
      productDisplay,
      contactPersonName,
      contactPhone,
    } = body;

    if (!sponsorOwnerId || !mongoose.Types.ObjectId.isValid(sponsorOwnerId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid sponsor owner ID' },
        { status: 400 }
      );
    }

    const sponsorProfile = await Sponsor.findOne({ ownerId: String(sponsorOwnerId) });

    if (!sponsorProfile) {
      return NextResponse.json(
        { success: false, message: 'Sponsor profile not found. Complete profile first.' },
        { status: 400 }
      );
    }

    if (!sponsorshipTitle?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Sponsorship title is required' },
        { status: 400 }
      );
    }

    if (!sponsorshipType?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Sponsorship type is required' },
        { status: 400 }
      );
    }

    if (!budget || Number.isNaN(Number(budget)) || Number(budget) < 0) {
      return NextResponse.json(
        { success: false, message: 'Valid budget is required' },
        { status: 400 }
      );
    }

    if (!category?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Category is required' },
        { status: 400 }
      );
    }

    if (!targetAudience?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Target audience is required' },
        { status: 400 }
      );
    }

    if (!locationPreference?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Location preference is required' },
        { status: 400 }
      );
    }

    if (!campaignGoal?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Campaign goal is required' },
        { status: 400 }
      );
    }

    if (!contactPhone?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Contact phone is required' },
        { status: 400 }
      );
    }

    const sponsorship = await SponsorshipModel.create({
      sponsorOwnerId,
      sponsorProfileId: sponsorProfile._id,

      sponsorshipTitle: sponsorshipTitle.trim(),
      sponsorshipType: sponsorshipType.trim(),
      budget: Number(budget),
      category: category.trim(),
      targetAudience: targetAudience.trim(),
      city: city?.trim() || '',
      locationPreference: locationPreference.trim(),
      campaignGoal: campaignGoal.trim(),
      deliverablesExpected: deliverablesExpected?.trim() || '',
      customMessage: customMessage?.trim() || '',

      bannerRequirement: Boolean(bannerRequirement),
      stallRequirement: Boolean(stallRequirement),
      mikeAnnouncement: Boolean(mikeAnnouncement),
      socialMediaMention: Boolean(socialMediaMention),
      productDisplay: Boolean(productDisplay),

      contactPersonName: contactPersonName?.trim() || '',
      contactPhone: contactPhone.trim(),

      status: 'active',
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Sponsorship created successfully',
        sponsorship,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating sponsorship:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to create sponsorship' },
      { status: 500 }
    );
  }
}