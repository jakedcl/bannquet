import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// Sanity client configuration
// These will be set via environment variables
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01';
const token = process.env.SANITY_API_TOKEN || '';

// Only create clients if projectId is configured
// Read-only client for fetching data (public)
export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: true, // Use CDN for faster reads
    })
  : null;

// Write client for mutations (requires token)
export const sanityWriteClient = projectId && token
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn: false, // Don't use CDN for writes
      token, // API token with write permissions
    })
  : null;

// Image URL builder for optimized images
const builder = sanityClient ? imageUrlBuilder(sanityClient) : null;

export function urlForImage(source: any) {
  if (!builder) return null;
  return builder.image(source);
}

// Helper function to get optimized image URL
export function getImageUrl(
  image: any,
  width?: number,
  height?: number,
  quality: number = 80
) {
  if (!builder || !image?.asset) return null;
  
  let urlBuilder = builder.image(image);
  
  if (width) urlBuilder = urlBuilder.width(width);
  if (height) urlBuilder = urlBuilder.height(height);
  
  return urlBuilder.quality(quality).format('webp').url();
}

// GROQ query helpers
export const tripReportsQuery = `*[_type == "tripReport"] | order(publishedAt desc) {
  _id,
  _type,
  _createdAt,
  _updatedAt,
  title,
  author,
  date,
  location,
  description,
  images,
  tags,
  publishedAt
}`;

export const tripReportByIdQuery = (id: string) => `*[_type == "tripReport" && _id == $id][0] {
  _id,
  _type,
  _createdAt,
  _updatedAt,
  title,
  author,
  date,
  location,
  description,
  images,
  tags,
  publishedAt
}`;

export const tripReportsByAuthorQuery = (author: string) => `*[_type == "tripReport" && author == $author] | order(publishedAt desc) {
  _id,
  _type,
  _createdAt,
  _updatedAt,
  title,
  author,
  date,
  location,
  description,
  images,
  tags,
  publishedAt
}`;

export const tripReportsByTagQuery = (tag: string) => `*[_type == "tripReport" && $tag in tags] | order(publishedAt desc) {
  _id,
  _type,
  _createdAt,
  _updatedAt,
  title,
  author,
  date,
  location,
  description,
  images,
  tags,
  publishedAt
}`;
