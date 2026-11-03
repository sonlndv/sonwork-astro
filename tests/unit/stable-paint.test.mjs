import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareRaster, settledFrame } from '../helpers/stable-paint.ts';

// Synthetic sequences: unit inputs for the readiness state machine and the strict comparison, NOT real browser evidence.
const frame = (value, size = 4) => ({ width: size, height: 1, channels: 3, data: new Uint8Array(size * 3).fill(value) });
const same = (a, b) => compareRaster(a, b).maximumChannel <= 2;
const sequence = frames => { let i = 0; return async () => frames[Math.min(i++, frames.length - 1)]; };

test('a missing-photo frame followed by a painted frame and a matching painted frame does not select the early frame', async () => {
  const missing = frame(10), painted = frame(120), paintedAgain = frame(121);
  const result = await settledFrame(sequence([missing, painted, paintedAgain]), same, { maxFrames: 8 });
  assert.notEqual(result.frame, missing);
  assert.equal(result.frame, paintedAgain);
  assert.equal(result.captures, 3);
});

test('an already stable page is accepted after two agreeing captures', async () => {
  const result = await settledFrame(sequence([frame(50), frame(51)]), same);
  assert.equal(result.captures, 2);
});

test('a never-stable sequence fails within its fixed bound', async () => {
  let captured = 0;
  const wandering = async () => frame((captured++ % 2) * 100);
  await assert.rejects(() => settledFrame(wandering, same, { maxFrames: 5, label: 'unit' }), /unit: initial paint never stabilised.*5 frames/);
  assert.equal(captured, 5);
});

test('the bound itself is validated', async () => {
  await assert.rejects(() => settledFrame(sequence([frame(1)]), same, { maxFrames: 1 }), /maxFrames/);
});

test('the strict restoration comparison still rejects a materially different restored frame', () => {
  const base = frame(100, 1000);
  const withinNoise = frame(102, 1000);
  assert.deepEqual(compareRaster(base, withinNoise), { maximumChannel: 2, materialPixels: 0 });
  const restored = frame(100, 1000);
  for (let i = 0; i < 300; i++) restored.data[i] = 140; // 100 pixels changed by 40 levels
  const result = compareRaster(base, restored);
  assert.ok(result.maximumChannel > 2, 'restoration beyond 2/255 is visible to the control');
  assert.equal(result.materialPixels, 100);
  assert.throws(() => compareRaster(base, frame(100, 999)), /differ in size/);
});
