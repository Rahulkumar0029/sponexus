import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function bufferToDataUri(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No files uploaded' },
        { status: 400 }
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      const mimeType = file.type;
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');

      if (!isImage && !isVideo) {
        return NextResponse.json(
          { success: false, message: `Unsupported file type: ${file.name}` },
          { status: 400 }
        );
      }

      if (isImage && file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { success: false, message: `Image too large: ${file.name}` },
          { status: 400 }
        );
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { success: false, message: `Video too large: ${file.name}` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const dataUri = bufferToDataUri(buffer, mimeType);

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'sponexus/events',
        resource_type: isVideo ? 'video' : 'image',
      });

      uploadedFiles.push({
        url: result.secure_url,
        publicId: result.public_id,
        type: isVideo ? 'video' : 'image',
        title: file.name,
        uploadedAt: new Date(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        files: uploadedFiles,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      { success: false, message: 'Upload failed' },
      { status: 500 }
    );
  }
}