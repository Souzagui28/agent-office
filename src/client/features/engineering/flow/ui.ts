import { DISCIPLINES, type DisciplineId } from '../../../../shared/engineering';
import { artifactPath, FLOW_SPEC, type Stage } from '../../../../shared/engineering-flow';
import { h, openModal, toast, type Modal } from '../../../ui/dom';
import { store } from '../../../state';
import type { EngineeringTeam } from '../team';
import { flowRequest, type FlowView } from './api';
import { openArtifact } from './artifact';
import './ui.css';

const STATUS = { todo: 'A fazer', doing: 'Em andamento', review: 'Em revisão', done: 'Aprovado' };
export async function openStage(index: number, team: EngineeringTeam, process: () => void, update?: (view: FlowView) => void) {
  const floor = store.floor;
  if (!floor) return;
  let modal: Modal | undefined, closed = false, refreshing = false, dirty = false;
  let view: FlowView, current = index, signature = '';
  const stamp = (value: FlowView) => JSON.stringify([value, [...store.workers.values()].map(w => [w.id, w.name, w.status, w.engineering])]);
  const tabs = h('nav.flow-tabs');
  const body = h('div.body.flow-body');
  const status = h('span', { role: 'status', 'aria-live': 'polite' });
  const el = h('div.modal.flow-modal', { role: 'dialog', 'aria-label': 'Quadro da etapa' },
    h('header', {}, h('h2', {}, 'Etapas e entregas'), h('button.btn', { type: 'button', onclick: () => { modal?.close(); process(); } }, 'Processo e notas')),
    tabs, body, h('footer', {}, status));
  const error = (e: unknown) => status.textContent = (e as Error).message;
  async function refresh() {
    if (closed || refreshing || dirty) return;
    refreshing = true;
    try {
      const next = await flowRequest<FlowView>(floor!, 'flow');
      if (closed || dirty || store.floor !== floor) return;
      const version = stamp(next);
      if (version === signature) return;
      view = next; signature = version; update?.(view); render();
    } catch (e) { error(e); }
    finally { refreshing = false; }
  }
  async function save(stage: Stage, id: DisciplineId) {
    try {
      await flowRequest(floor!, 'flow', { discipline: id, revision: view.state.revision, objective: stage.objective, steps: stage.steps });
      dirty = false; status.textContent = 'Passos salvos'; await refresh();
    } catch (e) { error(e); }
  }
  function render() {
    tabs.replaceChildren(...DISCIPLINES.map((d, i) => h('button.btn', { type: 'button', 'aria-pressed': i === current ? 'true' : 'false', onclick: () => {
      if (dirty) return toast('Salve os passos antes de trocar de etapa.', 'warn');
      current = i; render();
    } }, `${d.icon} ${d.short} · ${STATUS[view.state.stages[d.id].status]}`)));
    const d = DISCIPLINES[current], id = d.id, spec = FLOW_SPEC[id];
    const stage = structuredClone(view.state.stages[id]);
    const artifact = view.artifacts[id], chief = team.leader(current);
    const objective = h('textarea.flow-objective', { 'aria-label': 'Objetivo da etapa', maxlength: 2000 }, stage.objective);
    objective.oninput = () => { stage.objective = objective.value; dirty = true; status.textContent = 'Alterações não salvas'; };
    const steps = h('div.flow-steps');
    function renderSteps() {
      steps.replaceChildren(...stage.steps.map((step, n) => {
        const check = h('input', { type: 'checkbox', 'aria-label': step.text }); check.checked = step.done;
        check.onchange = () => { step.done = check.checked; dirty = true; status.textContent = 'Alterações não salvas'; };
        return h('div.flow-step', {}, check, h('span', {}, `${n + 1}. ${step.text}`), h('button.btn', { type: 'button', 'aria-label': `Remover passo ${n + 1}`, disabled: stage.steps.length <= 1, onclick: () => { stage.steps.splice(n, 1); dirty = true; status.textContent = 'Alterações não salvas'; renderSteps(); } }, '×'));
      }));
    }
    renderSteps();
    const newStep = h('input', { 'aria-label': 'Novo passo', maxlength: 500, placeholder: 'Adicionar um passo específico desta tarefa' });
    const add = () => {
      const text = newStep.value.trim(); if (!text || stage.steps.length >= 50) return;
      stage.steps.push({ id: `step-${crypto.randomUUID()}`, text, done: false }); newStep.value = ''; dirty = true; renderSteps();
    };
    const teamBox = h('div.flow-team');
    const members = [...store.workers.values()].filter(w => w.engineering?.discipline === id);
    teamBox.append(...members.map(w => h('div.flow-worker', {}, h('strong', {}, `${w.engineering?.role === 'lead' ? 'Chefe' : 'Auxiliar'} · ${w.name}`), h('small', {}, w.status),
      ...(['E', 'P', 'C', 'R', 'O', 'X'] as const).map((key, n) => h('button.btn', { type: 'button', onclick: () => { modal?.close(); team.useWorker(w, key); } }, ['Terminal', 'Mensagem', 'Alterações', 'Retomar', 'PR', 'Liberar'][n])))));
    const reports = view.state.reports.filter(r => r.task === stage.task);
    const missing = spec.inputs.filter(input => !view.artifacts[input].exists);
    const approved = h('button.btn', { type: 'button', disabled: stage.status !== 'review' || !stage.steps.every(s => s.done), onclick: async () => {
      if (dirty) return toast('Salve o checklist antes de aprovar.', 'warn');
      try {
        const candidate = artifact.candidate?.exists ? artifact.candidate : undefined;
        await flowRequest(floor!, 'approve', { discipline: id, revision: view.state.revision, worker: candidate?.worker, sourceHash: candidate?.hash ?? artifact.hash, rootHash: artifact.hash });
        await refresh();
      } catch (e) { error(e); }
    } }, 'Aprovar entrega');
    body.replaceChildren(
      h('section', {}, h('h3', {}, `${d.name} · ${STATUS[stage.status]}`), h('label', {}, 'Objetivo', objective)),
      h('div.flow-columns', {},
        h('section', {}, h('h3', {}, 'Entradas'), spec.inputs.length ? h('div.flow-inputs', {}, ...spec.inputs.map(input => h('button.btn', { type: 'button', onclick: () => void openArtifact(floor!, input, refresh) }, `${FLOW_SPEC[input].title} · ${view.artifacts[input].exists ? 'disponível' : 'pendente'}`))) : h('p', {}, 'Pedido, referências, entrevistas e evidências dos stakeholders.'),
          missing.length ? h('p.flow-warning', {}, 'Há entradas pendentes. Registre as hipóteses e revise as dependências ao iterar.') : null,
          h('h3', {}, 'Passo a passo'), steps,
          h('div.flow-add', {}, newStep, h('button.btn', { type: 'button', onclick: add }, 'Adicionar passo')),
          h('button.btn', { type: 'button', onclick: () => void save(stage, id) }, 'Salvar passos')),
        h('section', {}, h('h3', {}, 'Saída esperada'), h('p', {}, spec.title), h('code', {}, artifactPath(id)),
          h('p', {}, 'Use um artefato canônico e referencie as entradas. O template contém estrutura e critérios para preencher.'),
          h('button.btn', { type: 'button', onclick: () => void openArtifact(floor!, id, refresh) }, artifact.exists ? 'Abrir artefato' : 'Abrir template'),
          artifact.candidate?.exists ? h('button.btn', { type: 'button', onclick: () => void openArtifact(floor!, id, refresh, artifact.candidate!.worker) }, 'Revisar entrega do chefe') : null,
          approved,
          h('p.muted', {}, 'A aprovação publica apenas este documento no projeto. Código em worktrees continua sujeito à revisão e ao merge.'),
          h('h3', {}, 'Equipe'), h('p', {}, `${d.agent}: ${d.personality}`), teamBox,
          h('button.btn.primary', { type: 'button', onclick: () => {
            if (dirty) return toast('Salve os passos antes de iniciar o agente.', 'warn');
            modal?.close(); team.start(current, stage.objective);
          } }, chief ? `Enviar tarefa a ${d.agent}` : `Iniciar ${d.agent}`),
          h('p.muted', {}, 'Até 3 auxiliares presentes por chefe; limites de capacidade e consumo do escritório continuam valendo.'))),
      h('section', {}, h('h3', {}, 'Entregas da equipe'), reports.length ? h('div', {}, ...reports.map(r => h('details', {}, h('summary', {}, store.workers.get(r.worker)?.name ?? r.worker), h('pre', {}, r.summary)))) : h('p.muted', {}, 'Os relatórios aparecerão aqui quando os agentes submeterem o trabalho.')));
  }
  try {
    view = await flowRequest<FlowView>(floor, 'flow'); if (store.floor !== floor) return;
    signature = stamp(view); update?.(view); render();
    modal = openModal(el, { doing: 'quadro da etapa', onClose: () => { closed = true; clearInterval(timer); if (dirty) toast('Os passos não salvos foram descartados.', 'warn'); } });
    const timer = window.setInterval(refresh, 5000);
  } catch (e) { toast((e as Error).message, 'error'); }
}
