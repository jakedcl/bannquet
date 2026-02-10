import { NextRequest, NextResponse } from 'next/server';
import { sanityWriteClient } from '@/lib/sanity';

export async function GET(request: NextRequest) {
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
      // Get base URL for redirect
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://bannquet.com');
      return NextResponse.redirect(`${baseUrl}/trip-reports?error=invalid-token`);
    }

    // Find verification token
    const verification = await sanityWriteClient.fetch(
      `*[_type == "tripReportVerification" && verificationToken == $token && tripReportId._ref == $id][0]`,
      { token, id } as Record<string, string>
    );

    if (!verification) {
      console.error('Verification not found:', { token, id });
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://bannquet.com');
      return NextResponse.redirect(`${baseUrl}/trip-reports?error=token-not-found`);
    }

    // Check if expired (only for verification token, edit tokens don't expire)
    if (verification.expiresAt && new Date(verification.expiresAt) < new Date()) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
        (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://bannquet.com');
      return NextResponse.redirect(`${baseUrl}/trip-reports?error=token-expired`);
    }

    // Update trip report to published
    await sanityWriteClient
      .patch(id)
      .set({ published: true, publishedAt: new Date().toISOString() })
      .commit();

    // Delete verification token (only the verification token, keep edit token)
    await sanityWriteClient.delete(verification._id);

    // Redirect to trip reports page with success
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://bannquet.com');
    return NextResponse.redirect(`${baseUrl}/trip-reports?verified=true`);
  } catch (error) {
    console.error('Error verifying trip report:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://bannquet.com');
    return NextResponse.redirect(`${baseUrl}/trip-reports?error=verification-failed`);
  }
}
