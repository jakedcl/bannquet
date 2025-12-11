import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { DEFAULT_REGION, RegionCode, isRegionCode } from '@/lib/regions';

type EndpointParams = {
  endpoint?: string;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<EndpointParams> }
) {
  const resolvedParams = await params;

  if (!resolvedParams?.endpoint) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid endpoint parameter',
        error: 'Missing endpoint'
      },
      { status: 400 }
    );
  }

  const endpoint = resolvedParams.endpoint;
  const searchParams = request.nextUrl.searchParams;
  const regionParam = searchParams.get('region');
  const region: RegionCode = isRegionCode(regionParam) ? regionParam : DEFAULT_REGION;
  
  try {
    // Define path to data file
    const dataPath = path.join(process.cwd(), 'src', 'data', 'regions', region, `${endpoint}.json`);
    
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
      message: `Successfully retrieved ${endpoint} data for ${region.toUpperCase()}`,
      data: {
        region,
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