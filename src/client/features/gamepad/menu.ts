/** Focus only controls in the topmost window; never send gamepad buttons into a terminal. */
export function menuRoot(): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>('#modal-root > .backdrop')].at(-1);
}

const CONTROLS = 'button, a[href], input, select, textarea, [tabindex]';

export function focusMenu(direction: number, horizontal = false) {
  const root = menuRoot();
  if (!root) return;
  const controls = [...root.querySelectorAll<HTMLElement>(CONTROLS)].filter((el) =>
    el.tabIndex >= 0 && !el.matches(':disabled, [aria-disabled="true"], .xterm-helper-textarea')
    && !el.closest('.xterm') && el.getClientRects().length > 0);
  if (!controls.length) return;
  const at = controls.indexOf(document.activeElement as HTMLElement);
  const columns = !horizontal && root.querySelector('.pad-keyboard-grid') && document.activeElement?.closest('.pad-keyboard-grid') ? 10 : 1;
  const next = at < 0 ? (direction > 0 ? 0 : controls.length - 1) : (at + direction * columns + controls.length) % controls.length;
  controls[next].focus({ preventScroll: true });
  controls[next].scrollIntoView({ block: 'nearest' });
}

export function activateMenu(editText?: (el: HTMLInputElement | HTMLTextAreaElement) => void) {
  const root = menuRoot();
  const el = document.activeElement;
  if (!root || !(el instanceof HTMLElement) || !root.contains(el)) { focusMenu(1); return; }
  // A focuses text fields without submitting a prompt or confirming terminal permissions.
  if (el.matches('button, a[href], input[type=checkbox], input[type=radio]')) el.click();
  else if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && !el.closest('.xterm')) editText?.(el);
}

export function adjustMenu(direction: number): boolean {
  const el = document.activeElement;
  if (!menuRoot()?.contains(el) || !(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLSelectElement && el.options.length) {
    const options = [...el.options].filter((option) => !option.disabled);
    const at = options.findIndex((option) => option.index === el.selectedIndex);
    const next = options[Math.max(0, Math.min(options.length - 1, at + direction))];
    if (next) { el.selectedIndex = next.index; el.dispatchEvent(new Event('change', { bubbles: true })); }
  } else if (el instanceof HTMLInputElement && el.type === 'range') {
    if (direction > 0) el.stepUp(); else el.stepDown();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else return false;
  return true;
}
