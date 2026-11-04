import { ACTIVITY_META, isActivity } from '@/lib/activities';
import { formatTripDate } from '@/lib/utils';

/** One clickable thing on the map: a route start, a pin, or a photo. */
export type MapLeaf = {
  title: string;
  who: string;
  date: string | null;
  activity: string | null;
  category: string;
  kind: string;
  color: string;
  trackId: string;
  href: string;
  lng: number;
  lat: number;
};

export function activityLabel(activity: string | null): string {
  if (activity && isActivity(activity)) return ACTIVITY_META[activity].label;
  return 'Photo';
}

export function leafFromProps(props: Record<string, unknown>, lng: number, lat: number): MapLeaf {
  return {
    title: String(props.title ?? 'Pin'),
    who: String(props.who ?? 'Friend'),
    date: props.date ? String(props.date) : null,
    activity: props.activity ? String(props.activity) : null,
    category: props.category ? String(props.category) : '',
    kind: props.kind ? String(props.kind) : props.trackId ? 'route' : '',
    color: String(props.color ?? '#444444'),
    trackId: String(props.trackId ?? ''),
    href: String(props.href ?? '/map'),
    lng,
    lat,
  };
}

/** "Jake · Oct 3, 2026 · Hike · Campsite" */
export function leafMeta(leaf: MapLeaf): string {
  const bits = [leaf.who];
  if (leaf.date) bits.push(formatTripDate(leaf.date));
  bits.push(activityLabel(leaf.activity));
  if (leaf.category) bits.push(leaf.category);
  return bits.join(' · ');
}
