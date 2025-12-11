import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { PinSubmission } from '@/components/adk-map/types';

// In a production environment, you would use a proper database
// This is a simple file-based approach for demonstration purposes
const DATA_DIR = path.join(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'map-submissions.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Get all submissions
async function getSubmissions(): Promise<PinSubmission[]> {
  try {
    await ensureDataDir();
    
    try {
      const data = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      // File doesn't exist yet, return empty array
      return [];
    }
  } catch (error) {
    console.error('Error reading submissions:', error);
    throw new Error('Failed to read submissions');
  }
}

// Save submissions
async function saveSubmissions(submissions: PinSubmission[]) {
  try {
    await ensureDataDir();
    await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving submissions:', error);
    throw new Error('Failed to save submissions');
  }
}

// Add a new submission
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.coordinates || !data.categoryId || !data.submitterName || !data.submitterEmail) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // For deletion requests, require targetPinId
    if (data.requestType === 'deletion' && !data.targetPinId) {
      return NextResponse.json(
        { message: 'Missing targetPinId for deletion request' },
        { status: 400 }
      );
    }

    // Create submission object
    const newSubmission: PinSubmission = {
      ...data,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      id: crypto.randomUUID(),
      requestType: data.requestType || 'addition' // Default to addition if not specified
    };

    // Get existing submissions and add the new one
    const submissions = await getSubmissions();
    submissions.push(newSubmission);
    
    // Save updated submissions
    await saveSubmissions(submissions);

    return NextResponse.json({ 
      message: 'Submission received', 
      submission: newSubmission 
    }, { status: 201 });
  } catch (error) {
    console.error('Error processing submission:', error);
    return NextResponse.json(
      { message: 'Failed to process submission' },
      { status: 500 }
    );
  }
}

// Get all submissions or user-specific submissions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const requestType = searchParams.get('requestType');
    const forceLog = searchParams.get('debug') === 'true';
    
    // Load all submissions
    const submissions = await getSubmissions();
    
    // Always log this for debugging
    console.log(`GET /api/map-submissions - Loaded ${submissions.length} total submissions from storage`);
    
    if (submissions.length === 0) {
      console.warn("WARNING: No submissions found in storage. Check if map-submissions.json exists and is valid.");
    }
    
    if (forceLog || submissions.length < 10) {
      // Only log full data if there aren't too many submissions or debug is enabled
      console.log(`Submissions data: ${JSON.stringify(submissions)}`);
    }
    
    // Apply requestType filter if provided
    let filteredSubmissions = submissions;
    if (requestType && (requestType === 'addition' || requestType === 'deletion')) {
      filteredSubmissions = submissions.filter(sub => sub.requestType === requestType);
      console.log(`Filtered to ${filteredSubmissions.length} submissions of type: ${requestType}`);
    }
    
    // If email is provided, filter submissions for that user
    if (email) {
      console.log(`Filtering submissions for email: ${email}`);
      const userSubmissions = filteredSubmissions.filter(sub => 
        sub.submitterEmail.toLowerCase() === email.toLowerCase()
      );
      console.log(`Found ${userSubmissions.length} submissions for user ${email}`);
      
      // Separate user submissions by status
      const pendingSubmissions = userSubmissions.filter(sub => sub.status === 'pending');
      const approvedSubmissions = userSubmissions.filter(sub => sub.status === 'approved');
      const rejectedSubmissions = userSubmissions.filter(sub => sub.status === 'rejected');
      
      console.log(`User submissions by status: pending=${pendingSubmissions.length}, approved=${approvedSubmissions.length}, rejected=${rejectedSubmissions.length}`);
      
      return NextResponse.json({
        pending: pendingSubmissions,
        approved: approvedSubmissions,
        rejected: rejectedSubmissions
      });
    }
    
    // If no email is provided, return all submissions (admin view)
    console.log(`Returning all ${filteredSubmissions.length} submissions for admin view`);
    return NextResponse.json(filteredSubmissions);
  } catch (error) {
    console.error('Error retrieving submissions:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve submissions', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Update a submission (for approval/rejection)
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.id || !data.status) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const submissions = await getSubmissions();
    const index = submissions.findIndex(sub => sub.id === data.id);
    
    if (index === -1) {
      return NextResponse.json(
        { message: 'Submission not found' },
        { status: 404 }
      );
    }

    // Update the submission
    submissions[index] = {
      ...submissions[index],
      status: data.status,
      updatedAt: new Date().toISOString()
    };

    await saveSubmissions(submissions);

    return NextResponse.json({ 
      message: 'Submission updated', 
      submission: submissions[index] 
    });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json(
      { message: 'Failed to update submission' },
      { status: 500 }
    );
  }
} 