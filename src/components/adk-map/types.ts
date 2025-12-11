export interface Pin {
  id?: string;
  name: string;
  coordinates: [number, number];
  elevation?: string;
  type: string;
  source: string;
  // Fields for user-submitted pins
  description?: string;
  submitterName?: string;
  submitterEmail?: string;
  includeSubmitterName?: boolean;
  includeSubmitterEmail?: boolean;
}

export interface Category {
  name: string;
  id: string;
  endpoint: string;
  color: string;
}

export interface PinData {
  [categoryId: string]: Pin[];
}

export interface VisibleCategories {
  [categoryId: string]: boolean;
}

export interface PinSubmission {
  id?: string;
  name: string;
  coordinates: [number, number];
  elevation?: string;
  categoryId: string;
  description: string;
  submitterName: string;
  submitterEmail: string;
  includeSubmitterName: boolean;
  includeSubmitterEmail: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'legacy';
  submittedAt: string;
  updatedAt?: string;
  requestType: 'addition' | 'deletion';
  targetPinId?: string;
}

export interface UserSession {
  name: string;
  email: string;
  password?: string;
  isLoggedIn: boolean;
  isAdmin?: boolean;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt?: string;
  pinnedPins?: number;
}

export interface UserPins {
  pending: PinSubmission[];
  approved: PinSubmission[];
  rejected: PinSubmission[];
} 