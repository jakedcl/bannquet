// Portable Text types (simplified)
export interface PortableTextBlock {
  _type: 'block' | 'image';
  _key: string;
  [key: string]: any;
}

export interface TripReport {
  _id: string;
  _type: 'tripReport';
  _createdAt: string;
  _updatedAt: string;
  title: string;
  authorName: string;
  authorEmail: string;
  tripDate: string; // ISO date string
  locationPin: {
    _type: 'geopoint';
    lat: number;
    lng: number;
    alt?: number;
  };
  body: PortableTextBlock[];
  tags?: string[];
  published: boolean;
  publishedAt: string;
}

export interface TripReportFormData {
  title: string;
  authorName: string;
  tripDate: string;
  locationPin: {
    lat: number;
    lng: number;
  };
  body: Array<{
    type: 'text' | 'image';
    content?: string; // For text blocks
    image?: File; // For image blocks
    caption?: string; // For image captions
    alt?: string; // For image alt text
  }>;
}
