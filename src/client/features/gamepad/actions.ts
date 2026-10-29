import { h, openModal } from '../../ui/dom';
import { contextActions } from './hints';
import type { PadKey } from './bindings';

/** Same actions as the current blue hint, with the current target's own availability checks. */
export function openPadActions(run: (key: PadKey) => void) {
  const actions = contextActions();
  const extra: { label: string; key: PadKey }[] = [
    { label: 'Next worker', key: ['KeyN', 'n'] },
    { label: 'Hang a picture', key: ['KeyF', 'f'] },
    { label: 'Controls', key: ['KeyH', 'h'] },
  ];
  for (const [i, label] of ['Wave', 'Thumbs up', 'Clap', 'Dance', 'Point', 'Facepalm'].entries()) {
    extra.push({ label, key: [`Digit${i + 1}`, String(i + 1)] });
  }
  const rows = [...actions, ...extra].map((action) => h('button.btn.pad-action', {
    type: 'button', onclick: () => { modal.close(); run(action.key); },
  }, action.label));
  const el = h('div.modal.pad-actions', { role: 'dialog', 'aria-label': 'Controller actions' },
    h('header', {}, h('h2', {}, 'Controller actions')),
    h('div.body', {}, ...rows, h('p.muted', {}, 'D-pad: choose · A: select · B: back')));
  const modal = openModal(el);
  rows[0]?.focus();
}
