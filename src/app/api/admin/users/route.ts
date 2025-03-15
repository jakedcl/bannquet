import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { User, UserSession } from '@/components/projects/adk-map/types';
import crypto from 'crypto';

// Path to the users data file
const getUsersDataFilePath = () => {
  return path.join(process.cwd(), 'data', 'users.json');
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
      
      // Load users and check if this email belongs to an admin
      const users = await loadUsersData();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (user && user.isAdmin) {
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

// Load users data from file
const loadUsersData = async (): Promise<User[]> => {
  try {
    const filePath = getUsersDataFilePath();
    
    if (!fs.existsSync(filePath)) {
      // Create default users if file doesn't exist
      const defaultUsers: User[] = [
        {
          id: crypto.randomUUID(),
          name: 'Admin User',
          email: 'jakedcl73@gmail.com',
          password: hashPassword('jsjs'), // In a real app, use a secure password
          isAdmin: true,
          createdAt: new Date().toISOString(),
          pinnedPins: 0
        },
        {
          id: crypto.randomUUID(),
          name: 'Regular User',
          email: 'user@example.com',
          password: hashPassword('user123'), // In a real app, use a secure password
          isAdmin: false,
          createdAt: new Date().toISOString(),
          pinnedPins: 0
        }
      ];
      
      saveUsersData(defaultUsers);
      return defaultUsers;
    }
    
    const fileData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error('Error loading users data:', error);
    return [];
  }
};

// Save users data to file
const saveUsersData = async (users: User[]): Promise<boolean> => {
  try {
    const filePath = getUsersDataFilePath();
    const dirPath = path.dirname(filePath);
    
    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving users data:', error);
    return false;
  }
};

// Hash a password
function hashPassword(password: string): string {
  // In a real app, use a proper hashing function with salt
  // This is a simple example using SHA-256
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Remove password from user object
function sanitizeUser(user: User) {
  const { id, name, email, isAdmin, createdAt, updatedAt, pinnedPins } = user;
  return { id, name, email, isAdmin, createdAt, updatedAt, pinnedPins };
}

// Handle GET request to fetch all users
export async function GET(request: NextRequest) {
  // Check admin status
  const admin = await isAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    const users = await loadUsersData();
    
    if (userId) {
      // Find specific user
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Don't send the password hash
      return NextResponse.json({ user: sanitizeUser(user) }, { status: 200 });
    } else {
      // Return all users (without passwords)
      const usersWithoutPasswords = users.map(sanitizeUser);
      
      return NextResponse.json({ users: usersWithoutPasswords }, { status: 200 });
    }
  } catch (error) {
    console.error('Error in GET request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handle POST request to create a new user
export async function POST(request: NextRequest) {
  // Check admin status
  const admin = await isAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { name, email, password, isAdmin: newUserIsAdmin } = body;
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    const users = await loadUsersData();
    
    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    
    // Create new user
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      password: hashPassword(password),
      isAdmin: Boolean(newUserIsAdmin),
      createdAt: new Date().toISOString(),
      pinnedPins: 0
    };
    
    // Add user to the list
    users.push(newUser);
    
    // Save updated users list
    const saveResult = await saveUsersData(users);
    
    if (!saveResult) {
      return NextResponse.json({ error: 'Failed to save user' }, { status: 500 });
    }
    
    // Don't return the password hash
    return NextResponse.json({ success: true, user: sanitizeUser(newUser) }, { status: 201 });
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handle PUT request to update a user
export async function PUT(request: NextRequest) {
  // Check admin status
  const admin = await isAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { id, name, email, password, isAdmin: userIsAdmin } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }
    
    const users = await loadUsersData();
    
    // Find the user by ID
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update user data
    const updatedUser = { ...users[userIndex] };
    
    if (name) updatedUser.name = name;
    if (email) updatedUser.email = email;
    if (password) updatedUser.password = hashPassword(password);
    if (userIsAdmin !== undefined) updatedUser.isAdmin = userIsAdmin;
    
    updatedUser.updatedAt = new Date().toISOString();
    
    // Update the user in the list
    users[userIndex] = updatedUser;
    
    // Save updated users list
    const saveResult = await saveUsersData(users);
    
    if (!saveResult) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
    
    // Don't return the password hash
    return NextResponse.json({ success: true, user: sanitizeUser(updatedUser) }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handle DELETE request to delete a user
export async function DELETE(request: NextRequest) {
  // Check admin status
  const admin = await isAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }
    
    const users = await loadUsersData();
    
    // Find the user by ID
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Store the user for response
    const deletedUser = users[userIndex];
    
    // Remove the user
    users.splice(userIndex, 1);
    
    // Save updated users list
    const saveResult = await saveUsersData(users);
    
    if (!saveResult) {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
    
    // Don't return the password hash
    return NextResponse.json({ success: true, user: sanitizeUser(deletedUser) }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 