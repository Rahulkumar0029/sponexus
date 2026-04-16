import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Sponsor from "@/models/Sponsor";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid sponsor ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const sponsor = await Sponsor.findById(id);

    if (!sponsor) {
      return NextResponse.json(
        { success: false, message: "Sponsor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: sponsor,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching sponsor:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch sponsor" },
      { status: 500 }
    );
  }
}