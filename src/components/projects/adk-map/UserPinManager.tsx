'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserSession, UserPins } from './types';
import Link from 'next/link';

interface UserPinManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserPinManager({ isOpen, onClose }: UserPinManagerProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [userSession, setUserSession] = useState<UserSession>(() => {
    // Try to get session from localStorage on component mount
    if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem('adkMapUserSession');
      if (savedSession) {
        try {
          return JSON.parse(savedSession);
        } catch (error) {
          console.error('Error parsing user session:', error);
        }
      }
    }
    return { name: '', email: '', isLoggedIn: false, isAdmin: false };
  });
  
  const [userPins, setUserPins] = useState<UserPins>({
    pending: [],
    approved: [],
    rejected: []
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showSignup, setShowSignup] = useState(false);

  // When user session changes, save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && userSession) {
      localStorage.setItem('adkMapUserSession', JSON.stringify(userSession));
      
      // If user is logged in, fetch their pins
      if (userSession.isLoggedIn) {
        fetchUserPins();
      }
    }
  }, [userSession]);

  // Fetch user pins when the component is opened
  useEffect(() => {
    if (isOpen && userSession.isLoggedIn) {
      fetchUserPins();
    }
  }, [isOpen, userSession.isLoggedIn]);

  // Function to fetch user pins
  const fetchUserPins = async () => {
    if (!userSession.email) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/map-submissions?email=${encodeURIComponent(userSession.email)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user pins');
      }
      
      const data = await response.json();
      setUserPins(data);
    } catch (err) {
      setError('Failed to load your pins. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.email || !loginForm.password) {
      setError('Please provide both email and password');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, you'd authenticate against your API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Invalid email or password');
      }
      
      const data = await response.json();
      
      // Set user session with returned data
      setUserSession({
        name: data.name,
        email: data.email,
        isLoggedIn: true,
        isAdmin: data.isAdmin || false
      });
      
      setError(null);
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form fields
    if (!signupForm.name || !signupForm.email || !signupForm.password) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: signupForm.name,
          email: signupForm.email,
          password: signupForm.password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }
      
      // Set user session with returned data
      setUserSession({
        name: data.name,
        email: data.email,
        isLoggedIn: true,
        isAdmin: data.isAdmin || false
      });
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Settings created successfully!';
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 3000);
      
      setError(null);
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setUserSession({ name: '', email: '', isLoggedIn: false, isAdmin: false });
    setUserPins({ pending: [], approved: [], rejected: [] });
  };

  // Toggle between login and signup forms
  const toggleForm = () => {
    setShowSignup(!showSignup);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {userSession.isLoggedIn
                  ? "Your Settings"
                  : showSignup ? "Create an Account" : "Sign In"
                }
              </h2>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!userSession.isLoggedIn ? (
              // Login or Signup Form
              <div className="p-8">
                {showSignup ? (
                  // Signup Form
                  <>
                    <p className="text-gray-600 text-lg mb-6">Create an account to submit and track your map contributions</p>
                    
                    <form onSubmit={handleSignup} className="space-y-6">
                      <div>
                        <label htmlFor="signup-name" className="block text-base font-medium text-gray-700 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          id="signup-name"
                          value={signupForm.name}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                          className="block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="signup-email" className="block text-base font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          id="signup-email"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                          className="block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="signup-password" className="block text-base font-medium text-gray-700 mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          id="signup-password"
                          value={signupForm.password}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                          className="block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green"
                          required
                          minLength={6}
                        />
                        <p className="mt-2 text-sm text-gray-500">Password must be at least 6 characters</p>
                      </div>
                      
                      <div>
                        <label htmlFor="signup-confirm-password" className="block text-base font-medium text-gray-700 mb-2">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          id="signup-confirm-password"
                          value={signupForm.confirmPassword}
                          onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green"
                          required
                        />
                      </div>
                      
                      {error && (
                        <div className="p-4 bg-red-50 text-red-700 text-base rounded-md">
                          {error}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-4">
                        <button
                          type="submit"
                          className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-green hover:bg-brand-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <div className="w-5 h-5 mr-3 border-t-2 border-white rounded-full animate-spin"></div>
                              Creating Account...
                            </>
                          ) : (
                            'Create Account'
                          )}
                        </button>
                        
                        <button
                          type="button"
                          onClick={toggleForm}
                          className="text-base text-brand-green hover:text-brand-green-dark font-medium"
                        >
                          Already have an account?
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  // Login Form
                  <>
                    <p className="text-gray-600 text-lg mb-6">Please sign in to manage your map submissions</p>
                    
                    <form onSubmit={handleLogin} className="space-y-6">
                      <div>
                        <label htmlFor="user-email" className="block text-base font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          id="user-email"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                          className="block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green"
                          required
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="user-password" className="block text-base font-medium text-gray-700 mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          id="user-password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                          className="block w-full px-4 py-3 text-base rounded-md border-gray-300 shadow-sm focus:border-brand-green focus:ring-brand-green"
                          required
                        />
                      </div>
                      
                      {error && (
                        <div className="p-4 bg-red-50 text-red-700 text-base rounded-md">
                          {error}
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center pt-4">
                        <button
                          type="submit"
                          className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-brand-green hover:bg-brand-green-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <div className="w-5 h-5 mr-3 border-t-2 border-white rounded-full animate-spin"></div>
                              Signing In...
                            </>
                          ) : (
                            'Sign In'
                          )}
                        </button>
                        
                        <button
                          type="button"
                          onClick={toggleForm}
                          className="text-base text-brand-green hover:text-brand-green-dark font-medium"
                        >
                          Need an account? Sign up
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            ) : userSession.isAdmin ? (
              // Admin Dashboard with access to Members management
              <div className="flex flex-col">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Signed in as <span className="font-medium">{userSession.name}</span> ({userSession.email})
                    </p>
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                      Administrator
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleLogout}
                      className="text-sm text-gray-600 hover:text-brand-green"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Actions</h3>
                    <Link href="/admin/users" className="bg-blue-600 hover:bg-blue-700 transition-colors p-4 rounded-lg flex items-center text-white">
                      <div className="flex-shrink-0 mr-3 p-2 bg-white/20 rounded-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-white">Members</p>
                        <p className="text-sm text-white/80">Manage user accounts and access</p>
                      </div>
                    </Link>
                  </div>
                  
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Recent Submissions</h3>
                    <p className="text-gray-600 text-sm mb-3">View pending submissions that require your approval.</p>
                    
                    <Link href="/admin/submissions" className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-center justify-between">
                      <span className="font-medium text-amber-800">View Pending Submissions</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-800" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              // Regular user is logged in - show pins management
              <div className="flex flex-col">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Signed in as <span className="font-medium">{userSession.name}</span> ({userSession.email})
                    </p>
                    <button
                      onClick={handleLogout}
                      className="text-sm text-gray-600 hover:text-brand-green"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
                
                {/* Tabs for different pin statuses */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-3 px-4 text-center text-sm font-medium ${
                      activeTab === 'pending'
                        ? 'border-b-2 border-brand-green text-brand-green'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setActiveTab('approved')}
                    className={`flex-1 py-3 px-4 text-center text-sm font-medium ${
                      activeTab === 'approved'
                        ? 'border-b-2 border-brand-green text-brand-green'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setActiveTab('rejected')}
                    className={`flex-1 py-3 px-4 text-center text-sm font-medium ${
                      activeTab === 'rejected'
                        ? 'border-b-2 border-brand-green text-brand-green'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Rejected
                  </button>
                </div>
                
                <div className="overflow-y-auto max-h-96">
                  {isLoading ? (
                    <div className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-green mb-2"></div>
                      <p className="text-gray-600">Loading your pins...</p>
                    </div>
                  ) : error ? (
                    <div className="p-8 text-center text-red-600">
                      {error}
                    </div>
                  ) : userPins[activeTab].length === 0 ? (
                    <div className="p-8 text-center text-gray-600">
                      {activeTab === 'pending' && "You don't have any pending submissions."}
                      {activeTab === 'approved' && "You don't have any approved pins yet."}
                      {activeTab === 'rejected' && "You don't have any rejected submissions."}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {userPins[activeTab].map(pin => (
                        <div key={pin.id} className="p-4 hover:bg-gray-50">
                          <div className="flex justify-between">
                            <h3 className="font-medium text-gray-900">{pin.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              pin.requestType === 'addition' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {pin.requestType === 'addition' ? 'Addition' : 'Deletion'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{pin.description}</p>
                          <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                            <span>Submitted: {new Date(pin.submittedAt).toLocaleDateString()}</span>
                            <span className={`font-medium ${
                              activeTab === 'approved' ? 'text-green-600' : 
                              activeTab === 'rejected' ? 'text-red-600' : 'text-amber-600'
                            }`}>
                              {activeTab === 'approved' ? 'Approved' : 
                               activeTab === 'rejected' ? 'Rejected' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 