import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Pin, UserSession } from '@/components/adk-map/types';
import { DEFAULT_REGION, RegionCode, isRegionCode } from '@/lib/regions';

// Path to the pin data files
const getDataFilePath = (region: RegionCode, categoryId: string) => {
  return path.join(process.cwd(), 'src', 'data', 'regions', region, `${categoryId}.json`);
};

const resolveRegionFromRequest = (request: NextRequest, fallback?: string | null): RegionCode => {
  const queryRegion = request.nextUrl.searchParams.get('region');
  if (isRegionCode(queryRegion)) return queryRegion;
  if (isRegionCode(fallback)) return fallback;
  return DEFAULT_REGION;
};

// Check if user is admin
const isAdmin = async (request: NextRequest) => {
  try {
    // In a real-world application, you would verify JWT tokens or sessions
    // For this example, we'll require an admin header
    const adminAuthHeader = request.headers.get('x-admin-auth');
    
    // In production, you'd use proper auth. This is a placeholder.
    if (adminAuthHeader === process.env.ADMIN_SECRET_KEY) {
      return true;
    }
    
    // Check Authorization header for Bearer token
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const email = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // We would normally validate this against a DB
      // For this demo, we'll accept a known admin email
      if (email.toLowerCase() === 'jakedcl73@gmail.com') {
        return true;
      }
    }
    
    // Check the cookie/session
    const sessionCookie = request.cookies.get('adkMapUserSession');
    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(sessionCookie.value) as UserSession;
        return session.isAdmin === true;
      } catch {
        return false;
      }
    }
    
    return false;
  } catch {
    return false;
  }
};

// Load pin data from file
const loadPinData = async (region: RegionCode, categoryId: string) => {
  try {
    const filePath = getDataFilePath(region, categoryId);
    
    if (!fs.existsSync(filePath)) {
      return { pins: [] };
    }
    
    const fileData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error(`Error loading pin data for ${categoryId}:`, error);
    return { pins: [] };
  }
};

// Save pin data to file
const savePinData = async (region: RegionCode, categoryId: string, data: { pins: Pin[] }): Promise<boolean> => {
  try {
    const filePath = getDataFilePath(region, categoryId);
    const dirPath = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving pin data for ${categoryId}:`, error);
    return false;
  }
};

// Handle GET request to fetch all pins
export async function GET(request: NextRequest) {
  // Check admin status
  const admin = await isAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const region = resolveRegionFromRequest(request);
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');
    
    if (categoryId) {
      // Fetch pins for specific category
      const data = await loadPinData(region, categoryId);
      return NextResponse.json({ data, region }, { status: 200 });
    } else {
      // Fetch all pins from all categories
      // In a real app with many pins, you'd add pagination
      // For this demo, we'll return everything
      
      // Get all category files from the region directory
      const dataDir = path.join(process.cwd(), 'src', 'data', 'regions', region);
      const files = fs.readdirSync(dataDir);
      
      const allPins: Pin[] = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const categoryId = file.replace('.json', '');
          const data = await loadPinData(region, categoryId);
          
          // Add category to each pin
          if (data.pins && Array.isArray(data.pins)) {
            const pinsWithCategory = data.pins.map((pin: Pin) => ({
              ...pin,
              categoryId
            }));
            allPins.push(...pinsWithCategory);
          }
        }
      }
      
      return NextResponse.json({ pins: allPins, region }, { status: 200 });
    }
  } catch (error) {
    console.error('Error in GET request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handle PUT request to update a pin
export async function PUT(request: NextRequest) {
  // Check admin status
  const admin = await isAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { pin, categoryId, region: regionFromBody } = body;
    const region = resolveRegionFromRequest(request, regionFromBody);
    
    if (!pin || !categoryId || !pin.id) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    // Load current data
    const data = await loadPinData(region, categoryId);
    
    // Find the pin by ID
    const pinIndex = data.pins.findIndex((p: Pin) => p.id === pin.id);
    
    if (pinIndex === -1) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 });
    }
    
    // Update the pin
    data.pins[pinIndex] = {
      ...data.pins[pinIndex],
      ...pin
    };
    
    // Save the updated data
    const saveResult = await savePinData(region, categoryId, data);
    
    if (!saveResult) {
      return NextResponse.json({ error: 'Failed to save pin' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, pin: data.pins[pinIndex], region }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handle DELETE request to delete a pin
export async function DELETE(request: NextRequest) {
  // Check admin status
  const admin = await isAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { pinId, categoryId, coordinates, region: regionFromBody } = body;
    const region = resolveRegionFromRequest(request, regionFromBody);
    
    if (!categoryId || (!pinId && !coordinates)) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    // Load current data
    const data = await loadPinData(region, categoryId);
    
    // Find the pin by ID or coordinates
    let pinIndex = -1;
    
    if (pinId) {
      pinIndex = data.pins.findIndex((p: Pin) => p.id === pinId);
    } else if (coordinates && coordinates.length === 2) {
      // If no ID is provided, try to match by coordinates
      pinIndex = data.pins.findIndex((p: Pin) => {
        return p.coordinates[0] === coordinates[0] && p.coordinates[1] === coordinates[1];
      });
    }
    
    if (pinIndex === -1) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 });
    }
    
    // Store the pin for response
    const deletedPin = data.pins[pinIndex];
    
    // Remove the pin
    data.pins.splice(pinIndex, 1);
    
    // Save the updated data
    const saveResult = await savePinData(region, categoryId, data);
    
    if (!saveResult) {
      return NextResponse.json({ error: 'Failed to delete pin' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, pin: deletedPin, region }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 