export interface TripReport {
  _id: string;
  _type: 'tripReport';
  _createdAt: string;
  _updatedAt: string;
  title: string;
  author: string;
  date: string; // ISO date string
  location: {
    name: string;
    region?: string;
    coordinates?: {
      lat: number;
      lng: number;
      alt?: number;
    };
  };
  description: string;
  images: Array<{
    _key: string;
    asset: {
      _ref: string;
      _type: 'reference';
    };
    alt?: string;
  }>;
  tags: string[];
  publishedAt: string;
}

export interface TripReportFormData {
  title: string;
  author: string;
  date: string;
  location: {
    name: string;
    region?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  description: string;
  images: File[];
  tags: string[];
  password?: string; // For simple password protection
}
