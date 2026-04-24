import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getCurrentUser } from "@/lib/current-user";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_VIDEO_SIZE = 40 * 1024 * 1024;
const MAX_FILES = 5;
const MAX_FILENAME_LENGTH = 120;
const MAX_TOTAL_UPLOAD_SIZE = 60 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

const UPLOAD_FOLDERS: Record<string, string> = {
  sponsorLogo: "sponexus/sponsor-logos",
  eventImage: "sponexus/event-images",
  eventVideo: "sponexus/event-videos",
  sponsorshipMedia: "sponexus/sponsorship-media",
};

function bufferToDataUri(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function buildNoStoreResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function sanitizeFileName(name: string) {
  const safe = name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return safe.slice(0, MAX_FILENAME_LENGTH) || `file_${Date.now()}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return buildNoStoreResponse(
        { success: false, message: "Authentication required" },
        401
      );
    }

    if (
      user.accountStatus === "SUSPENDED" ||
      user.accountStatus === "DISABLED" ||
      user.isDeleted
    ) {
      return buildNoStoreResponse(
        { success: false, message: "Account access restricted" },
        403
      );
    }

    const formData = await request.formData();
    const uploadType = String(formData.get("uploadType") || "").trim();

    if (!uploadType || !UPLOAD_FOLDERS[uploadType]) {
      return buildNoStoreResponse(
        { success: false, message: "Invalid upload type" },
        400
      );
    }

    const rawFiles = formData.getAll("files");
    const files = rawFiles.filter((item): item is File => item instanceof File);

    if (!files.length) {
      return buildNoStoreResponse(
        { success: false, message: "No files uploaded" },
        400
      );
    }

    if (uploadType === "sponsorLogo" && files.length !== 1) {
      return buildNoStoreResponse(
        { success: false, message: "Sponsor logo requires exactly 1 image" },
        400
      );
    }

    if (files.length > MAX_FILES) {
      return buildNoStoreResponse(
        {
          success: false,
          message: `You can upload a maximum of ${MAX_FILES} files at once.`,
        },
        400
      );
    }

    const totalUploadSize = files.reduce((sum, file) => sum + file.size, 0);

    if (totalUploadSize > MAX_TOTAL_UPLOAD_SIZE) {
      return buildNoStoreResponse(
        { success: false, message: "Total upload size exceeds allowed limit." },
        400
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      const mimeType = file.type;
      const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);

      if (uploadType === "sponsorLogo" && !isImage) {
        return buildNoStoreResponse(
          { success: false, message: "Sponsor logo must be JPG, PNG, or WEBP" },
          400
        );
      }

      if (uploadType === "eventImage" && !isImage) {
        return buildNoStoreResponse(
          { success: false, message: "Event image must be JPG, PNG, or WEBP" },
          400
        );
      }

      if (uploadType === "eventVideo" && !isVideo) {
        return buildNoStoreResponse(
          { success: false, message: "Event video must be MP4 or WEBM" },
          400
        );
      }

      if (uploadType === "sponsorshipMedia" && !isImage) {
        return buildNoStoreResponse(
          {
            success: false,
            message: "Sponsorship media must be JPG, PNG, or WEBP",
          },
          400
        );
      }

      if (!isImage && !isVideo) {
        return buildNoStoreResponse(
          {
            success: false,
            message:
              "Invalid file format. Only JPG, PNG, WEBP images and MP4 or WEBM videos are allowed.",
          },
          400
        );
      }

      if (file.size <= 0) {
        return buildNoStoreResponse(
          { success: false, message: "Empty files are not allowed." },
          400
        );
      }

      if (isImage && file.size > MAX_IMAGE_SIZE) {
        return buildNoStoreResponse(
          { success: false, message: "Image size exceeds 2MB limit." },
          400
        );
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        return buildNoStoreResponse(
          { success: false, message: "Video size exceeds 40MB limit." },
          400
        );
      }

      const safeFileName = sanitizeFileName(file.name);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (!buffer.length) {
        return buildNoStoreResponse(
          { success: false, message: "Empty files are not allowed." },
          400
        );
      }

      const dataUri = bufferToDataUri(buffer, mimeType);
      const folder = `${UPLOAD_FOLDERS[uploadType]}/${String(user._id)}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: isVideo ? "video" : "image",
        public_id: `${Date.now()}_${safeFileName}`,
        overwrite: false,
        unique_filename: true,
        use_filename: false,
      });

      uploadedFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        type: isVideo ? "video" : "image",
        title: safeFileName,
        uploadedAt: new Date(),
      });
    }

    return buildNoStoreResponse(
      {
        success: true,
        files: uploadedFiles,
      },
      200
    );
  } catch (error) {
    console.error("Upload error:", error);

    return buildNoStoreResponse(
      { success: false, message: "Upload failed" },
      500
    );
  }
}