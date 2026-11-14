/** Align NWS station metadata elevation with USGS EPQS at station coordinates. */
export function resolveStationElevationFt(
  nwsElevationFt: number | null,
  epqsElevationFt: number | null,
  toleranceFt = 200,
): { elevationFt: number | null; elevationSource: string; rejectedNws: boolean } {
  if (epqsElevationFt !== null && nwsElevationFt !== null) {
    const delta = Math.abs(epqsElevationFt - nwsElevationFt);
    if (delta > toleranceFt) {
      return {
        elevationFt: epqsElevationFt,
        elevationSource: 'USGS EPQS (NWS metadata rejected)',
        rejectedNws: true,
      };
    }
    return { elevationFt: nwsElevationFt, elevationSource: 'NWS metadata', rejectedNws: false };
  }
  if (epqsElevationFt !== null) {
    return { elevationFt: epqsElevationFt, elevationSource: 'USGS EPQS', rejectedNws: false };
  }
  if (nwsElevationFt !== null) {
    return { elevationFt: nwsElevationFt, elevationSource: 'NWS metadata', rejectedNws: false };
  }
  return { elevationFt: null, elevationSource: 'unknown', rejectedNws: false };
}