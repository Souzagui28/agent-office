import { DISCIPLINES, PROCESSES, type EngineeringState, type ProcessId } from '../../../shared/engineering';
import { h, openModal, toast } from '../../ui/dom';
import { markdownFile } from '../../ui/markdown';
import './ui.css';

export interface WorkspaceActions {
  save(state: EngineeringState): Promise<EngineeringState>;
  task(index: number, state: EngineeringState): void;
  docs(): void;
  scope: string;
}
const positions = new Map<string, { body: number; fields: number[]; previews: number[] }>();

/** Editors stay mounted while tabs change, retaining drafts and scroll position. */
export function openEngineering(index: number, original: EngineeringState, actions: WorkspaceActions) {
  let state = structuredClone(original);
  let active = index;
  let saving = false;
  const fields = DISCIPLINES.map(d => h('textarea', { 'aria-label': `Artefatos de ${d.short}`, maxlength: 50000 }, state.notes[d.id]));
  const previews = DISCIPLINES.map(() => h('div.engineering-preview'));
  const tabs = h('nav.engineering-tabs', { 'aria-label': 'Disciplinas' });
  const panes = h('div.engineering-panes');
  const status = h('span', { role: 'status', 'aria-live': 'polite' }, 'Salvo no projeto · alterações exigem Salvar');
  const process = h('select', { 'aria-label': 'Processo de desenvolvimento' }, ...Object.entries(PROCESSES).map(([id, p]) => h('option', { value: id }, p.name)));
  process.value = state.process;
  const phase = h('select', { 'aria-label': 'Fase atual' });
  function phases() {
    phase.replaceChildren(...PROCESSES[process.value as ProcessId].phases.map(p => h('option', { value: p }, p)));
    if ([...phase.options].some(o => o.value === state.phase)) phase.value = state.phase;
  }
  phases();
  process.onchange = phases;
  const iteration = h('input', { value: state.iteration, maxlength: 2000, 'aria-label': 'Iteração' });
  const objective = h('input', { value: state.objective, maxlength: 2000, 'aria-label': 'Objetivo da iteração' });
  const risk = h('input', { value: state.risk, maxlength: 2000, 'aria-label': 'Risco principal' });
  const panels = DISCIPLINES.map((d, i) => {
    const preview = () => previews[i].replaceChildren(markdownFile(fields[i].value));
    fields[i].oninput = () => { preview(); status.textContent = 'Alterações não salvas'; };
    preview();
    const panel = h('section.engineering-pane', {},
      h('p', {}, `${d.agent} · ${d.role}. ${d.personality}`),
      h('div.engineering-editor', {}, fields[i], previews[i]));
    panes.append(panel);
    return panel;
  });
  const buttons = DISCIPLINES.map((d, i) => h('button.btn', { type: 'button', onclick: () => select(i) }, `${d.icon} ${d.short}`));
  tabs.append(...buttons);
  function select(i: number) {
    active = i;
    panels.forEach((p, n) => p.hidden = n !== i);
    buttons.forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
  }
  function collect(): EngineeringState {
    return { ...state, process: process.value as ProcessId, phase: phase.value, iteration: iteration.value,
      objective: objective.value, risk: risk.value,
      notes: Object.fromEntries(DISCIPLINES.map((d, i) => [d.id, fields[i].value])) as EngineeringState['notes'] };
  }
  const save = h('button.btn.primary', { type: 'button', onclick: async () => {
    if (saving) return;
    saving = true; save.disabled = true;
    const pending = collect();
    try {
      const saved = await actions.save(pending);
      state = saved;
      status.textContent = JSON.stringify({ ...collect(), revision: saved.revision }) === JSON.stringify(saved) ? 'Salvo no projeto' : 'Há novas alterações não salvas';
    } catch (e) { status.textContent = (e as Error).message; }
    finally { saving = false; save.disabled = false; }
  } }, 'Salvar');
  const exportDoc = () => {
    const s = collect();
    const d = DISCIPLINES[active];
    const url = URL.createObjectURL(new Blob([s.notes[d.id]], { type: 'text/markdown;charset=utf-8' }));
    const a = h('a', { href: url, download: `${d.id}.md` });
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const el = h('div.modal.engineering-modal', { role: 'dialog', 'aria-label': 'Engenharia de software' },
    h('header', {}, h('h2', {}, 'Engenharia de software')),
    h('div.body', {},
      h('div.engineering-process', {}, h('label', {}, 'Processo', process), h('label', {}, 'Fase', phase), h('label', {}, 'Iteração', iteration)),
      h('label.engineering-field', {}, 'Objetivo', objective), h('label.engineering-field', {}, 'Risco principal', risk),
      h('p.muted', {}, 'O processo orienta o trabalho; selecionar uma fase não executa nem valida as etapas automaticamente.'),
      tabs, panes,
      h('p.muted', {}, 'Markdown com prévia. Imagens: ![descrição](https://…). Diagramas textuais podem ser registrados em blocos de código.')),
    h('footer', {}, status,
      h('button.btn', { type: 'button', onclick: exportDoc }, 'Exportar .md'),
      h('button.btn', { type: 'button', onclick: () => { modal.close(); actions.docs(); } }, 'Documentos do projeto'),
      h('button.btn', { type: 'button', onclick: () => {
        if (saving) return toast('Aguarde o salvamento');
        const snapshot = collect(); modal.close(); actions.task(active, snapshot);
      } }, 'Preparar tarefa do agente'), save));
  const modal = openModal(el, { reading: true, doing: 'artefatos de engenharia', onClose: () => {
    positions.set(actions.scope, { body: el.querySelector('.body')!.scrollTop, fields: fields.map(f => f.scrollTop), previews: previews.map(p => p.scrollTop) });
    if (JSON.stringify(collect()) !== JSON.stringify(state)) toast('Rascunho mantido nesta sessão. Use Salvar para gravar no projeto.', 'warn');
  } });
  select(index);
  const position = positions.get(actions.scope);
  if (position) {
    el.querySelector('.body')!.scrollTop = position.body;
    fields.forEach((f, i) => f.scrollTop = position.fields[i] ?? 0);
    previews.forEach((p, i) => p.scrollTop = position.previews[i] ?? 0);
  }
  return { state: collect };
}
