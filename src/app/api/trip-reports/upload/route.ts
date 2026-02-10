import { NextRequest, NextResponse } from 'next/server';
import { sanityWriteClient } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    if (!sanityWriteClient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sanity is not configured. Please set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_TOKEN in your environment variables.',
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        {
          success: false,
          error: 'File must be an image',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 4MB for Vercel serverless function limit)
    const maxSize = 4 * 1024 * 1024; // 4MB (Vercel limit is 4.5MB)
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File size must be less than 4MB',
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Sanity
    const asset = await sanityWriteClient!.assets.upload('image', buffer, {
      filename: file.name,
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      data: {
        assetId: asset._id,
        url: asset.url,
      },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload image',
      },
      { status: 500 }
    );
  }
}
