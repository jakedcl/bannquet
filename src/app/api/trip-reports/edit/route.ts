import { NextRequest, NextResponse } from 'next/server';
import { sanityClient, sanityWriteClient } from '@/lib/sanity';

export async function GET(request: NextRequest) {
  try {
    if (!sanityClient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sanity is not configured.',
        },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const id = searchParams.get('id');

    if (!token || !id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing token or trip report ID',
        },
        { status: 400 }
      );
    }

    // Verify edit token
    const verification = await sanityClient.fetch(
      `*[_type == "tripReportVerification" && editToken == $token && tripReportId._ref == $id][0]`,
      { token, id }
    );

    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid edit token',
        },
        { status: 403 }
      );
    }

    // Fetch trip report
    const tripReport = await sanityClient.fetch(
      `*[_type == "tripReport" && _id == $id][0]`,
      { id }
    );

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
    console.error('Error fetching trip report for edit:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trip report',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!sanityWriteClient) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sanity is not configured.',
        },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const id = searchParams.get('id');

    if (!token || !id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing token or trip report ID',
        },
        { status: 400 }
      );
    }

    // Verify edit token
    const verification = await sanityWriteClient.fetch(
      `*[_type == "tripReportVerification" && editToken == $token && tripReportId._ref == $id][0]`,
      { token, id }
    );

    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid edit token',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      authorName,
      tripDate,
      locationPin,
      body: bodyContent,
      tags,
    } = body;

    // Update trip report
    await sanityWriteClient
      .patch(id)
      .set({
        title,
        authorName,
        tripDate,
        locationPin: {
          _type: 'geopoint',
          lat: locationPin.lat,
          lng: locationPin.lng,
        },
        body: bodyContent,
        tags: tags && Array.isArray(tags) ? tags : [],
      })
      .commit();

    return NextResponse.json({
      success: true,
      message: 'Trip report updated successfully',
    });
  } catch (error) {
    console.error('Error updating trip report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update trip report',
      },
      { status: 500 }
    );
  }
}
