/** Short footer label for the GYX/CAR allLocations XML feed (not the raw URL). */
export function allLocationsSourceLinkLabel(office: 'GYX' | 'CAR' | undefined): string {
  if (office === 'GYX') return 'Gray climate records';
  if (office === 'CAR') return 'Caribou climate records';
  return 'NWS allLocations feed';
}