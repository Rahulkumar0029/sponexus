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
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const mimeType = file.type;
      const isVideo = mimeType.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      const dataUri = bufferToDataUri(buffer, mimeType);

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'sponexus/events',
        resource_type: resourceType,
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