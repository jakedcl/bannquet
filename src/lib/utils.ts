/**
 * Get the base URL for the application
 * Handles development, production, and Vercel preview environments
 */
export function getBaseUrl(): string {
  // Development mode - prioritize localhost
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  // Production - use explicit URL or fallback to domain
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Vercel preview deployments
  if (process.env.VERCEL_URL && process.env.VERCEL_URL !== 'bannquet.com') {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback to production domain
  return 'https://bannquet.com';
}

export function formatTripDate(value: string | null, pattern: 'short' | 'long' = 'short'): string {
  if (!value) return 'Date unknown';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', pattern === 'long'
    ? { month: 'long', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
