import type { Ctx } from '../../core/context';
import { isTyping } from '../../player';
import { modalOpen, toast } from '../../ui/dom';
import { activateMenu, adjustMenu, focusMenu, menuRoot } from './menu';
import { PadState } from './state';
import { BUTTON_KEYS, type PadKey } from './bindings';
import { contextActions, renderPadHints } from './hints';
import { openPadActions } from './actions';
import { openPadKeyboard } from './text';
import { arcadeKeys } from './arcade';
import './style.css';

/** Native browser gamepads: analog movement/look, edge-triggered actions and modal navigation. */
export function installGamepad(ctx: Ctx) {
  const state = new PadState();
  const linuxChromium = /Linux/.test(navigator.platform) && /(?:Chrome|Chromium)\//.test(navigator.userAgent);
  let connected: number | undefined;
  let usingPad = false;
  let pendingAction: PadKey | undefined;
  const mode = (pad: boolean) => { usingPad = pad; };
  window.addEventListener('keydown', (e) => { if (e.isTrusted) mode(false); });
  window.addEventListener('pointerdown', (e) => { if (e.isTrusted) mode(false); });
  window.addEventListener('pointermove', (e) => { if (e.isTrusted && (e.movementX || e.movementY)) mode(false); });
  ctx.ticks.add('hud', () => {
    // A window clears the pointer target. Let the aim phase restore it before running its action.
    if (pendingAction && !modalOpen()) { const action = pendingAction; pendingAction = undefined; tap(...action); }
    renderPadHints(usingPad);
  });
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
  ctx.ticks.add('pre', ({ dt, now }) => {
    if (document.hidden || !document.hasFocus()) { reset(); return; }
    let pads: readonly (Gamepad | null)[];
    try { pads = navigator.getGamepads?.() ?? []; } catch { reset(); return; }
    const frame = state.sample(pads, linuxChromium);
    if (!frame) { release(); connected = undefined; mode(false); return; }
    if (connected !== frame.pad.index) {
      release();
      connected = frame.pad.index;
      mode(true);
      toast('🎮 Controller ready. R3: contextual actions · Start: menu');
    }
    const modal = modalOpen();
    if (frame.down.length || frame.up.length || [...frame.move, ...frame.look].some((value) => value !== 0)) mode(true);
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
      if (menuRoot()?.querySelector('.cabinet canvas[aria-label="BLOCKFALL"]')) {
        const held = arcadeKeys(frame.held, frame.move);
        for (const [id, action] of released) if (!held.has(id)) { key('keyup', ...action); released.delete(id); }
        for (const [id, action] of held) if (!released.has(id)) { released.set(id, action); key('keydown', ...action); }
        return;
      }
      if (frame.down.includes(0)) { activateMenu(openPadKeyboard); return; }
      const next = frame.held.has(12) || frame.move[1] < -0.5 ? -1 : frame.held.has(13) || frame.move[1] > 0.5 ? 1 : 0;
      if (!next) { direction = 0; repeatAt = 0; }
      else if (next !== direction || now >= repeatAt) {
        focusMenu(next);
        repeatAt = now + (next !== direction ? 400 : 140);
        direction = next;
      }
      if (frame.down.includes(14) && !adjustMenu(-1)) focusMenu(-1, true);
      if (frame.down.includes(15) && !adjustMenu(1)) focusMenu(1, true);
      const root = menuRoot();
      const scroll = root?.querySelector<HTMLElement>('.body, .hud-menu') ?? root;
      const amount = ((frame.pad.buttons[7]?.value ?? 0) - (frame.pad.buttons[6]?.value ?? 0)) * 600 * Math.min(dt, 0.05);
      scroll?.scrollBy({ top: amount });
      return;
    }
    if (frame.down.includes(1)) { release(); tap('Escape', 'Escape'); return; }
    if (frame.down.includes(11)) {
      release(); openPadActions((action) => { pendingAction = action; }); return;
    }
    // The telescope owns its camera and disables walking; it still needs RS and B/X.
    if (document.body.classList.contains('telescope-active')) {
      release();
      window.dispatchEvent(new PointerEvent('pointermove', { movementX: frame.look[0] * dt * 600, movementY: frame.look[1] * dt * 600 }));
      if (frame.down.includes(2)) tap('KeyE', 'e');
      return;
    }
    if (isTyping() || !ctx.player.enabled) { release(); return; }
    const held = [frame.held.has(0) && 'Space', (frame.held.has(10) || frame.held.has(7)) && 'ShiftLeft'].filter((code): code is string => !!code);
    ctx.player.setGamepad(frame.move[0], frame.move[1], held);
    const seconds = Math.min(dt, 0.05);
    ctx.player.lookGamepad(frame.look[0] * seconds * 2.4, frame.look[1] * seconds * 1.8);
    for (const button of frame.down) {
      const sources = contextActions().map((action) => action.source);
      const resizing = document.getElementById('hint')?.querySelector('.key[data-pad-source="Scroll"]');
      let action: PadKey | undefined = BUTTON_KEYS[button];
      if (resizing && button === 12) action = ['Equal', '='];
      else if (resizing && button === 13) action = ['Minus', '-'];
      else if (button >= 12 && action && !sources.includes(action[1].toUpperCase())) continue;
      if (!action) continue;
      released.set(button, action);
      key('keydown', ...action);
      // Opening a window must consume this press, not activate its first control too.
      if (modalOpen() || isTyping()) { release(); break; }
    }
  });
}
