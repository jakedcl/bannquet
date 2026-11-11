import assert from 'node:assert/strict';
import test from 'node:test';
import { createGyroRecorder, eventRateHz } from './gyro-diagnostics';

test('event rate counts samples in the last second', () => {
  const stamps = [0, 100, 200, 900, 1100];
  assert.equal(eventRateHz(stamps, 1000), 4);
});

test('recorder keeps a 30 second window', () => {
  const recorder = createGyroRecorder();
  recorder.startRecording(1000);
  recorder.setStep('Flat');
  const sample = {
    t: 1100,
    step: null,
    eventType: 'deviceorientation',
    alpha: 0,
    beta: 90,
    gamma: 0,
    absolute: false,
    webkitHeading: null,
    webkitAccuracy: null,
    screenAngle: 0,
    windowOrientation: 0,
    rawHeading: 0,
    rawPitch: 0,
    smoothHeading: 0,
    smoothPitch: 0,
    yawOffset: 0,
    yawReady: false,
    guardHeld: false,
  };
  recorder.push(sample, 1100);
  assert.equal(recorder.count(), 1);
  const json = recorder.exportJson();
  assert.ok(json.includes('"Flat"'));
});
