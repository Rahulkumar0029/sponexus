import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { UserModel } from '@/models/User';
import { Sponsor } from '@/models/Sponsor';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      userId,
      role,

      firstName,
      lastName,
      phone,
      bio,

      organizationName,
      eventFocus,
      organizerTargetAudience,
      organizerLocation,

      brandName,
      preferredCategories,
      sponsorTargetAudience,
      locationPreference,
      website,
      officialEmail,
      officialPhone,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { success: false, message: 'User role is required' },
        { status: 400 }
      );
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Shared user fields
    user.firstName = firstName?.trim() || '';
    user.lastName = lastName?.trim() || '';
    user.name = `${user.firstName} ${user.lastName}`.trim();
    user.phone = phone?.trim() || '';
    user.bio = bio?.trim() || '';

    // Organizer fixed fields
    if (role === 'ORGANIZER') {
      (user as any).organizationName = organizationName?.trim() || '';
      (user as any).eventFocus = eventFocus?.trim() || '';
      (user as any).organizerTargetAudience = organizerTargetAudience?.trim() || '';
      (user as any).organizerLocation = organizerLocation?.trim() || '';
    }

    await user.save();

    let sponsorProfile = null;

    // Sponsor fixed fields
    if (role === 'SPONSOR') {
      sponsorProfile = await Sponsor.findOne({ ownerId: String(user._id) });

      if (!sponsorProfile) {
        sponsorProfile = await Sponsor.create({
          ownerId: String(user._id),
          brandName: brandName?.trim() || user.companyName || '',
          description: bio?.trim() || '',
          preferredCategories:
            Array.isArray(preferredCategories) && preferredCategories.length > 0
              ? preferredCategories
              : ['Technology'],
          targetAudience: sponsorTargetAudience?.trim() || '',
          locationPreference: locationPreference?.trim() || '',
          website: website?.trim() || '',
          officialEmail: officialEmail?.trim() || user.email,
          officialPhone: officialPhone?.trim() || '',
        });
      } else {
        sponsorProfile.brandName = brandName?.trim() || sponsorProfile.brandName;
        sponsorProfile.description = bio?.trim() || '';
        sponsorProfile.preferredCategories =
          Array.isArray(preferredCategories) && preferredCategories.length > 0
            ? preferredCategories
            : sponsorProfile.preferredCategories;
        sponsorProfile.targetAudience = sponsorTargetAudience?.trim() || '';
        sponsorProfile.locationPreference = locationPreference?.trim() || '';
        sponsorProfile.website = website?.trim() || '';
        sponsorProfile.officialEmail = officialEmail?.trim() || user.email;
        sponsorProfile.officialPhone = officialPhone?.trim() || '';

        await sponsorProfile.save();
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Settings updated successfully',
        user,
        sponsorProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Settings update error:', error);

    return NextResponse.json(
      { success: false, message: 'Failed to update settings' },
      { status: 500 }
    );
  }
}