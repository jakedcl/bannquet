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
    const authorName = searchParams.get('authorName');
    const tag = searchParams.get('tag');
    const limit = searchParams.get('limit');
    
    let query = tripReportsQuery;
    const params: Record<string, string> = {};
    
    // Apply filters if provided
    if (authorName) {
      query = `*[_type == "tripReport" && authorName == $authorName && published == true] | order(publishedAt desc) {
        _id,
        _type,
        _createdAt,
        _updatedAt,
        title,
        authorName,
        authorEmail,
        tripDate,
        locationPin,
        body,
        tags,
        published,
        publishedAt
      }`;
      params.authorName = authorName;
    }
    
    if (tag) {
      query = `*[_type == "tripReport" && $tag in tags && published == true] | order(publishedAt desc) {
        _id,
        _type,
        _createdAt,
        _updatedAt,
        title,
        authorName,
        authorEmail,
        tripDate,
        locationPin,
        body,
        tags,
        published,
        publishedAt
      }`;
      params.tag = tag;
    }
    
    // Combine filters
    if (authorName && tag) {
      query = `*[_type == "tripReport" && authorName == $authorName && $tag in tags && published == true] | order(publishedAt desc) {
        _id,
        _type,
        _createdAt,
        _updatedAt,
        title,
        authorName,
        authorEmail,
        tripDate,
        locationPin,
        body,
        tags,
        published,
        publishedAt
      }`;
      params.authorName = authorName;
      params.tag = tag;
    }
    
    const trips = await sanityClient!.fetch(query, params);
    
    // Apply limit if provided
    const limitedTrips = limit ? trips.slice(0, parseInt(limit)) : trips;
    
    const response = NextResponse.json({
      success: true,
      data: limitedTrips,
      count: limitedTrips.length,
    });

    // Cache trip reports for 2 minutes (they don't change frequently)
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    
    return response;
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
