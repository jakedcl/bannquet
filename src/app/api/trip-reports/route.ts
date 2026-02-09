import { NextRequest, NextResponse } from 'next/server';
import { sanityClient, tripReportsQuery } from '@/lib/sanity';

// GET all trip reports
export async function GET(request: NextRequest) {
  try {
    if (!sanityClient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sanity is not configured. Please set NEXT_PUBLIC_SANITY_PROJECT_ID in your environment variables.',
        },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const author = searchParams.get('author');
    const tag = searchParams.get('tag');
    const limit = searchParams.get('limit');
    
    let query = tripReportsQuery;
    
    // Apply filters if provided
    if (author) {
      query = `*[_type == "tripReport" && author == $author] | order(publishedAt desc) {
        _id,
        _type,
        _createdAt,
        _updatedAt,
        title,
        author,
        date,
        location,
        description,
        images,
        tags,
        publishedAt
      }`;
    }
    
    if (tag) {
      query = `*[_type == "tripReport" && $tag in tags] | order(publishedAt desc) {
        _id,
        _type,
        _createdAt,
        _updatedAt,
        title,
        author,
        date,
        location,
        description,
        images,
        tags,
        publishedAt
      }`;
    }
    
    const trips = await sanityClient!.fetch(query, { author, tag });
    
    // Apply limit if provided
    const limitedTrips = limit ? trips.slice(0, parseInt(limit)) : trips;
    
    return NextResponse.json({
      success: true,
      data: limitedTrips,
      count: limitedTrips.length,
    });
  } catch (error) {
    console.error('Error fetching trip reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trip reports',
      },
      { status: 500 }
    );
  }
}
