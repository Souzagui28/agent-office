import test from 'node:test';
import assert from 'node:assert/strict';
import { PadState, stick, type Pad } from '../src/client/features/gamepad/state.js';
import { normalizeSunshine } from '../src/client/features/gamepad/sunshine.js';

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

const sunshine = (axes = [0, 0, -1, 0], rightY = 0.5, rightTrigger = 0): Pad => ({
  ...pad(0, [], axes),
  id: 'Sunshine (libvirtualhid) X-Box Series Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)',
  buttons: Array.from({ length: 18 }, (_, i) => ({ value: i === 7 ? rightY : i === 6 ? rightTrigger : 0, pressed: false })),
});

test('actual Sunshine idle reading does not rotate the camera or hold a trigger', () => {
  const frame = new PadState().sample([sunshine()], true)!;
  assert.deepEqual(frame.look, [0, 0]);
  assert.deepEqual(frame.move, [0, 0]);
  assert.equal(frame.held.has(6), false);
  assert.equal(frame.held.has(7), false);
});

test('Sunshine right stick and triggers are independent after Chromium remapping', () => {
  const input = sunshine([0.1, -0.2, 1, -0.6], 0.9, 0.75);
  const normalized = normalizeSunshine(input, true);
  assert.deepEqual(normalized.axes, [0.1, -0.2, -0.6, 0.8]);
  assert.deepEqual(normalized.buttons[6], { value: 1, pressed: true });
  assert.deepEqual(normalized.buttons[7], { value: 0.75, pressed: true });
  // Trigger release cannot make the character look left again.
  assert.deepEqual(new PadState().sample([sunshine([0, 0, -1, 0], 0.5, 1)], true)!.look, [0, 0]);
  assert.deepEqual(input.axes, [0.1, -0.2, 1, -0.6]);
});

test('Sunshine workaround leaves physical controllers, other browsers and layouts untouched', () => {
  const input = sunshine();
  assert.equal(normalizeSunshine(input, false), input);
  const physical = { ...input, id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)' };
  assert.equal(normalizeSunshine(physical, true), physical);
  const alternate = { ...input, axes: [0, 0, 0, 0, 0, 0] };
  assert.equal(normalizeSunshine(alternate, true), alternate);
});
