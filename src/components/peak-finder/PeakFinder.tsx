'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BARE_EARTH_NOTE,
  DEFAULT_HFOV_DEG,
  GYRO_HFOV_DEG,
  MAX_HFOV_DEG,
  MIN_HFOV_DEG,
  MOVE_CHECK_MS,
  PEAK_CREDITS,
} from '@/lib/peak-finder/constants';
import { declinationAt, loadDeclination, type DeclinationTable } from '@/lib/peak-finder/declination';
import { readSensorCapable, stackLayout } from '@/lib/peak-finder/device-capabilities';
import { formatFeet } from '@/lib/peak-finder/format';
import { wrap360 } from '@/lib/peak-finder/geo';
import { acceptMove, noteSample, type LockState, type Spot } from '@/lib/peak-finder/location';
import { MAP_CENTER } from '@/lib/map';
import {
  clampGyroViewPitch,
  compassUnsure,
  createGyroSmoother,
  deviceCameraPose,
  headingJump,
  motionAllowed,
  requestMotionPermission,
  updateYawCalibration,
  viewHeading,
  type YawCalibration,
} from '@/lib/peak-finder/orientation';
import type { SkylinePayload, WorkerOut } from '@/lib/peak-finder/payload';
import { loadPeaksAround } from '@/lib/peak-finder/peaks';
import { initialFov, readCalibration, writeCalibration } from '@/lib/peak-finder/storage';
import type { VisiblePeak } from '@/lib/peak-finder/visibility';
import { CameraView } from './CameraView';
import { DesktopPan } from './DesktopPan';
import { DrawnView } from './DrawnView';
import { PeakCard } from './PeakCard';
import { createGyroRecorder, eventRateHz, type GyroDiagLive } from '@/lib/peak-finder/gyro-diagnostics';
import { gestureModeFor } from '@/lib/peak-finder/explore-gestures';
import { PeakFinderGyroDebug } from './PeakFinderGyroDebug';
import { LineUpCaption } from './LineUp';
import { RetroSwitch } from './RetroSwitch';
import { SpotPicker } from './SpotPicker';
import type { ViewPose } from './SkylineStage';

const DEFAULT_PIN: Spot = { lat: MAP_CENTER.lat, lng: MAP_CENTER.lng };
const LOCATION_DENIED = 'Location is blocked. Allow it in your browser settings and try again.';
const CAMERA_DENIED = 'Camera is blocked. Allow it in your browser settings, then turn the camera on to try again.';

type Screen = 'start' | 'explore' | 'pick-map' | 'pick-view';
type Coverage = 'full' | 'partial' | 'none';
type ProgressState = { kind: 'loading'; fraction: number } | null;

export function PeakFinder() {
  const [booted, setBooted] = useState(false);
  const [stacked, setStacked] = useState(false);
  const [sensors, setSensors] = useState(false);
  const [screen, setScreen] = useState<Screen>('start');
  const [startNote, setStartNote] = useState<string | null>(null);
  const [pin, setPin] = useState<Spot>(DEFAULT_PIN);
  const [lock, setLock] = useState<LockState>({ locked: null, pending: null });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const [gyroOn, setGyroOn] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [payload, setPayload] = useState<SkylinePayload | null>(null);
  const [progress, setProgress] = useState<ProgressState>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Coverage>('full');
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<{ peak: VisiblePeak; anchor: { x: number; y: number } } | null>(null);
  const [liningUp, setLiningUp] = useState(false);
  const [unsure, setUnsure] = useState(false);
  const [declinationNote, setDeclinationNote] = useState<string | null>(null);
  const [table, setTable] = useState<DeclinationTable | null>(null);
  const [showDragHint, setShowDragHint] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  const viewRef = useRef<ViewPose>({ heading: 0, pitch: 0, roll: 0, hfov: DEFAULT_HFOV_DEG });
  const offsetRef = useRef(0);
  const baseRef = useRef(0);
  const followRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const unsureRef = useRef(false);
  const debugModeRef = useRef(false);
  const gyroLiveRef = useRef<GyroDiagLive | null>(null);
  const gyroEventTimesRef = useRef<number[]>([]);
  const gyroRecorder = useMemo(() => createGyroRecorder(), []);

  const getView = useCallback(() => viewRef.current, []);

  useEffect(() => {
    const calibration = readCalibration();
    offsetRef.current = calibration.headingOffset;
    viewRef.current = {
      heading: 0,
      pitch: 0,
      roll: 0,
      hfov: initialFov(calibration, null),
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client layout and sensors after hydration
    setSensors(readSensorCapable());
    setStacked(stackLayout());
    const debug = new URLSearchParams(window.location.search).get('debug') === '1';
    debugModeRef.current = debug;
    setDebugMode(debug);
    setBooted(true);
    const media = window.matchMedia('(max-width: 1023px)');
    const onMedia = () => setStacked(media.matches);
    media.addEventListener('change', onMedia);
    return () => media.removeEventListener('change', onMedia);
  }, []);

  useEffect(() => {
    loadDeclination().then(setTable).catch(() => setDeclinationNote('The true-north fix did not load. Line up if the labels sit off to one side.'));
  }, []);

  const spot: Spot | null = screen === 'explore'
    ? lock.locked
    : screen === 'pick-view'
      ? pin
      : null;
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
    setProgress(spotKey ? { kind: 'loading', fraction: 0 } : null);
  }

  useEffect(() => {
    followRef.current = gyroOn;
    if (gyroOn) viewRef.current.hfov = GYRO_HFOV_DEG;
  }, [gyroOn]);

  useEffect(() => {
    if (!booted || spotLat == null || spotLng == null) return;
    let cancelled = false;
    const worker = new Worker(new URL('../../lib/peak-finder/peak-finder.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<WorkerOut>) => {
      if (cancelled) return;
      const message = event.data;
      if (message.type === 'progress') {
        setProgress({ kind: 'loading', fraction: message.fraction });
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
    if (!gyroOn) return;
    const smoother = createGyroSmoother();
    const useAbsolute = typeof window !== 'undefined' && 'ondeviceorientationabsolute' in window;
    const eventName = useAbsolute ? 'deviceorientationabsolute' : 'deviceorientation';
    let frame = 0;
    let queued = false;
    let previousRaw: number | null = null;
    let lastJump = 0;
    let lastAccuracy: number | null | undefined;
    let calibration: YawCalibration = { offset: 0, ready: false };
    const pushDiag = (
      event: DeviceOrientationEvent,
      extra: DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number },
      pose: { magneticHeading: number; pitch: number; roll: number } | null,
      filtered: { magnetic: number; pitch: number; guardHeld: boolean },
      screenAngle: number,
    ) => {
      if (!debugModeRef.current) return;
      const now = performance.now();
      gyroEventTimesRef.current.push(now);
      if (gyroEventTimesRef.current.length > 150) gyroEventTimesRef.current.shift();
      const sample = {
        t: now,
        step: null as string | null,
        eventType: eventName,
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: Boolean(useAbsolute || event.absolute),
        webkitHeading: extra.webkitCompassHeading ?? null,
        webkitAccuracy: extra.webkitCompassAccuracy ?? null,
        screenAngle,
        windowOrientation: typeof window.orientation === 'number' ? window.orientation : 'n/a',
        rawHeading: pose?.magneticHeading ?? null,
        rawPitch: pose?.pitch ?? null,
        smoothHeading: filtered.magnetic,
        smoothPitch: filtered.pitch,
        yawOffset: calibration.offset,
        yawReady: calibration.ready,
        guardHeld: filtered.guardHeld,
      };
      gyroLiveRef.current = { ...sample, eventHz: eventRateHz(gyroEventTimesRef.current, now) };
      gyroRecorder.push(sample, Date.now());
    };

    const onReading = (event: DeviceOrientationEvent) => {
      const extra = event as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
      const screenAngle = window.screen?.orientation?.angle ?? 0;
      const reading = {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
        absolute: useAbsolute || event.absolute,
        webkitCompassHeading: extra.webkitCompassHeading,
      };
      calibration = updateYawCalibration(calibration, reading, screenAngle);
      const pose = deviceCameraPose(reading, screenAngle, calibration);
      if (pose == null) return;
      const filtered = followRef.current
        ? smoother.smooth(pose.magneticHeading, pose.pitch, pose.roll, performance.now())
        : {
          magnetic: pose.magneticHeading,
          pitch: pose.pitch,
          roll: pose.roll,
          guardHeld: false,
        };
      pushDiag(event, extra, pose, filtered, screenAngle);
      if (!followRef.current) return;
      lastJump = headingJump(previousRaw, pose.magneticHeading);
      previousRaw = pose.magneticHeading;
      lastAccuracy = extra.webkitCompassAccuracy;
      if (queued) return;
      queued = true;
      frame = requestAnimationFrame(() => {
        queued = false;
        if (!followRef.current) return;
        baseRef.current = viewHeading(filtered.magnetic, declination, 0, 0);
        viewRef.current.heading = wrap360(baseRef.current + offsetRef.current);
        viewRef.current.pitch = clampGyroViewPitch(filtered.pitch);
        viewRef.current.roll = filtered.roll;
        const unsure = compassUnsure(lastAccuracy, lastJump);
        if (unsure !== unsureRef.current) {
          unsureRef.current = unsure;
          setUnsure(unsure);
        }
      });
    };
    window.addEventListener(eventName, onReading);
    return () => {
      window.removeEventListener(eventName, onReading);
      cancelAnimationFrame(frame);
      smoother.reset();
      gyroLiveRef.current = null;
      gyroEventTimesRef.current = [];
    };
  }, [gyroOn, declination, gyroRecorder]);

  useEffect(() => {
    if (screen !== 'explore' || !lock.locked) return;
    const timer = window.setInterval(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition((position) => {
        setLock((state) => noteSample(state, 'explore', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }).state);
      }, () => {}, { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 });
    }, MOVE_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [screen, lock.locked]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setLiningUp(false);
  }

  function goStart() {
    stopCamera();
    setScreen('start');
    setLock({ locked: null, pending: null });
    setCameraOn(false);
    setCameraNote(null);
    setGyroOn(false);
    setBanner(null);
    setSelected(null);
    setPayload(null);
    setProgress(null);
    setError(null);
    setLiningUp(false);
    setShowDragHint(true);
  }

  async function readLocation(): Promise<Spot | null> {
    if (!navigator.geolocation) return null;
    try {
      return await new Promise<Spot>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          () => reject(new Error('location')),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 12_000 },
        );
      });
    } catch {
      return null;
    }
  }

  async function tryStartCamera(): Promise<boolean> {
    if (typeof OffscreenCanvas === 'undefined') {
      setError('This browser cannot draw the skyline. Use a current Safari or Chrome.');
      return false;
    }
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = nextStream;
      setStream(nextStream);
      setCameraNote(null);
      return true;
    } catch {
      setCameraNote(CAMERA_DENIED);
      stopCamera();
      return false;
    }
  }

  async function beginExplore() {
    setStartNote(null);
    setBanner(null);
    setError(null);
    setShowDragHint(true);
    if (sensors) {
      if (typeof OffscreenCanvas === 'undefined') {
        setError('This browser cannot draw the skyline. Use a current Safari or Chrome.');
        return;
      }
      viewRef.current.pitch = 0;
      viewRef.current.roll = 0;
      const motion = await requestMotionPermission();
      if (motion === 'denied') {
        setGyroOn(false);
        setBanner('Gyro is blocked. Allow motion access, or drag the skyline.');
      } else if (motionAllowed(motion)) {
        setGyroOn(true);
      } else {
        setGyroOn(false);
      }
      const cameraOk = await tryStartCamera();
      setCameraOn(cameraOk);
      const here = await readLocation();
      if (!here) {
        setStartNote(LOCATION_DENIED);
        if (cameraOk) {
          stopCamera();
          setCameraOn(false);
        }
        return;
      }
      setLock({ locked: here, pending: null });
      setScreen('explore');
    } else {
      const here = await readLocation();
      if (!here) {
        setStartNote(LOCATION_DENIED);
        return;
      }
      setLock({ locked: here, pending: null });
      viewRef.current.heading = 0;
      viewRef.current.pitch = 0;
      viewRef.current.roll = 0;
      setScreen('explore');
    }
  }

  function beginPick() {
    setStartNote(null);
    setBanner(null);
    setError(null);
    setLock({ locked: null, pending: null });
    stopCamera();
    setCameraOn(false);
    setCameraNote(null);
    setGyroOn(false);
    setScreen('pick-map');
    setShowDragHint(true);
  }

  function confirmPick() {
    setScreen('pick-view');
  }

  async function toggleCamera() {
    if (!cameraOn) {
      setCameraOn(true);
      setGyroOn(true);
      await tryStartCamera();
      return;
    }
    setCameraOn(false);
    stopCamera();
  }

  async function toggleGyro() {
    if (cameraOn && stream) return;
    if (gyroOn) {
      setGyroOn(false);
      return;
    }
    const motion = await requestMotionPermission();
    if (motion === 'denied') {
      setBanner('Gyro is blocked. Allow motion access, or drag the skyline.');
      return;
    }
    if (!motionAllowed(motion)) return;
    setGyroOn(true);
    setBanner(null);
  }

  function onLook(headingDelta: number, pitchDelta: number, fovScale: number) {
    const panOnly = !followRef.current && !liningUp;
    const pitch = panOnly ? 0 : pitchDelta;
    if (liningUp && screen === 'explore' && stream) {
      offsetRef.current += headingDelta;
      viewRef.current.heading = wrap360(baseRef.current + offsetRef.current);
    } else if (!followRef.current) {
      viewRef.current.heading = wrap360(viewRef.current.heading + headingDelta);
    }
    viewRef.current.pitch = Math.min(35, Math.max(-20, viewRef.current.pitch + pitch));
    if (fovScale !== 1) {
      viewRef.current.hfov = Math.min(MAX_HFOV_DEG, Math.max(MIN_HFOV_DEG, viewRef.current.hfov / fovScale));
    }
    if (headingDelta !== 0 || pitch !== 0) setShowDragHint(false);
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
  }

  function toggleLineUp() {
    if (liningUp) finishLineUp();
    else setLiningUp(true);
  }

  const showMoved = screen === 'explore' && lock.pending != null;
  const showMap = screen === 'pick-map' || (screen === 'pick-view' && !stacked);
  const showSkyline = screen === 'explore' || screen === 'pick-view';
  const mapFillsWidth = stacked || screen === 'pick-map';
  const showCamera = screen === 'explore' && sensors && cameraOn && stream != null;
  const showDrawn = showSkyline && !showCamera;

  const gestureMode = gestureModeFor({
    showSkyline,
    liningUp,
    gyroOn,
    screen,
  });
  const skylineGestures = gestureMode !== 'off';
  if (!booted) {
    return <p className="p-4 text-sm font-bold text-[#1a1a1a]">Loading Peak Finder</p>;
  }

  if (screen === 'start') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#e7e1d4] px-6 text-center text-[#1a1a1a]">
        <h1 className="text-xl font-bold text-[#2d5016]">Peak Finder</h1>
        <p className="max-w-sm text-sm leading-snug">See which peaks are in view from where you stand, or from a pin on the map.</p>
        <div className="flex w-full max-w-sm flex-col gap-2">
          <button type="button" className="retro-button min-h-11 px-4 text-sm" onClick={() => void beginExplore()}>
            Explore my current location
          </button>
          <button type="button" className="retro-button min-h-11 px-4 text-sm" onClick={beginPick}>
            Pick a spot on the map
          </button>
        </div>
        {startNote ? <p className="max-w-sm text-sm font-bold leading-snug text-red-900">{startNote}</p> : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 bg-[#e7e1d4] text-[#1a1a1a]">
      {showMap ? (
        <div className={mapFillsWidth ? 'relative h-full w-full' : 'relative h-full w-[min(42%,28rem)] shrink-0 border-r-2 border-[#5c3a1e]'}>
          <SpotPicker
            lat={pin.lat}
            lng={pin.lng}
            onBack={goStart}
            onChange={(next) => {
              setPin(next);
              setSelected(null);
            }}
          />
          {screen === 'pick-map' ? (
            <div className="absolute inset-x-3 bottom-3 z-10 flex flex-col gap-2">
              <button type="button" className="retro-button retro-button-yellow min-h-11 w-full px-3 text-sm" onClick={confirmPick}>
                Confirm
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showSkyline ? (
        <div className="relative min-w-0 flex-1">
          {debugMode ? (
            <PeakFinderGyroDebug liveRef={gyroLiveRef} recorder={gyroRecorder} />
          ) : null}
          {!showMap ? (
            <button
              type="button"
              className="retro-button absolute left-2 top-2 z-30 min-h-11 px-3 text-xs"
              onClick={goStart}
            >
              Back
            </button>
          ) : null}
          {showCamera ? (
            <CameraView
              stream={stream}
              payload={payload}
              getView={getView}
              selectedName={selected?.peak.name ?? null}
              onLook={skylineGestures ? look : null}
              gestureMode={gestureMode}
              onPick={(peak, anchor) => setSelected({ peak, anchor })}
            />
          ) : null}
          {showDrawn ? (
            <DrawnView
              payload={payload}
              getView={getView}
              selectedName={selected?.peak.name ?? null}
              onLook={skylineGestures ? look : null}
              gestureMode={gestureMode}
              listenKeys={!sensors}
              onPick={(peak, anchor) => setSelected({ peak, anchor })}
            />
          ) : null}
          {!sensors && showDrawn ? (
            <DesktopPan
              showHint={showDragHint}
              onDismissHint={() => setShowDragHint(false)}
              onPan={(delta) => look(delta, 0, 1)}
            />
          ) : null}
          {liningUp ? (
            <div className="absolute inset-x-0 top-12 z-30">
              <LineUpCaption />
            </div>
          ) : null}
          {selected ? (
            <PeakCard
              peak={selected.peak}
              dock={stacked ? 'bottom' : 'float'}
              anchor={selected.anchor}
              onClose={() => setSelected(null)}
            />
          ) : null}
          <Status
            progress={progress}
            error={error}
            banner={banner}
            cameraNote={screen === 'explore' && sensors ? cameraNote : null}
            coverage={coverage}
            payload={payload}
            unsure={unsure && gyroOn}
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
                if (next.recompute) setAttempt((value) => value + 1);
              }}
            >
              You&apos;ve moved. Update view
            </button>
          ) : null}
          <Controls
            sensors={sensors}
            screen={screen}
            cameraOn={cameraOn}
            gyroOn={gyroOn}
            gyroLocked={screen === 'explore' && cameraOn}
            hasCamera={showCamera}
            onCamera={() => void toggleCamera()}
            onGyro={() => void toggleGyro()}
            liningUp={liningUp}
            onLineUp={showCamera ? toggleLineUp : null}
            onChangeSpot={screen === 'pick-view' && stacked ? () => setScreen('pick-map') : null}
            coverageNote={coverage === 'partial' ? 'Some surrounding peak lists are not in this build, so a few names may be missing.' : null}
            onSummit={payload?.onSummit ?? null}
          />
        </div>
      ) : null}
    </div>
  );
}

function Status({
  progress,
  error,
  banner,
  cameraNote,
  coverage,
  payload,
  unsure,
  declinationNote,
  onRetry,
}: {
  progress: ProgressState;
  error: string | null;
  banner: string | null;
  cameraNote: string | null;
  coverage: Coverage;
  payload: SkylinePayload | null;
  unsure: boolean;
  declinationNote: string | null;
  onRetry: () => void;
}) {
  const loading = progress?.kind === 'loading';
  const text = error
    ?? (loading ? 'Loading…' : null)
    ?? banner
    ?? cameraNote
    ?? (unsure ? 'Gyro unsure. Line up.' : null)
    ?? declinationNote
    ?? (coverage === 'none' ? 'Peak names for this spot are not in this build. The Northeast is loaded: NY, NJ, PA, CT, RI, MA, VT, NH, ME.' : null)
    ?? (payload && payload.peaks.length === 0 ? 'No named peaks are visible from here.' : null);
  const drawPulse = loading && progress.fraction >= 0.85;
  const fillPct = loading ? Math.min(progress.fraction, 0.85) * 100 : 0;
  if (!text) return null;
  return (
    <div className="absolute left-1/2 top-12 z-20 w-[min(28rem,calc(100%-1rem))] -translate-x-1/2 bg-[#1a1a1a]/80 px-3 py-2 text-center text-sm font-bold leading-snug text-white" role="status">
      <p>{text}</p>
      {loading ? (
        <div
          className="relative mx-auto mt-2 h-2.5 w-full max-w-xs overflow-hidden border-2 border-[#ffc94d] bg-[#3d3d3d]"
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 left-0 bg-[#ffc94d] transition-[width] duration-150 ease-out"
            style={{ width: `${fillPct}%` }}
          />
          {drawPulse ? (
            <div className="absolute inset-0 overflow-hidden">
              <div className="h-full w-2/5 bg-[#ffc94d] opacity-90 motion-safe:animate-peak-finder-bar" />
            </div>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <button type="button" className="retro-button mt-2 min-h-11 px-3 text-xs" onClick={onRetry}>Try again</button>
      ) : null}
    </div>
  );
}

function Controls({
  sensors,
  screen,
  cameraOn,
  gyroOn,
  gyroLocked,
  hasCamera,
  onCamera,
  onGyro,
  liningUp,
  onLineUp,
  onChangeSpot,
  coverageNote,
  onSummit,
}: {
  sensors: boolean;
  screen: Screen;
  cameraOn: boolean;
  gyroOn: boolean;
  gyroLocked: boolean;
  hasCamera: boolean;
  onCamera: () => void;
  onGyro: () => void;
  liningUp: boolean;
  onLineUp: (() => void) | null;
  onChangeSpot: (() => void) | null;
  coverageNote: string | null;
  onSummit: { name: string; elevationM: number } | null;
}) {
  const onCameraUi = hasCamera;
  const showCameraToggle = sensors && screen === 'explore';
  const showGyro = sensors && (screen === 'explore' || screen === 'pick-view');
  return (
    <div className="peak-finder-controls pointer-events-none absolute inset-x-0 bottom-0 z-40 px-2 pb-2 text-[#1a1a1a]">
      <div
        className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-1"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-3">
          {showCameraToggle ? (
            <RetroSwitch
              label="Camera"
              checked={cameraOn}
              onChange={(next) => {
                if (next !== cameraOn) onCamera();
              }}
            />
          ) : null}
          {showGyro ? (
            <RetroSwitch
              label="Gyro"
              checked={gyroOn || gyroLocked}
              disabled={gyroLocked}
              onChange={(next) => {
                if (next !== gyroOn) onGyro();
              }}
            />
          ) : null}
          {onLineUp ? (
            <button
              type="button"
              data-pf-control
              className="peak-finder-control retro-button min-h-11 px-3 text-xs text-[#1a1a1a]"
              onClick={onLineUp}
            >
              {liningUp ? 'Done' : 'Line up'}
            </button>
          ) : null}
          {onChangeSpot ? (
            <button
              type="button"
              data-pf-control
              className="peak-finder-control retro-button min-h-11 px-3 text-xs text-[#1a1a1a]"
              onClick={onChangeSpot}
            >
              Change spot
            </button>
          ) : null}
        </div>
        {onSummit ? (
          <p className={`text-sm font-bold leading-snug ${onCameraUi ? 'bg-black/55 px-1 text-white' : ''}`}>
            You&apos;re on: {onSummit.name}, {formatFeet(onSummit.elevationM)}
          </p>
        ) : null}
        {coverageNote ? <p className={`text-[11px] leading-snug ${onCameraUi ? 'bg-black/55 px-1 text-white' : ''}`}>{coverageNote}</p> : null}
        <p className={`text-[11px] leading-snug ${onCameraUi ? 'bg-black/55 px-1 text-white' : ''}`}>{PEAK_CREDITS}</p>
        <p className={`text-[11px] leading-snug ${onCameraUi ? 'bg-black/55 px-1 text-white' : ''}`}>{BARE_EARTH_NOTE}</p>
      </div>
    </div>
  );
}
