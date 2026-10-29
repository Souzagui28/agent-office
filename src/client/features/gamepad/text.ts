import { h, openModal } from '../../ui/dom';

/** Enter a prompt with the controller; applying text never submits the underlying form. */
export function openPadKeyboard(target: HTMLInputElement | HTMLTextAreaElement) {
  if (target.disabled || target.readOnly) return;
  let draft = target.value;
  let upper = false;
  let caret = target.selectionStart ?? draft.length;
  const preview = h('div.pad-text-preview', { role: 'status', 'aria-label': 'Text preview' });
  const draw = () => { preview.textContent = draft.slice(0, caret) + '▏' + draft.slice(caret); };
  const insert = (text: string) => {
    const limit = target.maxLength >= 0 ? target.maxLength : Infinity;
    const accepted = text.slice(0, Math.max(0, limit - draft.length));
    draft = draft.slice(0, caret) + accepted + draft.slice(caret); caret += accepted.length; draw();
  };
  const letters: HTMLButtonElement[] = [];
  const character = (text: string) => {
    const button = h('button.btn', { type: 'button', onclick: () => insert(upper ? text.toUpperCase() : text) }, text);
    if (/^[a-z]$/.test(text)) letters.push(button);
    return button;
  };
  const grid = h('div.pad-keyboard-grid', {}, ...Array.from('1234567890qwertyuiopasdfghjkl;zxcvbnm,./-_=+!?@#$%&*()çáéíóúãõâêô').map(character));
  const command = (name: string, run: () => void) => h('button.btn', { type: 'button', onclick: run }, name);
  const el = h('div.modal.pad-keyboard', { role: 'dialog', 'aria-label': 'Controller keyboard' },
    h('header', {}, h('h2', {}, 'Controller keyboard')),
    h('div.body', {}, preview, grid,
      h('div.pad-keyboard-tools', {},
        command('Shift', () => { upper = !upper; letters.forEach((b) => b.textContent = upper ? b.textContent!.toUpperCase() : b.textContent!.toLowerCase()); }),
        command('Space', () => insert(' ')),
        command('Backspace', () => { if (caret) { draft = draft.slice(0, caret - 1) + draft.slice(caret); caret--; draw(); } }),
        command('←', () => { caret = Math.max(0, caret - 1); draw(); }),
        command('→', () => { caret = Math.min(draft.length, caret + 1); draw(); }),
        ...(target instanceof HTMLTextAreaElement ? [command('New line', () => insert('\n'))] : []),
        command('Apply text', () => {
          target.value = draft;
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
          modal.close(); target.focus();
          try { target.setSelectionRange(caret, caret); } catch { /* Number and email fields have no text selection. */ }
        })),
      h('p.muted', {}, 'D-pad: choose · A: type · B: cancel. Apply text does not send the prompt.')));
  const modal = openModal(el);
  draw();
  grid.querySelector<HTMLButtonElement>('button')?.focus();
}
