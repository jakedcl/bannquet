import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  _request: NextRequest,
  { params }: { params: { endpoint: string } }
) {
  const { endpoint } = params;
  
  try {
    // Define path to data file
    const dataPath = path.join(process.cwd(), 'src', 'data', 'adk', `${endpoint}.json`);
    
    // Check if file exists
    try {
      await fs.access(dataPath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: `No data found for ${endpoint}`,
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
      message: `Successfully retrieved ${endpoint} data`,
      data: {
        category: endpoint,
        pins: jsonData
      }
    });
  } catch (error) {
    console.error(`Error fetching ${endpoint} data:`, error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to get data for ${endpoint}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 