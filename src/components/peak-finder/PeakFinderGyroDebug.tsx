'use client';

import type { RefObject } from 'react';
import { useEffect, useState } from 'react';
import {
  GYRO_STEP_LABELS,
  type GyroDiagLive,
  type GyroRecorder,
  type GyroStepLabel,
} from '@/lib/peak-finder/gyro-diagnostics';

function fmt(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(digits);
}

export function PeakFinderGyroDebug({
  liveRef,
  recorder,
}: {
  liveRef: RefObject<GyroDiagLive | null>;
  recorder: GyroRecorder;
}) {
  const [live, setLive] = useState<GyroDiagLive | null>(null);
  const [recording, setRecording] = useState(false);
  const [remainMs, setRemainMs] = useState(0);
  const [logText, setLogText] = useState('');
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<GyroStepLabel | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLive(liveRef.current ? { ...liveRef.current } : null);
      const now = Date.now();
      setRecording(recorder.isRecording());
      setRemainMs(recorder.remainingMs(now));
      setActiveStep(recorder.currentStep());
    }, 100);
    return () => window.clearInterval(timer);
  }, [liveRef, recorder]);

  async function copyText(body: string, note: string) {
    setLogText(body);
    try {
      await navigator.clipboard.writeText(body);
      setCopyNote(note);
    } catch {
      setCopyNote('Select the log below and copy manually.');
    }
  }

  return (
    <div className="peak-finder-gyro-debug" aria-live="polite" onPointerDown={(event) => event.stopPropagation()}>
      <p className="peak-finder-gyro-debug-title">Gyro debug (?debug=1)</p>
      {live ? (
        <dl className="peak-finder-gyro-debug-grid">
          <div><dt>Event</dt><dd>{live.eventType} @ {fmt(live.eventHz, 0)} Hz</dd></div>
          <div><dt>α β γ</dt><dd>{fmt(live.alpha, 1)} {fmt(live.beta, 1)} {fmt(live.gamma, 1)}</dd></div>
          <div><dt>absolute</dt><dd>{live.absolute ? 'yes' : 'no'}</dd></div>
          <div><dt>webkit H</dt><dd>{fmt(live.webkitHeading, 1)} ±{fmt(live.webkitAccuracy, 0)}°</dd></div>
          <div><dt>screen°</dt><dd>{fmt(live.screenAngle, 0)} / {String(live.windowOrientation)}</dd></div>
          <div><dt>raw H/P</dt><dd>{fmt(live.rawHeading, 1)}° {fmt(live.rawPitch, 1)}°</dd></div>
          <div><dt>smooth H/P</dt><dd>{fmt(live.smoothHeading, 1)}° {fmt(live.smoothPitch, 1)}°</dd></div>
          <div><dt>yaw off</dt><dd>{fmt(live.yawOffset, 1)}° {live.yawReady ? 'ready' : '—'}</dd></div>
          <div><dt>guard</dt><dd>{live.guardHeld ? 'holding' : 'off'}</dd></div>
        </dl>
      ) : (
        <p className="text-[11px]">Turn Gyro on to stream diagnostics.</p>
      )}
      <div className="peak-finder-gyro-debug-actions">
        <button
          type="button"
          className="peak-finder-control retro-button px-2 py-1 text-[10px] text-[#1a1a1a]"
          data-pf-control
          onClick={() => {
            if (recorder.isRecording()) recorder.stopRecording();
            else recorder.startRecording();
          }}
        >
          {recording ? `Stop (${Math.ceil(remainMs / 1000)}s)` : 'Record 30s'}
        </button>
        <button
          type="button"
          className="peak-finder-control retro-button px-2 py-1 text-[10px] text-[#1a1a1a]"
          data-pf-control
          onClick={() => void copyText(recorder.exportJson(), 'Copied JSON to clipboard.')}
        >
          Copy JSON
        </button>
        <button
          type="button"
          className="peak-finder-control retro-button px-2 py-1 text-[10px] text-[#1a1a1a]"
          data-pf-control
          onClick={() => void copyText(recorder.exportCsv(), 'Copied CSV to clipboard.')}
        >
          Copy CSV
        </button>
      </div>
      <div className="peak-finder-gyro-debug-steps">
        {GYRO_STEP_LABELS.map((label) => (
          <button
            key={label}
            type="button"
            className={`peak-finder-control retro-button px-1.5 py-0.5 text-[9px] text-[#1a1a1a] ${activeStep === label && recording ? 'retro-button-yellow' : ''}`}
            data-pf-control
            onClick={() => recorder.setStep(activeStep === label ? null : label)}
            disabled={!recording}
          >
            {label}
          </button>
        ))}
      </div>
      {copyNote ? <p className="text-[10px] text-[#ffc94d]">{copyNote}</p> : null}
      {logText ? (
        <textarea className="peak-finder-gyro-debug-log" readOnly rows={4} value={logText} />
      ) : null}
      {recording ? <p className="text-[10px]">{recorder.count()} samples · tag: {activeStep ?? '—'}</p> : null}
    </div>
  );
}
