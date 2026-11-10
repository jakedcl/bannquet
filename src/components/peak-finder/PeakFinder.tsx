'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BARE_EARTH_NOTE,
  DEFAULT_HFOV_DEG,
  MAX_HFOV_DEG,
  MIN_HFOV_DEG,
  MOVE_CHECK_MS,
  PEAK_CREDITS,
} from '@/lib/peak-finder/constants';
import { declinationAt, loadDeclination, type DeclinationTable } from '@/lib/peak-finder/declination';
import { wrap360 } from '@/lib/peak-finder/geo';
import { acceptMove, noteSample, type FinderMode, type LockState, type Spot } from '@/lib/peak-finder/location';
import { MAP_CENTER } from '@/lib/map';
import {
  compassUnsure,
  headingJump,
  magneticHeading,
  pushSample,
  requestMotionPermission,
  viewHeading,
  viewPitch,
  viewRoll,
  circularMean,
} from '@/lib/peak-finder/orientation';
import type { SkylinePayload, WorkerOut } from '@/lib/peak-finder/payload';
import { loadPeaksAround } from '@/lib/peak-finder/peaks';
import { initialFov, readCalibration, readLast, writeCalibration, writeLast } from '@/lib/peak-finder/storage';
import type { VisiblePeak } from '@/lib/peak-finder/visibility';
import { CameraView } from './CameraView';
import { DrawnView } from './DrawnView';
import { LineUp } from './LineUp';
import { PeakCard } from './PeakCard';
import { SpotPicker } from './SpotPicker';
import type { ViewPose } from './SkylineStage';

const DEFAULT_PIN: Spot = { lat: MAP_CENTER.lat, lng: MAP_CENTER.lng };

type Coverage = 'full' | 'partial' | 'none';

export function PeakFinder() {
  const [booted, setBooted] = useState(false);
  const [phone, setPhone] = useState(false);
  const [mode, setMode] = useState<FinderMode>('spot');
  const [phase, setPhase] = useState<'map' | 'view'>('view');
  const [pin, setPin] = useState<Spot>(DEFAULT_PIN);
  const [lock, setLock] = useState<LockState>({ locked: null, pending: null });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<SkylinePayload | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Coverage>('full');
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<{ peak: VisiblePeak; anchor: { x: number; y: number } } | null>(null);
  const [liningUp, setLiningUp] = useState(false);
  const [useCompass, setUseCompass] = useState(false);
  const [unsure, setUnsure] = useState(false);
  const [declinationNote, setDeclinationNote] = useState<string | null>(null);
  const [table, setTable] = useState<DeclinationTable | null>(null);

  const viewRef = useRef<ViewPose>({ heading: 0, pitch: 0, roll: 0, hfov: DEFAULT_HFOV_DEG });
  const offsetRef = useRef(0);
  const baseRef = useRef(0);
  const followRef = useRef(false);
  const modeRef = useRef<FinderMode>('spot');
  const streamRef = useRef<MediaStream | null>(null);

  const getView = useCallback(() => viewRef.current, []);

  useEffect(() => {
    // localStorage and matchMedia differ from the server render, so this runs after hydration.
    const saved = readLast();
    const calibration = readCalibration();
    const narrow = window.matchMedia('(max-width: 1023px)').matches;
    const nextMode: FinderMode = narrow ? (saved?.mode ?? 'live') : 'spot';
    modeRef.current = nextMode;
    offsetRef.current = calibration.headingOffset;
    viewRef.current = {
      heading: saved?.heading ?? 0,
      pitch: 0,
      roll: 0,
      hfov: initialFov(calibration, saved),
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one client read after hydration
    setPhone(narrow);
    setMode(nextMode);
    if (saved) setPin({ lat: saved.lat, lng: saved.lng });
    setPhase(narrow && nextMode === 'spot' ? 'map' : 'view');
    setBooted(true);
    const media = window.matchMedia('(max-width: 1023px)');
    const onMedia = () => setPhone(media.matches);
    media.addEventListener('change', onMedia);
    return () => media.removeEventListener('change', onMedia);
  }, []);

  useEffect(() => {
    loadDeclination().then(setTable).catch(() => setDeclinationNote('The true-north fix did not load. Line up if the labels sit off to one side.'));
  }, []);

  const spot: Spot | null = mode === 'live'
    ? lock.locked
    : phone && phase === 'map'
      ? null
      : pin;
  const spotLat = spot?.lat ?? null;
  const spotLng = spot?.lng ?? null;

  const declination = spotLat != null && spotLng != null && table ? declinationAt(table, spotLat, spotLng) ?? 0 : 0;
  const spotKey = !booted || spotLat == null || spotLng == null ? '' : `${spotLat.toFixed(5)},${spotLng},${attempt}`;
  const [trackedSpot, setTrackedSpot] = useState('');
  if (spotKey !== trackedSpot) {
    setTrackedSpot(spotKey);
    setPayload(null);
    setSelected(null);
    setError(null);
    setProgress(spotKey ? 'Loading peaks' : null);
  }

  useEffect(() => {
    followRef.current = mode === 'live' || useCompass;
  }, [mode, useCompass]);

  useEffect(() => {
    if (!booted || spotLat == null || spotLng == null) return;
    let cancelled = false;
    const worker = new Worker(new URL('../../lib/peak-finder/peak-finder.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<WorkerOut>) => {
      if (cancelled) return;
      const message = event.data;
      if (message.type === 'progress') {
        setProgress(message.total > 0 ? `${message.stage} ${message.loaded} of ${message.total}` : message.stage);
      } else if (message.type === 'result') {
        setPayload(message.payload);
        setProgress(null);
      } else {
        setError(message.message);
        setProgress(null);
      }
    };
    loadPeaksAround(spotLat, spotLng).then((loaded) => {
      if (cancelled) return;
      if (loaded.loaded.length === 0) setCoverage('none');
      else if (loaded.loaded.length < loaded.wanted.length) setCoverage('partial');
      else setCoverage('full');
      worker.postMessage({
        type: 'build',
        lat: spotLat,
        lng: spotLng,
        peaks: loaded.peaks,
      });
    }).catch(() => {
      if (!cancelled) {
        setError('The peak list did not load.');
        setProgress(null);
      }
    });
    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, [booted, spotLat, spotLng, attempt]);

  useEffect(() => {
    if (!followRef.current) return;
    if (mode !== 'live' && !useCompass) return;
    let buffer: number[] = [];
    let previous: number | null = null;
    const onReading = (event: DeviceOrientationEvent) => {
      const extra = event as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
      const magnetic = magneticHeading({
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: event.absolute,
        webkitCompassHeading: extra.webkitCompassHeading,
      });
      if (magnetic == null || !followRef.current) return;
      buffer = pushSample(buffer, magnetic);
      const smooth = circularMean(buffer);
      const screenAngle = window.screen?.orientation?.angle ?? 0;
      baseRef.current = viewHeading(smooth, declination, screenAngle, 0);
      viewRef.current.heading = wrap360(baseRef.current + offsetRef.current);
      viewRef.current.pitch = viewPitch(event.beta, event.gamma, screenAngle);
      viewRef.current.roll = viewRoll(event.beta, event.gamma, screenAngle);
      setUnsure(compassUnsure(extra.webkitCompassAccuracy, headingJump(previous, magnetic)));
      previous = magnetic;
    };
    window.addEventListener('deviceorientationabsolute', onReading);
    window.addEventListener('deviceorientation', onReading);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onReading);
      window.removeEventListener('deviceorientation', onReading);
    };
  }, [mode, useCompass, declination]);

  useEffect(() => {
    if (mode !== 'live' || !lock.locked) return;
    const timer = window.setInterval(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((position) => {
        setLock((state) => noteSample(state, 'live', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }).state);
      }, () => {}, { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 });
    }, MOVE_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [mode, lock.locked]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function remember(at: Spot = pin) {
    const pose = viewRef.current;
    writeLast({
      lat: at.lat,
      lng: at.lng,
      heading: pose.heading,
      hfov: pose.hfov,
      mode: modeRef.current,
    });
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setLiningUp(false);
  }

  function chooseMode(next: FinderMode, options?: { phase?: 'map' | 'view'; at?: Spot }) {
    modeRef.current = next;
    setMode(next);
    setLiveMessage(null);
    setSelected(null);
    if (options?.at) setPin(options.at);
    if (next === 'spot') {
      stopCamera();
      setLock({ locked: null, pending: null });
      setUseCompass(false);
      setPhase(options?.phase ?? (phone ? 'map' : 'view'));
    } else {
      setPhase('view');
    }
    remember(options?.at);
  }

  async function startLive() {
    setLiveMessage(null);
    if (typeof OffscreenCanvas === 'undefined') {
      setError('This browser cannot draw the skyline. Use a current Safari or Chrome.');
      chooseMode('spot');
      return;
    }
    const motion = await requestMotionPermission();
    let here: Spot | null = null;
    try {
      here = await new Promise<Spot>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          () => reject(new Error('location')),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 12_000 },
        );
      });
    } catch {
      here = null;
    }
    let nextStream: MediaStream | null = null;
    try {
      nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch {
      nextStream = null;
    }
    if (!nextStream || !here || motion === 'denied') {
      nextStream?.getTracks().forEach((track) => track.stop());
      chooseMode('spot', here ? { phase: 'view', at: here } : undefined);
      setLiveMessage('The camera, compass, or location was blocked. Drop a pin and drag the skyline.');
      return;
    }
    streamRef.current = nextStream;
    setStream(nextStream);
    setLock({ locked: here, pending: null });
    setMode('live');
    modeRef.current = 'live';
  }

  function onLook(headingDelta: number, pitchDelta: number, fovScale: number) {
    if (liningUp && mode === 'live') {
      offsetRef.current += headingDelta;
      viewRef.current.heading = wrap360(baseRef.current + offsetRef.current);
    } else if (!followRef.current) {
      viewRef.current.heading = wrap360(viewRef.current.heading + headingDelta);
    }
    viewRef.current.pitch = Math.min(35, Math.max(-20, viewRef.current.pitch + pitchDelta));
    if (fovScale !== 1) {
      viewRef.current.hfov = Math.min(MAX_HFOV_DEG, Math.max(MIN_HFOV_DEG, viewRef.current.hfov / fovScale));
    }
  }

  const lookRef = useRef(onLook);
  useEffect(() => {
    lookRef.current = onLook;
  });
  const look = useCallback((headingDelta: number, pitchDelta: number, fovScale: number) => {
    lookRef.current(headingDelta, pitchDelta, fovScale);
  }, []);

  function finishLineUp() {
    setLiningUp(false);
    writeCalibration({ headingOffset: offsetRef.current, hfov: viewRef.current.hfov });
    remember();
  }

  const showMoved = mode === 'live' && lock.pending != null;

  if (!booted) {
    return <p className="p-4 text-sm font-bold text-[#1a1a1a]">Loading Peak Finder</p>;
  }

  const showMap = mode === 'spot' && (phone ? phase === 'map' : true);
  const showDrawing = mode === 'spot' && (!phone || phase === 'view');
  const showCamera = mode === 'live' && stream != null;

  return (
    <div className="relative flex h-full min-h-0 bg-[#e7e1d4] text-[#1a1a1a]">
      {showMap ? (
        <div className={phone ? 'relative h-full w-full' : 'relative h-full w-[min(42%,28rem)] shrink-0 border-r-2 border-[#5c3a1e]'}>
          <SpotPicker
            lat={pin.lat}
            lng={pin.lng}
            onChange={(next) => {
              setPin(next);
              setSelected(null);
              if (!phone) writeLast({ ...next, heading: viewRef.current.heading, hfov: viewRef.current.hfov, mode: 'spot' });
            }}
          />
          {phone ? (
            <div className="absolute inset-x-3 bottom-3 z-10 flex flex-col gap-2">
              <p className="bg-[#e7e1d4]/90 px-1 text-[11px] leading-snug text-[#1a1a1a]">{PEAK_CREDITS}</p>
              <div className="flex gap-2">
                <button type="button" className="retro-button min-h-11 px-3 text-xs" onClick={() => void startLive()}>
                  Live
                </button>
                <button
                  type="button"
                  className="retro-button min-h-11 flex-1 px-3 text-xs"
                  onClick={() => {
                    setPhase('view');
                    writeLast({ lat: pin.lat, lng: pin.lng, heading: viewRef.current.heading, hfov: viewRef.current.hfov, mode: 'spot' });
                  }}
                >
                  View from here
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'live' && !stream ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-bold text-[#2d5016]">Peak Finder</h1>
          <p className="max-w-sm text-sm leading-snug">
            Hold your phone up and the peaks you can see get their names.
          </p>
          <button type="button" className="retro-button min-h-11 px-6" onClick={() => void startLive()}>
            Start
          </button>
          <button type="button" className="retro-button min-h-11 px-6 text-xs" onClick={() => chooseMode('spot')}>
            Pick a spot
          </button>
        </div>
      ) : null}

      {showCamera || showDrawing ? (
        <div className="relative min-w-0 flex-1">
          {showCamera ? (
            <CameraView
              stream={stream}
              payload={payload}
              getView={getView}
              selectedName={selected?.peak.name ?? null}
              onLook={liningUp ? look : null}
              onPick={(peak, anchor) => setSelected({ peak, anchor })}
            />
          ) : (
            <DrawnView
              payload={payload}
              getView={getView}
              selectedName={selected?.peak.name ?? null}
              onLook={look}
              onSettle={() => remember()}
              listenKeys={!phone}
              onPick={(peak, anchor) => setSelected({ peak, anchor })}
            />
          )}
          {liningUp ? <div className="absolute inset-x-0 top-0 z-20"><LineUp onDone={finishLineUp} /></div> : null}
          {selected ? (
            <PeakCard
              peak={selected.peak}
              dock={phone ? 'bottom' : 'float'}
              anchor={selected.anchor}
              onClose={() => setSelected(null)}
            />
          ) : null}
          <Status
            progress={progress}
            error={error}
            coverage={coverage}
            payload={payload}
            liveMessage={liveMessage}
            unsure={unsure && (mode === 'live' || useCompass)}
            declinationNote={declinationNote}
            onRetry={() => setAttempt((value) => value + 1)}
          />
          {showMoved ? (
            <button
              type="button"
              className="retro-button absolute bottom-36 left-1/2 z-20 min-h-11 -translate-x-1/2 px-3 text-xs"
              onClick={() => {
                const next = acceptMove(lock);
                setLock(next.state);
              }}
            >
              You&apos;ve moved. Update view
            </button>
          ) : null}
          <Controls
            mode={mode}
            phone={phone}
            useCompass={useCompass}
            onLive={() => {
              if (!stream) void startLive();
            }}
            onSpot={() => chooseMode('spot')}
            onLineUp={mode === 'live' && stream ? () => setLiningUp(true) : null}
            onCompass={phone && mode === 'spot' && phase === 'view' ? () => {
              if (useCompass) {
                setUseCompass(false);
                return;
              }
              void requestMotionPermission().then((result) => {
                if (result === 'denied') {
                  setLiveMessage('Compass permission was blocked. Drag the skyline instead.');
                  return;
                }
                setUseCompass(true);
              });
            } : null}
            onChangeSpot={phone && mode === 'spot' && phase === 'view' ? () => setPhase('map') : null}
            coverageNote={coverage === 'partial' ? 'Some surrounding peak lists are not in this build, so a few names may be missing.' : null}
          />
        </div>
      ) : null}

    </div>
  );
}

function Status({
  progress,
  error,
  coverage,
  payload,
  liveMessage,
  unsure,
  declinationNote,
  onRetry,
}: {
  progress: string | null;
  error: string | null;
  coverage: Coverage;
  payload: SkylinePayload | null;
  liveMessage: string | null;
  unsure: boolean;
  declinationNote: string | null;
  onRetry: () => void;
}) {
  const text = error
    ?? progress
    ?? liveMessage
    ?? (unsure ? 'Compass unsure. Line up.' : null)
    ?? declinationNote
    ?? (coverage === 'none' ? 'Peak names for this spot are not in this build. The Northeast is loaded: NY, NJ, PA, CT, RI, MA, VT, NH, ME.' : null)
    ?? (payload && payload.peaks.length === 0 ? 'No named peaks are visible from here.' : null);
  if (!text) return null;
  return (
    <div className="absolute left-1/2 top-2 z-20 w-[min(28rem,calc(100%-1rem))] -translate-x-1/2 bg-[#1a1a1a]/80 px-3 py-2 text-center text-sm font-bold leading-snug text-white" role="status">
      <p>{text}</p>
      {error ? (
        <button type="button" className="retro-button mt-2 min-h-11 px-3 text-xs" onClick={onRetry}>Try again</button>
      ) : null}
    </div>
  );
}

function Controls({
  mode,
  phone,
  useCompass,
  onLive,
  onSpot,
  onLineUp,
  onCompass,
  onChangeSpot,
  coverageNote,
}: {
  mode: FinderMode;
  phone: boolean;
  useCompass: boolean;
  onLive: () => void;
  onSpot: () => void;
  onLineUp: (() => void) | null;
  onCompass: (() => void) | null;
  onChangeSpot: (() => void) | null;
  coverageNote: string | null;
}) {
  const onCamera = mode === 'live';
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 px-2 pb-2 ${onCamera ? 'text-white' : 'text-[#1a1a1a]'}`}>
      <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-1">
        <div className="flex flex-wrap gap-1.5">
          {phone ? (
            <button type="button" className="retro-button min-h-11 px-3 text-xs" aria-pressed={mode === 'live'} onClick={onLive}>
              Live
            </button>
          ) : null}
          <button type="button" className="retro-button min-h-11 px-3 text-xs" aria-pressed={mode === 'spot'} onClick={onSpot}>
            Pick a spot
          </button>
          {onLineUp ? (
            <button type="button" className="retro-button min-h-11 px-3 text-xs" onClick={onLineUp}>Line up</button>
          ) : null}
          {onCompass ? (
            <button type="button" className="retro-button min-h-11 px-3 text-xs" aria-pressed={useCompass} onClick={onCompass}>
              Use compass
            </button>
          ) : null}
          {onChangeSpot ? (
            <button type="button" className="retro-button min-h-11 px-3 text-xs" onClick={onChangeSpot}>Change spot</button>
          ) : null}
        </div>
        {coverageNote ? <p className={`text-[11px] leading-snug ${onCamera ? 'bg-black/55 px-1' : ''}`}>{coverageNote}</p> : null}
        <p className={`text-[11px] leading-snug ${onCamera ? 'bg-black/55 px-1' : ''}`}>{PEAK_CREDITS}</p>
        <p className={`text-[11px] leading-snug ${onCamera ? 'bg-black/55 px-1' : ''}`}>{BARE_EARTH_NOTE}</p>
      </div>
    </div>
  );
}
