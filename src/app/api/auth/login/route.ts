import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { User } from '@/components/projects/adk-map/types';
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
    const users = JSON.parse(fileData);
    
    // Check if the admin account exists in the loaded data
    const adminExists = users.some((u: User) => u.email.toLowerCase() === 'jakedcl73@gmail.com');
    
    // If not, add the admin account
    if (!adminExists) {
      const adminUser: User = {
        id: crypto.randomUUID(),
        name: 'Admin User',
        email: 'jakedcl73@gmail.com',
        password: hashPassword('jsjs'),
        isAdmin: true,
        createdAt: new Date().toISOString(),
        pinnedPins: 0
      };
      
      users.push(adminUser);
      fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
    }
    
    return users;
  } catch (error) {
    console.error('Error loading users data:', error);
    return [];
  }
};

// Hash a password
function hashPassword(password: string): string {
  // In a real app, use a proper hashing function with salt
  // This is a simple example using SHA-256
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Handle POST request for login
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    
    const users = await loadUsersData();
    
    // Find the user by email
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    // Check if the password is correct
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    // Create a session object to return
    const session = {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      isLoggedIn: true
    };
    
    // In a real app, you'd set a secure cookie with the session
    // For this example, we'll just return the session data
    
    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error('Error in login request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 