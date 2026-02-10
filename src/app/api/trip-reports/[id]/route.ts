import { NextRequest, NextResponse } from 'next/server';
import { sanityClient, tripReportByIdQuery } from '@/lib/sanity';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// GET single trip report by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
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

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trip report ID is required',
        },
        { status: 400 }
      );
    }

    if (!sanityClient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sanity is not configured. Please set NEXT_PUBLIC_SANITY_PROJECT_ID in your environment variables.',
        },
        { status: 503 }
      );
    }

    const tripReport = await sanityClient.fetch(tripReportByIdQuery(id), { id });

    if (!tripReport) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trip report not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: tripReport,
    });
  } catch (error) {
    console.error('Error fetching trip report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trip report',
      },
      { status: 500 }
    );
  }
}
