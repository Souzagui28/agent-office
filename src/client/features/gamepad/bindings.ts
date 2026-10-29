export type PadKey = readonly [code: string, key: string];

/** One table for both dispatch and the keycaps shown in the office's own contextual hints. */
export const BUTTON_KEYS: Readonly<Record<number, PadKey>> = {
  0: ['Space', ' '], 1: ['Escape', 'Escape'], 2: ['KeyE', 'e'], 3: ['KeyN', 'n'],
  4: ['KeyQ', 'q'], 5: ['KeyP', 'p'], 8: ['KeyH', 'h'],
  12: ['KeyR', 'r'], 13: ['KeyL', 'l'], 14: ['KeyC', 'c'], 15: ['KeyO', 'o'],
};

const LABELS: Readonly<Record<string, string>> = {
  E: 'X', 'E / Click': 'X', Click: 'X', Space: 'A', Esc: 'B', Escape: 'B',
  Q: 'LB', P: 'RB', N: 'Y', H: 'View', C: 'D-pad ←', O: 'D-pad →',
  R: 'D-pad ↑', L: 'D-pad ↓', Mouse: 'RS', Scroll: 'D-pad ↑ ↓',
  'W A S D': 'LS', W: 'LS ↑', S: 'LS ↓', 'W S': 'LS ↑ ↓', 'A D': 'LS ← →',
};

export function buttonLabel(source: string): string | undefined { return LABELS[source]; }

/** Keys that can be chosen in the context menu; axes are controlled continuously instead. */
export function hintKey(source: string): PadKey | undefined {
  if (source === 'Click' || source === 'E / Click') return ['KeyE', 'e'];
  if (source === 'Space') return ['Space', ' '];
  if (source === 'Esc' || source === 'Escape') return ['Escape', 'Escape'];
  if (/^[A-Z]$/.test(source)) return [`Key${source}`, source.toLowerCase()];
  return undefined;
}
