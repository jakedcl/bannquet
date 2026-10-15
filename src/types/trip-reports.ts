export type TripReportPhoto = {
  id: string;
  url: string;
  caption: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
};

export type TripReportListItem = {
  id: string;
  title: string;
  authorName: string;
  tripDate: string | null;
  activity: string | null;
  tags: string[];
  excerpt: string;
  coverUrl: string | null;
  photoCount: number;
  legacySanityId: string | null;
};

export type TripReportDetail = TripReportListItem & {
  body: string;
  authorId: string | null;
  lat: number | null;
  lng: number | null;
  photos: TripReportPhoto[];
};
