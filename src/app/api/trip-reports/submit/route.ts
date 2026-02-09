import { NextRequest, NextResponse } from 'next/server';
import { sanityWriteClient } from '@/lib/sanity';

// Simple password protection
const SUBMIT_PASSWORD = process.env.TRIP_REPORT_PASSWORD || '';

// Allowed author names (optional whitelist)
const ALLOWED_AUTHORS = process.env.ALLOWED_AUTHORS?.split(',') || [];

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

    const body = await request.json();
    const {
      title,
      author,
      date,
      location,
      description,
      imageAssetIds, // Array of asset IDs from Sanity
      tags,
      password,
    } = body;

    // Validation
    if (!title || !author || !date || !location?.name || !description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: title, author, date, location.name, description',
        },
        { status: 400 }
      );
    }

    // Password protection (if enabled)
    if (SUBMIT_PASSWORD && password !== SUBMIT_PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid password',
        },
        { status: 401 }
      );
    }

    // Author whitelist (if enabled)
    if (ALLOWED_AUTHORS.length > 0 && !ALLOWED_AUTHORS.includes(author)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Author not in whitelist',
        },
        { status: 403 }
      );
    }

    // Prepare images array
    const images = (imageAssetIds || []).map((assetId: string, index: number) => ({
      _key: `image-${index}`,
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: assetId,
      },
    }));

    // Create trip report document
    const tripReport = {
      _type: 'tripReport',
      title,
      author,
      date,
      location: {
        _type: 'object',
        name: location.name,
        region: location.region || undefined,
        coordinates: location.coordinates
          ? {
              _type: 'geopoint',
              lat: location.coordinates.lat,
              lng: location.coordinates.lng,
            }
          : undefined,
      },
      description,
      images,
      tags: tags || [],
      publishedAt: new Date().toISOString(),
    };

    // Submit to Sanity
    const result = await sanityWriteClient!.create(tripReport);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Trip report submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting trip report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit trip report',
      },
      { status: 500 }
    );
  }
}
