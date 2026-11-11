/** How the skyline canvas handles touch/pointer drags. */
export type GestureMode = 'off' | 'pan' | 'adjust';

export function gestureModeFor(options: {
  showSkyline: boolean;
  liningUp: boolean;
  gyroOn: boolean;
  screen: 'start' | 'pick-map' | 'pick-view' | 'explore';
}): GestureMode {
  if (!options.showSkyline) return 'off';
  if (options.liningUp) return 'adjust';
  if (options.gyroOn && options.screen === 'explore') return 'off';
  return 'pan';
}

export function toggleLiningUp(current: boolean): boolean {
  return !current;
}
