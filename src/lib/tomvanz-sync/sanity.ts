import { SANITY_CDN_BASE } from './constants';
import { isPublishedSanityId } from './map';

export type SanityPhoto = {
  _id: string;
  _type: 'photo';
  _updatedAt: string;
  title?: string | null;
  note?: string | null;
  takenAt?: string | null;
  image?: {
    asset?: { _ref?: string | null } | null;
  } | null;
  location?: { lat?: number; lng?: number } | null;
  dimensions?: { width?: number; height?: number } | null;
};

export type SanityTrack = {
  _id: string;
  _type: 'track';
  _updatedAt: string;
  title?: string | null;
  activity?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  distanceMeters?: number | null;
  route?: { coordinates?: string | null } | null;
  fileUrl?: string | null;
};

type SanityQueryResult<T> = { result: T };

async function sanityQuery<T>(groq: string): Promise<T> {
  const url = `${SANITY_CDN_BASE}?query=${encodeURIComponent(groq)}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Sanity query failed (${res.status}).`);
  const json = (await res.json()) as SanityQueryResult<T>;
  return json.result;
}

const LIST_IDS_GROQ =
  '*[_type in ["photo","track"] && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]{_id,_type}';

const PHOTO_BY_ID = `*[_type=="photo" && _id==$id][0]{
  _id,_type,_updatedAt,title,note,takenAt,
  image,
  location,
  "dimensions": image.asset->metadata.dimensions
}`;

const TRACK_BY_ID = `*[_id==$id && _type=="track"][0]{
  _id,_type,_updatedAt,title,activity,startedAt,endedAt,distanceMeters,
  route,
  "fileUrl": file.asset->url
}`;

export async function listPublishedSanityDocs(): Promise<Array<{ _id: string; _type: 'photo' | 'track' }>> {
  const rows = await sanityQuery<Array<{ _id: string; _type: string }>>(LIST_IDS_GROQ);
  return rows.flatMap((row) => {
    if (!isPublishedSanityId(row._id)) return [];
    if (row._type !== 'photo' && row._type !== 'track') return [];
    return [{ _id: row._id, _type: row._type }];
  });
}

export async function fetchSanityPhoto(id: string): Promise<SanityPhoto | null> {
  return sanityQuery<SanityPhoto | null>(PHOTO_BY_ID.replace('$id', `"${id}"`));
}

export async function fetchSanityTrack(id: string): Promise<SanityTrack | null> {
  return sanityQuery<SanityTrack | null>(TRACK_BY_ID.replace('$id', `"${id}"`));
}

export async function fetchSanityDoc(id: string): Promise<SanityPhoto | SanityTrack | null> {
  const photo = await fetchSanityPhoto(id);
  if (photo?._id) return photo;
  const track = await fetchSanityTrack(id);
  if (track?._id) return track;
  return null;
}