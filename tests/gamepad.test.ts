import test from 'node:test';
import assert from 'node:assert/strict';
import { PadState, stick, type Pad } from '../src/client/features/gamepad/state.js';

const pad = (index = 0, buttons: number[] = [], axes = [0, 0, 0, 0]): Pad => ({
  index, connected: true, mapping: 'standard', axes,
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })),
});

test('stick drift is ignored, partial tilt is preserved, and diagonals stay circular', () => {
  assert.deepEqual(stick(0.1, -0.1), [0, 0]);
  assert.deepEqual(stick(NaN, 1), [0, 0]);
  assert.ok(stick(0.5, 0)[0] > 0 && stick(0.5, 0)[0] < 0.5);
  assert.ok(Math.abs(Math.hypot(...stick(1, 1)) - 1) < 1e-10);
  assert.deepEqual(stick(0, -1), [0, -1]);
});

test('connecting with a held button does not jump, interact or confirm a dialog', () => {
  const state = new PadState();
  assert.deepEqual(state.sample([null, pad(1, [0, 2])])?.down, []);
  assert.deepEqual(state.sample([null, pad(1, [0, 2])])?.down, []);
  assert.deepEqual(state.sample([pad(1)])?.up, [0, 2]);
  assert.deepEqual(state.sample([pad(1, [2])])?.down, [2]);
  assert.deepEqual(state.sample([pad(1, [2])])?.down, []);
});

test('disconnect and blur reset button edges before reconnecting', () => {
  const state = new PadState();
  state.sample([pad()]);
  state.sample([pad(0, [2])]);
  assert.equal(state.sample([]), undefined);
  assert.deepEqual(state.sample([pad(0, [2])])?.down, []);
  state.reset();
  assert.deepEqual(state.sample([pad(0, [0])])?.down, []);
});

test('unsupported mappings are ignored and two held controllers never fight for control', () => {
  const state = new PadState();
  assert.equal(state.sample([{ ...pad(), mapping: '' }]), undefined);
  state.sample([pad(1)]);
  for (let i = 0; i < 4; i++) assert.equal(state.sample([pad(0, [2]), pad(1, [0])])?.pad.index, 1);
  const switched = state.sample([pad(0, [2])]);
  assert.equal(switched?.pad.index, 0);
  assert.deepEqual(switched?.down, []);
});
