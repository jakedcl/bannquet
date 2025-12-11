import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { User } from '@/components/adk-map/types';
import crypto from 'crypto';

// Path to the users data file
const getUsersDataFilePath = () => {
  return path.join(process.cwd(), 'data', 'users.json');
};

// Load users data from file
const loadUsersData = async (): Promise<User[]> => {
  try {
    const filePath = getUsersDataFilePath();
    
    if (!fs.existsSync(filePath)) {
      // Create directory if it doesn't exist
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Create default admin user
      const defaultUsers: User[] = [
        {
          id: crypto.randomUUID(),
          name: 'Admin User',
          email: 'jakedcl73@gmail.com',
          password: hashPassword('jsjs'),
          isAdmin: true,
          createdAt: new Date().toISOString(),
          pinnedPins: 0
        }
      ];
      
      fs.writeFileSync(filePath, JSON.stringify(defaultUsers, null, 2), 'utf8');
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
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Handle POST request for signup
export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();
    
    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({ 
        error: 'Name, email, and password are required' 
      }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }
    
    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ 
        error: 'Password must be at least 6 characters long' 
      }, { status: 400 });
    }
    
    const users = await loadUsersData();
    
    // Check if email already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ 
        error: 'Email already exists' 
      }, { status: 400 });
    }
    
    // Create new user
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      password: hashPassword(password),
      isAdmin: false, // New users are not admins by default
      createdAt: new Date().toISOString(),
      pinnedPins: 0
    };
    
    // Add user to the list
    users.push(newUser);
    
    // Save updated users list
    const saveResult = await saveUsersData(users);
    
    if (!saveResult) {
      return NextResponse.json({ 
        error: 'Failed to create user' 
      }, { status: 500 });
    }
    
    // Create a session object to return (without the password)
    const session = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      isAdmin: newUser.isAdmin,
      isLoggedIn: true
    };
    
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error in signup request:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
} 