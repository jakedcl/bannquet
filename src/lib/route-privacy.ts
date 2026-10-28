/**
 * A route can hide its start and end, like a privacy zone. The first and last
 * stretch is cut off on the server, so nobody but the owner ever receives it.
 * Distance and elevation stay whole.
 */
export const HIDDEN_END_METERS = 400;

/** A short route never loses more than a quarter at each end. */
export const MAX_HIDDEN_SHARE = 0.25;

/**
 * Radius of the faded circle drawn at each cut. The hidden end is at most
 * HIDDEN_END_METERS along the trail from the cut, so it sits inside this circle.
 */
export const HIDDEN_ZONE_METERS = 450;

export function seesWholeRoute(route: { hideEnds: boolean; ownerId: string | null }, viewerId: string | null): boolean {
  if (!route.hideEnds) return true;
  return Boolean(viewerId && route.ownerId && route.ownerId === viewerId);
}

/** Circle radius in pixels at zoom 0 (512px tiles) for a zone at this latitude. */
export function zoneRadiusAtZoom0(lat: number, meters = HIDDEN_ZONE_METERS): number {
  const metersPerPixel = (40075016.686 * Math.cos((lat * Math.PI) / 180)) / 512;
  return meters / metersPerPixel;
}
