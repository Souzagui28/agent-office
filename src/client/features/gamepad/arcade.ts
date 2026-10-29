import type { PadKey } from './bindings';

/** The keyboard arcade owns its modal; route gameplay there instead of navigating its close button. */
export function arcadeKeys(held: ReadonlySet<number>, move: readonly number[]): Map<number, PadKey> {
  const keys = new Map<number, PadKey>();
  const mapping: Readonly<Record<number, PadKey>> = {
    0: ['Space', ' '], 2: ['ArrowUp', 'ArrowUp'], 3: ['KeyZ', 'z'],
    4: ['KeyC', 'c'], 5: ['KeyP', 'p'],
    12: ['ArrowUp', 'ArrowUp'], 13: ['ArrowDown', 'ArrowDown'],
    14: ['ArrowLeft', 'ArrowLeft'], 15: ['ArrowRight', 'ArrowRight'],
  };
  for (const [button, action] of Object.entries(mapping)) if (held.has(Number(button))) keys.set(100 + Number(button), action);
  if (move[0] < -0.5) keys.set(-1, ['ArrowLeft', 'ArrowLeft']);
  if (move[0] > 0.5) keys.set(-2, ['ArrowRight', 'ArrowRight']);
  if (move[1] > 0.5) keys.set(-3, ['ArrowDown', 'ArrowDown']);
  if (move[1] < -0.5) keys.set(-4, ['ArrowUp', 'ArrowUp']);
  // One physical action per key, even when both stick and D-pad (or X and Up) are held.
  const seen = new Set<string>();
  for (const [id, action] of keys) { if (seen.has(action[0])) keys.delete(id); else seen.add(action[0]); }
  return keys;
}
