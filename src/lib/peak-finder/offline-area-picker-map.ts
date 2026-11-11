/** Geographic bounds of the offline save square (axis-aligned, side ≈ 2× radius). */
export function offlineSaveBounds(
  lat: number,
  lng: number,
  radiusM: number,
): { west: number; south: number; east: number; north: number } {
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLat = radiusM / 110_574;
  const dLng = radiusM / (111_320 * Math.max(0.2, cos));
  return {
    west: lng - dLng,
    south: lat - dLat,
    east: lng + dLng,
    north: lat + dLat,
  };
}

export function boxFitsViewport(
  boxWidthPx: number,
  boxHeightPx: number,
  viewWidthPx: number,
  viewHeightPx: number,
  paddingPx = 24,
): boolean {
  if (viewWidthPx <= 0 || viewHeightPx <= 0) return false;
  const innerW = viewWidthPx - paddingPx * 2;
  const innerH = viewHeightPx - paddingPx * 2;
  return boxWidthPx <= innerW && boxHeightPx <= innerH;
}
