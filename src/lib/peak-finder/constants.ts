/** Shared Peak Finder numbers. Version 1 limits from the build guide. */

export const MAX_DISTANCE_M = 200_000;
export const EARTH_RADIUS_M = 6_371_000;
export const REFRACTION_K = 0.13;
export const EYE_ABOVE_TERRAIN_M = 1.7;
export const MOVED_THRESHOLD_M = 1_000;
export const MOVE_CHECK_MS = 30_000;
export const DEFAULT_HFOV_DEG = 70;
/** Horizontal FOV used in gyro follow so 1° of device tilt ≈ 1° on the skyline (iPhone portrait primary camera). */
export const GYRO_HFOV_DEG = 68;
export const GYRO_PITCH_MIN_DEG = -85;
export const GYRO_PITCH_MAX_DEG = 85;
export const MIN_HFOV_DEG = 22;
export const MAX_HFOV_DEG = 110;
export const PHONE_LABEL_CAP = 40;
export const DESKTOP_LABEL_CAP = 80;
export const LABEL_MIN_GAP_PX = 44;
export const CHUNK_DEG = 2;
export const VISIBLE_TOLERANCE_DEG = 0.05;
export const MIN_PROMINENCE_DEG = 0.1;
export const CLOSE_ALWAYS_M = 5_000;
export const RAY_STEP_DEG = 0.1;
export const TERRAIN_CACHE = 'pf-terrain-v1';
export const PEAKS_CACHE = 'pf-peaks-v1';
export const TERRAIN_CACHE_CAP_BYTES = 150 * 1024 * 1024;
/** Radius saved for each offline area (terrain + peaks). */
export const OFFLINE_RADIUS_M = 100_000;
export const OFFLINE_DB_NAME = 'pf-offline-v1';
export const OFFLINE_AREAS_STORE = 'areas';
export const OFFLINE_AVG_TILE_BYTES = 80_000;
export const OFFLINE_AVG_CHUNK_BYTES = 48_000;
export const LAST_KEY = 'pf:last:v1';
export const CALIBRATION_KEY = 'pf:calibration:v1';

/** Mount Marcy summit, used by the tile and chunk tests. */
export const MARCY = { lat: 44.112778, lng: -73.923889, elevationM: 1629 };

/** Algonquin Peak, the neighbor Marcy's summit can see. */
export const ALGONQUIN = { lat: 44.1437, lng: -73.9863, elevationM: 1559 };

export const PEAK_CREDITS =
  'Peaks © OpenStreetMap contributors (ODbL), GeoNames (CC BY 4.0). Terrain: AWS Terrain Tiles, USGS 3DEP.';

export const BARE_EARTH_NOTE =
  'Terrain is bare earth, so trees and buildings can hide a peak the line still shows.';
