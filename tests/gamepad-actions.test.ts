import test from 'node:test';
import assert from 'node:assert/strict';
import { BUTTON_KEYS, buttonLabel, hintKey } from '../src/client/features/gamepad/bindings.js';
import { contextActions } from '../src/client/features/gamepad/hints.js';
import { arcadeKeys } from '../src/client/features/gamepad/arcade.js';
import { DESK_KEYS } from '../src/client/interaction.js';

test('every desk action is reachable directly or through the contextual controller menu', () => {
  for (const [code, source] of Object.entries(DESK_KEYS)) {
    assert.equal(hintKey(source)?.[0], code, `${source} missing from the context menu`);
    if (buttonLabel(source)) assert.ok(Object.values(BUTTON_KEYS).some(([bound]) => bound === code), `${source} shows a button without a binding`);
  }
  assert.equal(buttonLabel('E'), 'X');
  assert.equal(buttonLabel('C'), 'D-pad ←');
  assert.equal(buttonLabel('O'), 'D-pad →');
  assert.equal(buttonLabel('R'), 'D-pad ↑');
  assert.equal(buttonLabel('L'), 'D-pad ↓');
  assert.equal(buttonLabel('X'), undefined, 'sending a worker home must be chosen deliberately in the menu');
});

test('context actions retain their keyboard command after keycaps become controller buttons', () => {
  const cap = (source: string, shown: string, label: string) => {
    const key = { dataset: { padSource: source }, textContent: shown, parentElement: {} };
    key.parentElement = { childNodes: [key, { textContent: label }] };
    return key;
  };
  const root = {
    classList: { contains: () => false },
    querySelectorAll: () => [cap('E', 'X', 'Open terminal'), cap('C', 'D-pad ←', 'Changes'), cap('X', 'X', 'Send home')],
  } as unknown as HTMLElement;
  assert.deepEqual(contextActions(root).map(({ label, key }) => [label, key[0]]), [
    ['Open terminal', 'KeyE'], ['Changes', 'KeyC'], ['Send home', 'KeyX'],
  ]);
});

test('walking away hides all context actions instead of offering a stale target', () => {
  const root = { classList: { contains: () => true } } as unknown as HTMLElement;
  assert.deepEqual(contextActions(root), []);
  assert.deepEqual(contextActions(null), []);
});

test('axis hints stay continuous and click-to-hang uses the existing E placement command', () => {
  for (const source of ['Mouse', 'Scroll', 'W A S D', 'W S', 'A D']) {
    assert.ok(buttonLabel(source));
    assert.equal(hintKey(source), undefined);
  }
  assert.deepEqual(hintKey('Click'), ['KeyE', 'e']);
  assert.deepEqual(hintKey('E / Click'), ['KeyE', 'e']);
  assert.deepEqual(BUTTON_KEYS[1], ['Escape', 'Escape']);
});

test('BLOCKFALL gets held direction keys and button actions instead of menu navigation', () => {
  const keys = arcadeKeys(new Set([0, 2, 4, 5, 14]), [-1, 0]);
  assert.deepEqual([...keys.values()].map(([code]) => code).sort(), ['ArrowLeft', 'ArrowUp', 'KeyC', 'KeyP', 'Space'].sort());
  assert.equal([...keys.values()].filter(([code]) => code === 'ArrowLeft').length, 1);
  assert.equal(arcadeKeys(new Set(), [0, 0]).size, 0, 'releasing input releases all arcade keys');
});
