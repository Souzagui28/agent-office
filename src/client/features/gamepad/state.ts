/** Standard Gamepad API layout (Xbox / PlayStation face-button positions). */
export interface Pad {
  readonly index: number;
  readonly connected: boolean;
  readonly mapping: string;
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
}

/** Radial dead zone: no drift, proportional speed, and no faster diagonal movement. */
export function stick(x = 0, y = 0, deadzone = 0.18): [number, number] {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [0, 0];
  const length = Math.hypot(x, y);
  if (length <= deadzone) return [0, 0];
  const scale = (Math.min(1, length) - deadzone) / (1 - deadzone) / length;
  return [x * scale, y * scale];
}

export const pressed = (pad: Pad, button: number) => pad.buttons[button]?.pressed === true || (pad.buttons[button]?.value ?? 0) > 0.5;

/** Tracks button edges and keeps the active pad stable until it disconnects. */
export class PadState {
  private index: number | undefined;
  private previous = new Set<number>();
  private primed = false;

  reset() {
    this.index = undefined;
    this.previous.clear();
    this.primed = false;
  }

  sample(pads: readonly (Pad | null)[]) {
    const supported = pads.filter((p): p is Pad => !!p?.connected && p.mapping === 'standard');
    const active = supported.find((p) => p.index !== this.index && (p.buttons.some((_, i) => pressed(p, i)) || p.axes.some((a) => Math.abs(a) > 0.25)));
    const pad = supported.find((p) => p.index === this.index) ?? active ?? supported[0];
    if (!pad) { this.reset(); return undefined; }
    const held = new Set(pad.buttons.flatMap((_, i) => pressed(pad, i) ? [i] : []));
    // Connecting or switching with a button held must not activate whatever is focused.
    const down = this.primed && pad.index === this.index ? [...held].filter((i) => !this.previous.has(i)) : [];
    const up = this.primed && pad.index === this.index ? [...this.previous].filter((i) => !held.has(i)) : [];
    this.index = pad.index;
    this.previous = held;
    this.primed = true;
    return { pad, down, up, held, move: stick(pad.axes[0], pad.axes[1]), look: stick(pad.axes[2], pad.axes[3]) };
  }
}
