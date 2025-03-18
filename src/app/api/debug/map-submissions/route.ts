import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET() {
  try {
    // Define path to data file
    const dataPath = path.join(process.cwd(), 'data', 'map-submissions.json');
    
    // Check if file exists
    try {
      await fs.access(dataPath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'No submissions data found',
          error: 'File not found'
        },
        { status: 404 }
      );
    }
    
    // Read data file
    const data = await fs.readFile(dataPath, 'utf8');
    const jsonData = JSON.parse(data);
    
    return NextResponse.json({
      success: true,
      message: 'Successfully retrieved raw submissions data',
      data: jsonData
    });
  } catch (error) {
    console.error(`Error fetching submissions data:`, error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get raw submissions data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 