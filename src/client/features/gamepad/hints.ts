import { buttonLabel, hintKey, type PadKey } from './bindings';

export interface ContextAction { source: string; label: string; key: PadKey }

/** Read the original keyboard hints, including those folded under More actions for gamepads. */
export function contextActions(root = document.getElementById('hint')): ContextAction[] {
  if (!root || root.classList.contains('hidden')) return [];
  return [...root.querySelectorAll<HTMLElement>('.key:not([data-pad-more])')].flatMap((cap) => {
    const source = cap.dataset.padSource ?? cap.textContent?.trim() ?? '';
    const key = hintKey(source);
    const parent = cap.parentElement;
    if (!key || !parent) return [];
    const label = [...parent.childNodes].filter((node) => node !== cap).map((node) => node.textContent).join('').trim();
    return label ? [{ source, key, label }] : [];
  });
}

/** Decorates the existing blue hint in place, preserving its visibility, layout and keycap styles. */
export function renderPadHints(usingPad: boolean) {
  document.body.classList.toggle('using-gamepad', usingPad);
  const arcadeTip = document.querySelector<HTMLElement>('.cabinet .tip');
  if (arcadeTip) {
    arcadeTip.dataset.padOriginal ??= arcadeTip.textContent ?? '';
    arcadeTip.textContent = usingPad ? 'D-pad / LS: move · A: drop · X: turn · Y: reverse · LB: hold · RB: pause · B: exit' : arcadeTip.dataset.padOriginal;
  }
  const root = document.getElementById('hint');
  if (!root) return;
  let secondary = false;
  for (const cap of root.querySelectorAll<HTMLElement>('.key:not([data-pad-more])')) {
    if (!cap.dataset.padSource || cap.textContent !== cap.dataset.padRendered) cap.dataset.padSource = cap.textContent?.trim() ?? '';
    const source = cap.dataset.padSource;
    const label = buttonLabel(source);
    const folded = !label && !!hintKey(source);
    secondary ||= folded;
    cap.parentElement?.classList.toggle('pad-secondary', usingPad && folded);
    const text = usingPad ? label ?? source : source;
    if (cap.textContent !== text) cap.textContent = text;
    cap.dataset.padRendered = text;
  }
  let more = root.querySelector<HTMLElement>('[data-pad-actions]');
  if (usingPad && secondary) {
    if (!more) {
      more = document.createElement('span');
      more.dataset.padActions = '';
      const cap = document.createElement('span');
      cap.className = 'key'; cap.dataset.padMore = ''; cap.textContent = 'R3';
      more.append(cap, 'More actions');
      root.append(more);
    }
  } else more?.remove();
}
