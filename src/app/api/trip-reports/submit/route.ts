import { NextRequest, NextResponse } from 'next/server';
import { sanityWriteClient } from '@/lib/sanity';
import { Resend } from 'resend';

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
      authorName,
      authorEmail,
      tripDate,
      locationPin,
      body: bodyContent, // Portable text body
      tags,
      published = false,
    } = body;

    // Validation
    if (!title || !authorName || !authorEmail || !tripDate || !locationPin?.lat || !locationPin?.lng) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: title, authorName, authorEmail, tripDate, locationPin',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(authorEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email address',
        },
        { status: 400 }
      );
    }

    if (!bodyContent || !Array.isArray(bodyContent) || bodyContent.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Body content is required',
        },
        { status: 400 }
      );
    }

    // Author whitelist (if enabled)
    if (ALLOWED_AUTHORS.length > 0 && !ALLOWED_AUTHORS.includes(authorName)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Author not in whitelist',
        },
        { status: 403 }
      );
    }

    // Create trip report document
    const tripReport = {
      _type: 'tripReport',
      title,
      authorName,
      authorEmail,
      tripDate,
      locationPin: {
        _type: 'geopoint',
        lat: locationPin.lat,
        lng: locationPin.lng,
      },
      body: bodyContent, // Portable text array
      tags: tags && Array.isArray(tags) ? tags : [],
      published: published === true,
      publishedAt: new Date().toISOString(),
    };

    // Submit to Sanity
    const result = await sanityWriteClient!.create(tripReport);

    // Generate tokens
    const crypto = await import('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const editToken = crypto.randomBytes(32).toString('hex');
    
    // Get base URL for email links
    let baseUrl = 'https://bannquet.com';
    // Prioritize development mode
    if (process.env.NODE_ENV === 'development') {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    } else if (process.env.VERCEL_URL && process.env.VERCEL_URL !== 'bannquet.com') {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    }
    
    // Store tokens in Sanity
    await sanityWriteClient!.create({
      _type: 'tripReportVerification',
      tripReportId: {
        _type: 'reference',
        _ref: result._id,
      },
      email: authorEmail,
      verificationToken,
      editToken,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year for edit token
    });

    // URLs
    const publishUrl = `${baseUrl}/api/trip-reports/verify?token=${verificationToken}&id=${result._id}`;
    const editUrl = `${baseUrl}/trip-reports/edit?token=${editToken}&id=${result._id}`;
    
    // Send email with both links
    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        // Use Resend's test domain if bannquet.com isn't verified yet
        // Once domain is verified, set EMAIL_FROM to 'Bannquet <noreply@bannquet.com>'
        const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: authorEmail,
          subject: 'Publish Your Trip Report',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #1F3F28;">Publish Your Trip Report</h1>
                <p>Hi ${authorName},</p>
                <p>Your trip report "<strong>${title}</strong>" has been saved as a draft.</p>
                <p>Click the button below to publish it and make it visible to everyone:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${publishUrl}" style="background-color: #1F3F28; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                    Publish Trip Report
                  </a>
                </div>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p><strong>Want to edit this later?</strong></p>
                <p style="font-size: 14px;">Save this edit link - it won't expire:</p>
                <p style="font-size: 12px; color: #666; word-break: break-all;">
                  <a href="${editUrl}" style="color: #1F3F28;">${editUrl}</a>
                </p>
                <p style="font-size: 12px; color: #666; margin-top: 20px;">
                  The publish link expires in 24 hours. The edit link is permanent.
                </p>
              </body>
            </html>
          `,
        });
        
        if (emailResult.error) {
          console.error('❌ Resend API error:', JSON.stringify(emailResult.error, null, 2));
        } else {
          console.log('✅ Email sent successfully to:', authorEmail);
          console.log('📧 Email ID:', emailResult.data?.id);
        }
      } else {
        // Always log URLs for debugging
        console.log('📧 Email would be sent to:', authorEmail);
        console.log('📧 Publish URL:', publishUrl);
        console.log('✏️  Edit URL:', editUrl);
        console.log('⚠️  RESEND_API_KEY not set. Add it to .env.local (and Vercel env vars) to send emails.');
      }
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
      if (emailError instanceof Error) {
        console.error('Error message:', emailError.message);
        console.error('Error stack:', emailError.stack);
      }
      // Don't fail the submission if email fails
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Trip report submitted successfully. Check your email to publish.',
      ...(process.env.NODE_ENV === 'development' && {
        publishUrl,
        editUrl,
      }),
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
