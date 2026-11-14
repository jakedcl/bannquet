const EVENT_COLORS: Record<string, string> = {
  'Winter Storm Warning': '#6a1b9a',
  'Winter Storm Watch': '#9c27b0',
  'Winter Weather Advisory': '#ce93d8',
  'Blizzard Warning': '#4a148c',
  'Ice Storm Warning': '#311b92',
  'Freeze Warning': '#5e35b1',
  'Freeze Watch': '#7e57c2',
  'Wind Advisory': '#fb8c00',
  'High Wind Warning': '#e65100',
  'High Wind Watch': '#ff9800',
  'Flood Warning': '#1565c0',
  'Flood Watch': '#42a5f5',
  'Flood Advisory': '#81d4fa',
  'Severe Thunderstorm Warning': '#c62828',
  'Severe Thunderstorm Watch': '#ef5350',
  'Tornado Warning': '#b71c1c',
  'Tornado Watch': '#e53935',
  'Special Weather Statement': '#546e7a',
  'Hazardous Weather Outlook': '#78909c',
};

export function colorForAlertEvent(event: string): string {
  return EVENT_COLORS[event] ?? '#795548';
}