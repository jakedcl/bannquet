export type GyroDiagSample = {
  t: number;
  step: string | null;
  eventType: string;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: boolean;
  webkitHeading: number | null;
  webkitAccuracy: number | null;
  screenAngle: number;
  windowOrientation: number | string;
  rawHeading: number | null;
  rawPitch: number | null;
  smoothHeading: number | null;
  smoothPitch: number | null;
  yawOffset: number;
  yawReady: boolean;
  guardHeld: boolean;
};

export type GyroDiagLive = GyroDiagSample & {
  eventHz: number;
};

export const GYRO_STEP_LABELS = [
  'Upright N',
  'Upright E',
  'Tilt up',
  'Tilt down',
  'Roll',
  'Flat',
] as const;

export type GyroStepLabel = (typeof GYRO_STEP_LABELS)[number];

const RECORD_MS = 30_000;
const MAX_SAMPLES = 4_000;

export type GyroRecorder = ReturnType<typeof createGyroRecorder>;

export function createGyroRecorder() {
  let recording = false;
  let recordUntil = 0;
  let step: GyroStepLabel | null = null;
  const samples: GyroDiagSample[] = [];

  return {
    isRecording(): boolean {
      return recording;
    },
    startRecording(now = Date.now()) {
      recording = true;
      recordUntil = now + RECORD_MS;
      samples.length = 0;
    },
    stopRecording() {
      recording = false;
      recordUntil = 0;
    },
    setStep(label: GyroStepLabel | null) {
      step = label;
    },
    currentStep(): GyroStepLabel | null {
      return step;
    },
    push(sample: GyroDiagSample, now = Date.now()) {
      if (!recording) return;
      if (now > recordUntil) {
        recording = false;
        return;
      }
      samples.push({ ...sample, step });
      if (samples.length > MAX_SAMPLES) samples.shift();
    },
    remainingMs(now = Date.now()): number {
      return recording ? Math.max(0, recordUntil - now) : 0;
    },
    exportJson(): string {
      return JSON.stringify({ recordedAt: new Date().toISOString(), samples }, null, 0);
    },
    exportCsv(): string {
      const head = [
        't',
        'step',
        'eventType',
        'alpha',
        'beta',
        'gamma',
        'absolute',
        'webkitHeading',
        'webkitAccuracy',
        'screenAngle',
        'windowOrientation',
        'rawHeading',
        'rawPitch',
        'smoothHeading',
        'smoothPitch',
        'yawOffset',
        'yawReady',
        'guardHeld',
      ];
      const rows = samples.map((s) => head.map((key) => {
        const value = s[key as keyof GyroDiagSample];
        if (value == null) return '';
        if (typeof value === 'boolean') return value ? '1' : '0';
        return String(value);
      }).join(','));
      return [head.join(','), ...rows].join('\n');
    },
    count(): number {
      return samples.length;
    },
  };
}

export function eventRateHz(timestamps: readonly number[], now: number, windowMs = 1000): number {
  const start = now - windowMs;
  let count = 0;
  for (let i = timestamps.length - 1; i >= 0; i -= 1) {
    const t = timestamps[i];
    if (t > now) continue;
    if (t < start) break;
    count += 1;
  }
  return count;
}
