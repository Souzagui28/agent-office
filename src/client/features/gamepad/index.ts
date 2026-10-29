import type { Ctx } from '../../core/context';
import { isTyping } from '../../player';
import { modalOpen, toast } from '../../ui/dom';
import { activateMenu, adjustMenu, focusMenu, menuRoot } from './menu';
import { PadState } from './state';
import './style.css';

const ACTIONS: Readonly<Record<number, readonly [string, string]>> = {
  0: ['Space', ' '], 2: ['KeyE', 'e'], 3: ['KeyN', 'n'],
  4: ['KeyQ', 'q'], 5: ['KeyP', 'p'], 8: ['KeyH', 'h'],
};

/** Native browser gamepads: analog movement/look, edge-triggered actions and modal navigation. */
export function installGamepad(ctx: Ctx) {
  const state = new PadState();
  const linuxChromium = /Linux/.test(navigator.platform) && /(?:Chrome|Chromium)\//.test(navigator.userAgent);
  let connected: number | undefined;
  let wasModal = false;
  const released = new Map<number, readonly [string, string]>();
  let direction = 0;
  let repeatAt = 0;
  const key = (type: string, code: string, value: string) =>
    (document.activeElement ?? window).dispatchEvent(new KeyboardEvent(type, { code, key: value, bubbles: true, cancelable: true }));
  const tap = (code: string, value: string) => { key('keydown', code, value); key('keyup', code, value); };
  const release = () => {
    ctx.player.setGamepad(0, 0, []);
    for (const [code, value] of released.values()) key('keyup', code, value);
    released.clear();
    direction = 0;
    repeatAt = 0;
  };
  const reset = () => { release(); state.reset(); };
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  window.addEventListener('gamepaddisconnected', reset);
  const hint = document.createElement('div');
  hint.className = 'gamepad-hint';
  hint.hidden = true;
  hint.textContent = '🎮 LS Walk · RS Look · A/✕ Jump · X/□ Use · Y/△ Next worker · Start Menu';
  document.body.append(hint);

  ctx.ticks.add('pre', ({ dt, now }) => {
    if (document.hidden || !document.hasFocus()) { reset(); hint.hidden = true; return; }
    let pads: readonly (Gamepad | null)[];
    try { pads = navigator.getGamepads?.() ?? []; } catch { reset(); hint.hidden = true; return; }
    const frame = state.sample(pads, linuxChromium);
    if (!frame) { release(); connected = undefined; hint.hidden = true; return; }
    if (connected !== frame.pad.index) {
      release();
      connected = frame.pad.index;
      toast('🎮 Controller ready: left stick to walk, right stick to look. Start opens the menu.');
    }
    const modal = modalOpen();
    hint.hidden = modal || isTyping();
    if (modal !== wasModal) { release(); wasModal = modal; }
    for (const button of frame.up) {
      const action = released.get(button);
      if (action) { key('keyup', ...action); released.delete(button); }
    }
    if (frame.down.includes(9)) {
      release();
      if (modal) tap('Escape', 'Escape'); else ctx.hud.toggleMenu();
      return;
    }
    if (modal) {
      ctx.player.setGamepad(0, 0, []);
      if (frame.down.includes(1)) { tap('Escape', 'Escape'); return; }
      if (frame.down.includes(0)) { activateMenu(); return; }
      const next = frame.held.has(12) || frame.move[1] < -0.5 ? -1 : frame.held.has(13) || frame.move[1] > 0.5 ? 1 : 0;
      if (!next) { direction = 0; repeatAt = 0; }
      else if (next !== direction || now >= repeatAt) {
        focusMenu(next);
        repeatAt = now + (next !== direction ? 400 : 140);
        direction = next;
      }
      if (frame.down.includes(14)) adjustMenu(-1);
      if (frame.down.includes(15)) adjustMenu(1);
      const root = menuRoot();
      const scroll = root?.querySelector<HTMLElement>('.body, .hud-menu') ?? root;
      const amount = ((frame.pad.buttons[7]?.value ?? 0) - (frame.pad.buttons[6]?.value ?? 0)) * 600 * Math.min(dt, 0.05);
      scroll?.scrollBy({ top: amount });
      return;
    }
    if (isTyping() || !ctx.player.enabled) { release(); return; }
    const held = [frame.held.has(0) && 'Space', (frame.held.has(10) || frame.held.has(7)) && 'ShiftLeft'].filter((code): code is string => !!code);
    ctx.player.setGamepad(frame.move[0], frame.move[1], held);
    const seconds = Math.min(dt, 0.05);
    ctx.player.lookGamepad(frame.look[0] * seconds * 2.4, frame.look[1] * seconds * 1.8);
    for (const button of frame.down) {
      const action = ACTIONS[button];
      if (!action) continue;
      released.set(button, action);
      key('keydown', ...action);
      // Opening a window must consume this press, not activate its first control too.
      if (modalOpen() || isTyping()) { release(); break; }
    }
  });
}
