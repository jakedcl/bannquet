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
  iosMotionPermissionRequired,
  orientationEventHasData,
  requestMotionPermission,
  updateYawCalibration,
  viewHeading,
  type YawCalibration,
} from '@/lib/peak-finder/orientation';
import type { SkylinePayload, WorkerOut } from '@/lib/peak-finder/payload';
import { loadPeaksAround } from '@/lib/peak-finder/peaks';
import { applyLineUpPitchOffset, clampLineUpPitchOffset } from '@/lib/peak-finder/line-up-offset';
import {
  applyMotionPermission,
  GYRO_VERIFY_MS,
  shouldAutoEnableMotion,
  type MotionHint,
} from '@/lib/peak-finder/motion-enable';
import { FRESH_YAW_CALIBRATION } from '@/lib/peak-finder/compass-resync';
import { initialFov, readCalibration, writeCalibration } from '@/lib/peak-finder/storage';
import { CameraView } from './CameraView';
import { DesktopPan } from './DesktopPan';
import { DrawnView } from './DrawnView';
import { createGyroRecorder, eventRateHz, type GyroDiagLive } from '@/lib/peak-finder/gyro-diagnostics';
import { gestureModeFor } from '@/lib/peak-finder/explore-gestures';
import { PeakFinderGyroDebug } from './PeakFinderGyroDebug';
import { LineUpCaption } from './LineUp';
import { RetroSwitch } from './RetroSwitch';
import { SpotPicker } from './SpotPicker';
import { PeakFinderOffline } from './PeakFinderOffline';
import { PeakFinderBackButton } from './PeakFinderBackButton';
import { registerPeakFinderServiceWorker } from '@/lib/peak-finder/register-sw';
import { findAreaCovering, listOfflineAreas } from '@/lib/peak-finder/offline-areas-idb';
import type { OfflineAreaRecord } from '@/lib/peak-finder/offline';
import {
  effectivelyOffline,
  OFFLINE_GEO_TIMEOUT_MS,
  offlineExploreCheck,
  ONLINE_GEO_TIMEOUT_MS,
  startScreenUi,
} from '@/lib/peak-finder/start-screen-offline';
import type { ViewPose } from './SkylineStage';

const DEFAULT_PIN: Spot = { lat: MAP_CENTER.lat, lng: MAP_CENTER.lng };
const LOCATION_DENIED = 'Location is blocked. Allow it in your browser settings and try again.';
const CAMERA_DENIED = 'Camera is blocked. Allow it in your browser settings, then turn the camera on to try again.';
const OFFLINE_SAVED_TOAST_MS = 5000;
const OFFLINE_SAVED_TOAST_TEXT =
  "Saved! When you're in this area with no signal, open Peak Finder and tap Explore my current location — it'll use your offline map automatically.";

type Screen = 'start' | 'explore' | 'pick-map' | 'pick-view' | 'offline';
type Coverage = 'full' | 'partial' | 'none';
type ProgressState = { kind: 'loading'; fraction: number } | null;

export function PeakFinder() {
  const [booted, setBooted] = useState(false);
  const [stacked, setStacked] = useState(false);
  const [sensors, setSensors] = useState(false);
  const [iosMotion, setIosMotion] = useState(false);
  const [screen, setScreen] = useState<Screen>('start');
  const [startNote, setStartNote] = useState<string | null>(null);
  const [pin, setPin] = useState<Spot>(DEFAULT_PIN);
  const [lock, setLock] = useState<LockState>({ locked: null, pending: null });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const [gyroOn, setGyroOn] = useState(false);
  const [motionArmed, setMotionArmed] = useState(false);
  const [motionHint, setMotionHint] = useState<MotionHint>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [payload, setPayload] = useState<SkylinePayload | null>(null);
  const [progress, setProgress] = useState<ProgressState>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Coverage>('full');
  const [attempt, setAttempt] = useState(0);
  const [liningUp, setLiningUp] = useState(false);
  const [unsure, setUnsure] = useState(false);
  const [declinationNote, setDeclinationNote] = useState<string | null>(null);
  const [table, setTable] = useState<DeclinationTable | null>(null);
  const [showDragHint, setShowDragHint] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [offlineAreas, setOfflineAreas] = useState<OfflineAreaRecord[]>([]);
  const [offlineSavedToast, setOfflineSavedToast] = useState(false);
  const [networkReachable, setNetworkReachable] = useState(true);
  const [startFindingLocation, setStartFindingLocation] = useState(false);
  const [startOutsideSaved, setStartOutsideSaved] = useState(false);

  const viewRef = useRef<ViewPose>({ heading: 0, pitch: 0, roll: 0, hfov: DEFAULT_HFOV_DEG });
  const offsetRef = useRef(0);
  const pitchOffsetRef = useRef(0);
  const baseRef = useRef(0);
  const followRef = useRef(false);
  const motionSessionGrantedRef = useRef(false);
  const gyroVerifiedRef = useRef(false);
  const gyroVerifyTimerRef = useRef(0);
  const gyroVerifyResolveRef = useRef<((ok: boolean) => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const unsureRef = useRef(false);
  const debugModeRef = useRef(false);
  const gyroLiveRef = useRef<GyroDiagLive | null>(null);
  const gyroEventTimesRef = useRef<number[]>([]);
  const gyroSmootherRef = useRef<ReturnType<typeof createGyroSmoother> | null>(null);
  const gyroYawCalRef = useRef<YawCalibration>(FRESH_YAW_CALIBRATION);
  const gyroPreviousRawRef = useRef<number | null>(null);
  const gyroLastJumpRef = useRef(0);
  const gyroLastAccuracyRef = useRef<number | null | undefined>(undefined);
  const gyroLastPitchRef = useRef(0);
  const liningUpRef = useRef(false);
  const gyroRecorder = useMemo(() => createGyroRecorder(), []);

  const getView = useCallback(() => viewRef.current, []);

  const resyncCompassToDevice = useCallback(() => {
    offsetRef.current = 0;
    pitchOffsetRef.current = 0;
    gyroSmootherRef.current?.reset();
    gyroYawCalRef.current = FRESH_YAW_CALIBRATION;
    gyroPreviousRawRef.current = null;
    gyroLastJumpRef.current = 0;
    gyroLastAccuracyRef.current = undefined;
    unsureRef.current = false;
    setUnsure(false);
    if (followRef.current || liningUpRef.current) {
      viewRef.current.heading = wrap360(baseRef.current);
      viewRef.current.pitch = applyLineUpPitchOffset(
        clampGyroViewPitch(gyroLastPitchRef.current),
        0,
      );
    }
  }, []);

  useEffect(() => {
    liningUpRef.current = liningUp;
  }, [liningUp]);

  useEffect(() => {
    const calibration = readCalibration();
    offsetRef.current = 0;
    pitchOffsetRef.current = 0;
    viewRef.current = {
      heading: 0,
      pitch: 0,
      roll: 0,
      hfov: initialFov(calibration, null),
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client layout and sensors after hydration
    setSensors(readSensorCapable());
    setIosMotion(iosMotionPermissionRequired());
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
    registerPeakFinderServiceWorker();
    const online = () => setNetworkOnline(true);
    const offline = () => setNetworkOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror navigator.onLine after mount
    setNetworkOnline(navigator.onLine);
  }, []);

  const offlineMode = effectivelyOffline(networkOnline, networkReachable);

  useEffect(() => {
    if (screen !== 'start' && screen !== 'offline') return;
    void listOfflineAreas().then(setOfflineAreas);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'start') return;
    let cancelled = false;
    const probe = async () => {
      if (!navigator.onLine) {
        if (!cancelled) setNetworkReachable(false);
        return;
      }
      try {
        const res = await fetch('/peak-finder/declination.v1.json', {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(4_000),
        });
        if (!cancelled) setNetworkReachable(res.ok);
      } catch {
        if (!cancelled) setNetworkReachable(false);
      }
    };
    void probe();
    return () => {
      cancelled = true;
    };
  }, [screen, networkOnline]);

  useEffect(() => {
    if (!offlineSavedToast) return;
    const timer = window.setTimeout(() => setOfflineSavedToast(false), OFFLINE_SAVED_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [offlineSavedToast]);

  function dismissOfflineSavedToast() {
    setOfflineSavedToast(false);
  }

  function completeOfflineSave() {
    goStart();
    setOfflineSavedToast(true);
  }

  useEffect(() => {
    loadDeclination().then(setTable).catch(() => setDeclinationNote('The true-north fix did not load. Line up if the labels sit off to one side.'));
  }, []);

  useEffect(() => {
    if (screen !== 'explore' || !lock.locked || networkOnline) return;
    void listOfflineAreas().then((areas) => {
      const hit = findAreaCovering(areas, lock.locked!.lat, lock.locked!.lng);
      if (!hit) {
        setBanner('No saved offline area covers this spot. Names and terrain may be missing.');
      } else {
        setBanner(null);
      }
    });
  }, [screen, lock.locked, networkOnline]);

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

  function stopGyroListening() {
    window.clearTimeout(gyroVerifyTimerRef.current);
    gyroVerifyTimerRef.current = 0;
    if (gyroVerifyResolveRef.current) {
      gyroVerifyResolveRef.current(false);
      gyroVerifyResolveRef.current = null;
    }
    gyroVerifiedRef.current = false;
    setMotionArmed(false);
  }

  function confirmGyroLive() {
    window.clearTimeout(gyroVerifyTimerRef.current);
    gyroVerifyTimerRef.current = 0;
    gyroVerifiedRef.current = true;
    setGyroOn(true);
    motionSessionGrantedRef.current = true;
    setMotionHint(null);
    setBanner(null);
    resyncCompassToDevice();
    gyroVerifyResolveRef.current?.(true);
    gyroVerifyResolveRef.current = null;
  }

  function failGyroVerify() {
    window.clearTimeout(gyroVerifyTimerRef.current);
    gyroVerifyTimerRef.current = 0;
    gyroVerifiedRef.current = false;
    setMotionArmed(false);
    setGyroOn(false);
    setMotionHint('tap');
    gyroVerifyResolveRef.current?.(false);
    gyroVerifyResolveRef.current = null;
  }

  function waitForGyroVerify(): Promise<boolean> {
    return new Promise((resolve) => {
      gyroVerifyResolveRef.current = resolve;
      gyroVerifyTimerRef.current = window.setTimeout(() => {
        if (!gyroVerifiedRef.current) failGyroVerify();
      }, GYRO_VERIFY_MS);
    });
  }

  async function requestListenAndVerify(fromGesture: boolean): Promise<boolean> {
    if (!sensors) return false;
    stopGyroListening();
    setGyroOn(false);
    if (!fromGesture && !shouldAutoEnableMotion(iosMotion, motionSessionGrantedRef.current)) {
      setMotionHint('tap');
      return false;
    }
    const motion = await requestMotionPermission();
    const next = applyMotionPermission(iosMotion, motion, motionSessionGrantedRef.current);
    motionSessionGrantedRef.current = next.sessionGranted;
    if (!next.mayListen) {
      setMotionHint(next.hint);
      if (motion === 'denied') {
        setBanner('Gyro is blocked. Allow motion access, or drag the skyline.');
      }
      return false;
    }
    setMotionArmed(true);
    setMotionHint(null);
    return waitForGyroVerify();
  }

  const enableGyroFromGesture = () => requestListenAndVerify(true);
  const tryAutoEnableGyro = () => requestListenAndVerify(false);

  useEffect(() => {
    if (!motionArmed) return;
    const smoother = createGyroSmoother();
    gyroSmootherRef.current = smoother;
    gyroYawCalRef.current = FRESH_YAW_CALIBRATION;
    gyroPreviousRawRef.current = null;
    gyroLastJumpRef.current = 0;
    gyroLastAccuracyRef.current = undefined;
    const useAbsolute = typeof window !== 'undefined' && 'ondeviceorientationabsolute' in window;
    const eventName = useAbsolute ? 'deviceorientationabsolute' : 'deviceorientation';
    let frame = 0;
    let queued = false;
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
        yawOffset: gyroYawCalRef.current.offset,
        yawReady: gyroYawCalRef.current.ready,
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
      gyroYawCalRef.current = updateYawCalibration(gyroYawCalRef.current, reading, screenAngle);
      if (motionArmed && !gyroVerifiedRef.current && orientationEventHasData(event)) {
        const poseProbe = deviceCameraPose(reading, screenAngle, gyroYawCalRef.current);
        if (poseProbe != null) confirmGyroLive();
      }
      const pose = deviceCameraPose(reading, screenAngle, gyroYawCalRef.current);
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
      gyroLastJumpRef.current = headingJump(gyroPreviousRawRef.current, pose.magneticHeading);
      gyroPreviousRawRef.current = pose.magneticHeading;
      gyroLastAccuracyRef.current = extra.webkitCompassAccuracy;
      gyroLastPitchRef.current = filtered.pitch;
      if (queued) return;
      queued = true;
      frame = requestAnimationFrame(() => {
        queued = false;
        if (!followRef.current) return;
        baseRef.current = viewHeading(filtered.magnetic, declination, 0, 0);
        viewRef.current.heading = wrap360(baseRef.current + offsetRef.current);
        viewRef.current.pitch = applyLineUpPitchOffset(
          clampGyroViewPitch(filtered.pitch),
          pitchOffsetRef.current,
        );
        viewRef.current.roll = filtered.roll;
        const unsure = compassUnsure(gyroLastAccuracyRef.current, gyroLastJumpRef.current);
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
      gyroSmootherRef.current = null;
      gyroLiveRef.current = null;
      gyroEventTimesRef.current = [];
    };
    // confirmGyroLive is intentionally excluded — listener should stay stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionArmed, declination, gyroRecorder]);

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

  function openSavedSkyline(spot: Spot) {
    stopCamera();
    setStartNote(null);
    setBanner(null);
    setError(null);
    setPin(spot);
    setLock({ locked: null, pending: null });
    setCameraOn(false);
    setCameraNote(null);
    stopGyroListening();
    setGyroOn(false);
    setPayload(null);
    setProgress(null);
    setLiningUp(false);
    setShowDragHint(true);
    setScreen('pick-view');
    setAttempt((value) => value + 1);
  }

  function goStart() {
    stopCamera();
    setScreen('start');
    setLock({ locked: null, pending: null });
    setCameraOn(false);
    setCameraNote(null);
    stopGyroListening();
    setGyroOn(false);
    setMotionHint(null);
    setBanner(null);
    setPayload(null);
    setProgress(null);
    setError(null);
    setLiningUp(false);
    setShowDragHint(true);
    setStartFindingLocation(false);
    setStartOutsideSaved(false);
  }

  async function readLocation(timeoutMs: number, maximumAge = 0): Promise<Spot | null> {
    if (!navigator.geolocation) return null;
    try {
      return await new Promise<Spot>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          () => reject(new Error('location')),
          { enableHighAccuracy: true, maximumAge, timeout: timeoutMs },
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

  async function proceedExploreFrom(here: Spot) {
    if (sensors) {
      if (typeof OffscreenCanvas === 'undefined') {
        setError('This browser cannot draw the skyline. Use a current Safari or Chrome.');
        return;
      }
      viewRef.current.pitch = 0;
      viewRef.current.roll = 0;
      const gyroOk = await tryAutoEnableGyro();
      const cameraOk = gyroOk ? await tryStartCamera() : false;
      setCameraOn(cameraOk);
      setLock({ locked: here, pending: null });
      setScreen('explore');
    } else {
      setLock({ locked: here, pending: null });
      viewRef.current.heading = 0;
      viewRef.current.pitch = 0;
      viewRef.current.roll = 0;
      setScreen('explore');
    }
  }

  async function beginExplore() {
    setStartNote(null);
    setStartOutsideSaved(false);
    setBanner(null);
    setError(null);
    setShowDragHint(true);
    setStartFindingLocation(true);
    const timeoutMs = offlineMode ? OFFLINE_GEO_TIMEOUT_MS : ONLINE_GEO_TIMEOUT_MS;
    const maxAge = offlineMode ? 120_000 : 0;
    const here = await readLocation(timeoutMs, maxAge);
    setStartFindingLocation(false);
    if (!here) {
      setStartNote(
        offlineMode
          ? 'Could not get a location fix in time. Try again in the open, or open a saved area below.'
          : LOCATION_DENIED,
      );
      return;
    }
    if (offlineExploreCheck(offlineAreas, here.lat, here.lng, offlineMode) === 'outside') {
      setStartOutsideSaved(true);
      return;
    }
    await proceedExploreFrom(here);
  }

  function beginOffline() {
    setStartNote(null);
    setBanner(null);
    setScreen('offline');
  }

  function beginPick() {
    setStartNote(null);
    setBanner(null);
    setError(null);
    if (!navigator.onLine) {
      setStartNote('Needs a network connection for the map. While offline, use Explore my current location inside a saved area.');
      return;
    }
    setLock({ locked: null, pending: null });
    stopCamera();
    setCameraOn(false);
    setCameraNote(null);
    stopGyroListening();
    setGyroOn(false);
    setScreen('pick-map');
    setShowDragHint(true);
  }

  function confirmPick() {
    setScreen('pick-view');
  }

  async function toggleCamera() {
    if (!cameraOn) {
      const gyroOk = await enableGyroFromGesture();
      if (!gyroOk) {
        setCameraOn(false);
        return;
      }
      const cameraOk = await tryStartCamera();
      setCameraOn(cameraOk);
      return;
    }
    setCameraOn(false);
    stopCamera();
  }

  async function toggleGyro() {
    if (gyroOn || motionArmed) {
      stopGyroListening();
      setGyroOn(false);
      if (!motionSessionGrantedRef.current && iosMotion) setMotionHint('tap');
      return;
    }
    await enableGyroFromGesture();
  }

  function onLook(headingDelta: number, pitchDelta: number, fovScale: number) {
    const panOnly = !followRef.current && !liningUp;
    if (liningUp && screen === 'explore' && stream) {
      offsetRef.current += headingDelta;
      viewRef.current.heading = wrap360(baseRef.current + offsetRef.current);
      pitchOffsetRef.current = clampLineUpPitchOffset(pitchOffsetRef.current + pitchDelta);
      if (!followRef.current) {
        viewRef.current.pitch = applyLineUpPitchOffset(0, pitchOffsetRef.current);
      }
    } else {
      const pitch = panOnly ? 0 : pitchDelta;
      if (!followRef.current) {
        viewRef.current.heading = wrap360(viewRef.current.heading + headingDelta);
      }
      viewRef.current.pitch = Math.min(35, Math.max(-20, viewRef.current.pitch + pitch));
    }
    if (fovScale !== 1) {
      viewRef.current.hfov = Math.min(MAX_HFOV_DEG, Math.max(MIN_HFOV_DEG, viewRef.current.hfov / fovScale));
    }
    if (headingDelta !== 0 || pitchDelta !== 0) setShowDragHint(false);
  }

  const lookRef = useRef(onLook);
  useEffect(() => {
    lookRef.current = onLook;
  });
  const look = useCallback((headingDelta: number, pitchDelta: number, fovScale: number) => {
    lookRef.current(headingDelta, pitchDelta, fovScale);
  }, []);

  useEffect(() => {
    if (screen !== 'explore' || !sensors) return;
    const frame = requestAnimationFrame(() => {
      void tryAutoEnableGyro();
    });
    return () => cancelAnimationFrame(frame);
    // Intentionally only when entering explore; helpers read refs and iosMotion state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, sensors, iosMotion]);

  const screenRef = useRef<Screen>('start');

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    const activeScreen = () => {
      const s = screenRef.current;
      return s === 'explore' || s === 'pick-view';
    };
    const onVisibility = () => {
      if (!activeScreen() || document.visibilityState !== 'visible') return;
      resyncCompassToDevice();
    };
    const onPageShow = () => {
      if (!activeScreen()) return;
      resyncCompassToDevice();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [resyncCompassToDevice]);

  function resetLineUp() {
    resyncCompassToDevice();
  }

  function finishLineUp() {
    setLiningUp(false);
    writeCalibration({ headingOffset: 0, pitchOffset: 0, hfov: viewRef.current.hfov });
  }

  function toggleLineUp() {
    if (liningUp) finishLineUp();
    else setLiningUp(true);
  }

  if (!booted) {
    return <p className="p-4 text-sm font-bold text-[#1a1a1a]">Loading Peak Finder</p>;
  }

  if (screen === 'offline') {
    return (
      <div className="h-full min-h-0 w-full">
        <PeakFinderOffline
          onBack={goStart}
          onSaved={() => void listOfflineAreas().then(setOfflineAreas)}
          onOpenSkyline={openSavedSkyline}
          onSaveComplete={completeOfflineSave}
          canSaveNewArea={!offlineMode}
        />
      </div>
    );
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

  if (screen === 'start') {
    const startUi = startScreenUi(offlineMode, offlineAreas.length);
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-4 overflow-y-auto bg-[#e7e1d4] px-6 py-4 text-center text-[#1a1a1a]">
        <h1 className="text-xl font-bold text-[#2d5016]">Peak Finder</h1>
        {startUi.showOfflineBadge ? (
          <span className="rounded border-2 border-[#5c3a1e] bg-[#ffc94d] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Offline
          </span>
        ) : null}
        <p className="max-w-sm text-sm leading-snug">See which peaks are in view from where you stand, or from a pin on the map.</p>
        <div className="flex w-full max-w-sm flex-col gap-2">
          <button
            type="button"
            className="retro-button min-h-11 px-4 text-sm"
            disabled={startFindingLocation}
            onClick={() => void beginExplore()}
          >
            Explore my current location
          </button>
          {startFindingLocation ? (
            <p className="text-xs font-bold text-[#2d5016]" role="status">
              Finding your location…
            </p>
          ) : null}
          {startUi.showPickMap ? (
            <button type="button" className="retro-button min-h-11 px-4 text-sm" onClick={beginPick}>
              Pick a spot on the map
            </button>
          ) : null}
          {startUi.showSaveOffline ? (
            <button type="button" className="retro-button retro-button-yellow min-h-11 px-4 text-sm font-bold" onClick={beginOffline}>
              Offline mode / Save area for offline
            </button>
          ) : null}
        </div>
        {startOutsideSaved ? (
          <div className="flex w-full max-w-sm flex-col gap-2 text-left">
            <p className="text-sm font-bold leading-snug text-red-900">
              You&apos;re outside your saved offline areas.
            </p>
            <p className="text-xs leading-snug text-[#3d3d3d]">Open a saved area below, or move into one you downloaded and try Explore again.</p>
          </div>
        ) : null}
        {startUi.showSavedAreasList || startOutsideSaved ? (
          <ul className="flex w-full max-w-sm flex-col gap-2">
            {offlineAreas.map((area) => (
              <li key={area.id} className="retro-box flex flex-col gap-2 p-3 text-left text-sm">
                <span className="font-bold">{area.name}</span>
                <span className="text-xs text-[#3d3d3d]">
                  {Math.round(area.radiusM / 1000)} km · {new Date(area.savedAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  className="retro-button retro-button-yellow min-h-9 self-start px-3 text-xs"
                  onClick={() => openSavedSkyline({ lat: area.lat, lng: area.lng })}
                >
                  Open skyline
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {startNote ? <p className="max-w-sm text-sm font-bold leading-snug text-red-900">{startNote}</p> : null}
        {offlineSavedToast ? (
          <button
            type="button"
            className="retro-box absolute inset-x-4 top-4 z-50 border-[#2d5016] bg-[#ffc94d] px-4 py-3 text-left text-sm leading-snug text-[#1a1a1a] shadow-lg"
            onClick={dismissOfflineSavedToast}
          >
            <p className="font-bold">{OFFLINE_SAVED_TOAST_TEXT}</p>
            <p className="mt-1 text-xs font-normal text-[#3d3d3d]">Tap to dismiss</p>
          </button>
        ) : null}
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
            onChange={(next) => setPin(next)}
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
          {!showMap ? <PeakFinderBackButton onClick={goStart} /> : null}
          {showCamera ? (
            <CameraView
              stream={stream}
              payload={payload}
              getView={getView}
              onLook={skylineGestures ? look : null}
              gestureMode={gestureMode}
            />
          ) : null}
          {showDrawn ? (
            <DrawnView
              payload={payload}
              getView={getView}
              onLook={skylineGestures ? look : null}
              gestureMode={gestureMode}
              listenKeys={!sensors}
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
            motionHint={screen === 'explore' ? motionHint : null}
            onCamera={() => void toggleCamera()}
            onGyro={() => void toggleGyro()}
            onEnableMotion={() => void enableGyroFromGesture()}
            liningUp={liningUp}
            onLineUp={showCamera ? toggleLineUp : null}
            onLineUpReset={showCamera && liningUp ? resetLineUp : null}
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
  motionHint,
  onCamera,
  onGyro,
  onEnableMotion,
  liningUp,
  onLineUp,
  onLineUpReset,
  onChangeSpot,
  coverageNote,
  onSummit,
}: {
  sensors: boolean;
  screen: Screen;
  cameraOn: boolean;
  gyroOn: boolean;
  motionHint: MotionHint;
  onCamera: () => void;
  onGyro: () => void;
  onEnableMotion: () => void;
  liningUp: boolean;
  onLineUp: (() => void) | null;
  onLineUpReset: (() => void) | null;
  onChangeSpot: (() => void) | null;
  coverageNote: string | null;
  onSummit: { name: string; elevationM: number } | null;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const showCameraToggle = sensors && screen === 'explore';
  const showGyro = sensors && (screen === 'explore' || screen === 'pick-view');
  return (
    <div className="peak-finder-controls pointer-events-none absolute inset-x-0 bottom-0 z-40 px-2 pb-1.5 text-[#1a1a1a]">
      <div
        className="pointer-events-auto relative mx-auto w-full max-w-3xl"
        style={{ touchAction: 'manipulation' }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {motionHint === 'tap' && !gyroOn ? (
          <button
            type="button"
            data-pf-control
            className="peak-finder-control absolute inset-x-0 bottom-full mb-0.5 truncate rounded border border-[#5c3a1e]/35 bg-[#ffc94d]/95 px-2 py-0.5 text-center text-[10px] font-bold text-[#1a1a1a]"
            onClick={onEnableMotion}
          >
            Tap to turn on motion
          </button>
        ) : null}
        {onSummit ? (
          <p
            className={`pointer-events-none absolute inset-x-0 truncate px-0.5 text-[10px] font-bold leading-tight text-[#1a1a1a] drop-shadow-[0_0_2px_rgba(231,225,212,0.9)] ${
              motionHint === 'tap' && !gyroOn ? 'bottom-[calc(100%+1.5rem)]' : 'bottom-full mb-0.5'
            }`}
          >
            You&apos;re on: {onSummit.name}, {formatFeet(onSummit.elevationM)}
          </p>
        ) : null}
        {infoOpen ? (
          <div
            className="absolute inset-x-0 bottom-full z-50 mb-1 max-h-32 overflow-y-auto rounded border border-[#5c3a1e]/40 bg-[#e7e1d4]/97 px-2 py-1.5 text-[10px] leading-snug text-[#1a1a1a] shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
            role="dialog"
            aria-label="Peak finder notes"
          >
            {coverageNote ? <p className="mb-1">{coverageNote}</p> : null}
            <p className={coverageNote ? 'mb-1' : ''}>{PEAK_CREDITS}</p>
            <p>{BARE_EARTH_NOTE}</p>
          </div>
        ) : null}
        <div className="flex items-stretch gap-1.5 rounded border border-[#5c3a1e]/45 bg-[#e7e1d4]/90 px-1.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.22)] backdrop-blur-[2px]">
          <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto">
            {showCameraToggle ? (
              <RetroSwitch
                compact
                label="Cam"
                checked={cameraOn}
                onChange={(next) => {
                  if (next !== cameraOn) onCamera();
                }}
              />
            ) : null}
            {showGyro ? (
              <RetroSwitch
                compact
                label="Gyro"
                checked={gyroOn}
                onChange={(next) => {
                  if (next !== gyroOn) onGyro();
                }}
              />
            ) : null}
            {onLineUpReset ? (
              <button
                type="button"
                data-pf-control
                className="peak-finder-control retro-button min-h-8 shrink-0 px-2 py-0 text-[10px] font-bold text-[#1a1a1a]"
                onClick={onLineUpReset}
              >
                Reset
              </button>
            ) : null}
            {onLineUp ? (
              <button
                type="button"
                data-pf-control
                className="peak-finder-control retro-button min-h-8 shrink-0 px-2 py-0 text-[10px] font-bold text-[#1a1a1a]"
                onClick={onLineUp}
              >
                {liningUp ? 'Done' : 'Line up'}
              </button>
            ) : null}
            {onChangeSpot ? (
              <button
                type="button"
                data-pf-control
                className="peak-finder-control retro-button min-h-8 shrink-0 px-2 py-0 text-[10px] font-bold text-[#1a1a1a]"
                onClick={onChangeSpot}
              >
                Change spot
              </button>
            ) : null}
          </div>
          <button
            type="button"
            data-pf-control
            className="peak-finder-control retro-button flex min-h-8 w-8 shrink-0 items-center justify-center px-0 text-[#1a1a1a]"
            aria-expanded={infoOpen}
            aria-label={infoOpen ? 'Hide map credits and info' : 'Map credits and info'}
            onClick={() => setInfoOpen((open) => !open)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="block">
              <circle cx="3" cy="8" r="1.35" fill="currentColor" />
              <circle cx="8" cy="8" r="1.35" fill="currentColor" />
              <circle cx="13" cy="8" r="1.35" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
