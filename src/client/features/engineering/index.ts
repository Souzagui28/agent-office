import { DISCIPLINES, PROCESSES, ENGINEERING_SITE as S, engineeringArrival, initialEngineering, type EngineeringState } from '../../../shared/engineering';
import type { Ctx } from '../../core/context';
import type { Parts } from '../../core/parts';
import { aside, hintTitle, key, onE } from '../../core/hint';
import { store } from '../../state';
import { isTyping } from '../../player';
import { closeAllModals, h, modalOpen, openModal, toast } from '../../ui/dom';
import { openPrompt } from '../../ui/prompt';
import { buildEngineering } from './world';
import { openEngineering } from './ui';

declare module '../../world/types' { interface InteractKinds { engineering: true; } }

type Deps = Pick<Parts, 'place' | 'walking' | 'focus' | 'bookshelf' | 'actions'>;
export function installEngineering(ctx: Ctx, deps: Deps) {
  const annex = buildEngineering();
  ctx.scene.add(annex.group);
  ctx.office.colliders.push(...annex.colliders);
  const arrivals = new Map<string, ReturnType<typeof engineeringArrival>>();
  const states = new Map<string, EngineeringState>();
  const drafts = new Map<string, () => EngineeringState>();
  let normalRoom = { ...ctx.player.room };
  let current = -1;
  let shown = false;
  let loading = false;
  let lastProject: string | null = null;
  let returnAt: ReturnType<typeof engineeringArrival> | null = null;
  const launch = h('button.btn.engineering-launch', { type: 'button', title: 'Andares de engenharia', onclick: () => {
    shown = !shown; nav.hidden = !shown;
    if (shown && ctx.player.locked) ctx.player.yieldMouse();
    if (!shown) deps.focus.backToGame();
  } }, '🏗 Engenharia');
  const plaque = h('div.engineering-plaque');
  const nav = h('nav.engineering-nav', { 'aria-label': 'Andares de engenharia', hidden: true }, plaque);
  const floorButtons = DISCIPLINES.map((d, i) => h('button.btn', { type: 'button', title: `Alt + ${i + 1} · ${d.name}`, onclick: () => go(i) }, `${i + 1} · ${d.icon} ${d.short}`));
  nav.append(...floorButtons,
    h('button.btn', { type: 'button', onclick: () => void edit(Math.max(0, current)) }, '📖 Artefatos e processo'),
    h('button.btn', { type: 'button', onclick: leave }, '↩ Escritório do projeto'));
  const shortcut = h('select', { 'aria-label': 'Atalhos de andares' },
    h('option', { value: 'alt' }, 'Alt + 1–5'), h('option', { value: 'ctrlshift' }, 'Ctrl + Shift + 1–5'), h('option', { value: 'off' }, 'Atalhos desativados'));
  try { shortcut.value = localStorage.getItem('agent-office.engineering-shortcut') ?? 'alt'; } catch { /* private browsing */ }
  shortcut.onchange = () => { try { localStorage.setItem('agent-office.engineering-shortcut', shortcut.value); } catch { /* optional preference */ } };
  nav.append(shortcut);
  document.getElementById('hud')!.append(launch, nav);
  function selector() {
    const content = h('div.modal', { role: 'dialog', 'aria-label': 'Andares de engenharia' },
      h('header', {}, h('h2', {}, 'Andares de engenharia')),
      h('div.body.engineering-selector', {}, ...DISCIPLINES.map((d, i) => h('button.btn', {
        type: 'button', onclick: () => { modal.close(); go(i); },
      }, `${i + 1} · ${d.icon} ${d.name}`)),
      h('button.btn', { type: 'button', onclick: () => { modal.close(); void edit(Math.max(0, current)); } }, 'Artefatos e processo'),
      h('button.btn', { type: 'button', onclick: () => { modal.close(); leave(); } }, 'Voltar ao escritório do projeto')));
    const modal = openModal(content);
    content.querySelector('button')?.focus();
  }
  ctx.hud.addAction({ id: 'engineering', icon: '🏗', label: 'Engenharia de software', section: 'Office', key: 'J', run: selector });
  ctx.keys.bind({ code: 'KeyJ', repeat: false, run: selector });
  function refresh() {
    const state = states.get(store.floor ?? '') ?? initialEngineering();
    plaque.replaceChildren(h('strong', {}, current >= 0 ? DISCIPLINES[current].name : 'Andares de engenharia'),
      h('small', {}, PROCESSES[state.process].name), h('small', {}, `${state.phase} · iteração ${state.iteration}`));
    annex.setPlaque(`${PROCESSES[state.process].name} · ${state.phase} · ${state.iteration}`);
    floorButtons.forEach((b, i) => b.setAttribute('aria-current', String(i === current)));
  }
  function remember() {
    if (current >= 0 && store.floor) arrivals.set(`${store.floor}:${current}`, {
      x: ctx.player.pos.x, y: ctx.player.pos.y, z: ctx.player.pos.z, rotY: ctx.player.facing,
    });
  }
  function go(i: number) {
    if (!store.floor || !ctx.inOffice() || ctx.upTop() || ctx.trip()) return toast('Entre no escritório de um projeto antes de abrir os andares.', 'warn');
    if (i < 0 || i >= DISCIPLINES.length) return;
    if (current < 0) normalRoom = { ...ctx.player.room };
    if (current < 0) returnAt = { x: ctx.player.pos.x, y: ctx.player.pos.y, z: ctx.player.pos.z, rotY: ctx.player.facing };
    remember();
    closeAllModals();
    ctx.activities.stopAll('trip');
    deps.walking.stopWalkingTo();
    ctx.player.clearKeys();
    const at = arrivals.get(`${store.floor}:${i}`) ?? engineeringArrival(i);
    current = i;
    ctx.player.room = { minX: S.x - S.halfX, maxX: S.x + S.halfX, minZ: -S.halfZ, maxZ: S.halfZ, wall: 0.25, enclosed: true };
    shown = true; nav.hidden = false;
    deps.place.placeAt(at);
    ctx.player.enabled = true;
    refresh();
    deps.focus.backToGame();
  }
  function leave() {
    if (current < 0) return;
    remember();
    ctx.activities.stopAll('trip'); deps.walking.stopWalkingTo();
    ctx.player.clearKeys();
    deps.place.placeAt(returnAt ?? { x: 0, y: 0, z: 8, rotY: Math.PI });
    current = -1; ctx.player.room = normalRoom; refresh(); deps.focus.backToGame();
  }
  async function fetchState(floor: string) {
    const res = await fetch(`/api/engineering?floor=${encodeURIComponent(floor)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Não foi possível carregar os artefatos do projeto.');
    const state = await res.json() as EngineeringState;
    states.set(floor, state);
    return state;
  }
  async function edit(i: number) {
    const floor = store.floor;
    if (!floor || loading) return;
    loading = true;
    try {
      const state = drafts.get(floor)?.() ?? await fetchState(floor);
      if (floor !== store.floor) return;
      const editor = openEngineering(i, state, {
        scope: floor,
        async save(value) {
          const res = await fetch(`/api/engineering?floor=${encodeURIComponent(floor)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? 'Falha ao salvar');
          states.set(floor, data); refresh(); return data;
        },
        docs: () => deps.bookshelf.showBookshelf(),
        task: (n, state) => prepareTask(n, state, floor),
      });
      drafts.set(floor, editor.state);
    } catch (e) { toast((e as Error).message, 'error'); }
    finally { loading = false; }
  }
  function prepareTask(i: number, state: EngineeringState, floor: string) {
    const d = DISCIPLINES[i];
    const desk = ctx.plan().desks.find(x => !x.wing && !store.workerAtDesk(x.id));
    if (!desk || deps.actions.officeIsFull()) return toast('Libere uma mesa do projeto para iniciar a tarefa.', 'warn');
    openPrompt({ title: `${d.agent} · ${d.role}`, providerOption: true, worktreeOption: true,
      subtitle: 'Revise a tarefa antes de iniciar. O personagem no andar é um guia visual; o agente real executará na mesa do projeto.',
      initial: `Atue como ${d.role}. ${d.personality}\nProcesso: ${PROCESSES[state.process].name}; fase: ${state.phase}; iteração: ${state.iteration}.\nObjetivo: ${state.objective}\nRisco: ${state.risk}\n\nArtefatos atuais:\n${state.notes[d.id]}\n\nTrabalhe apenas no escopo desta disciplina. Registre resultados em docs/engineering/${d.id}.md. Explicite suposições, evidências e limites. Não declare concluído sem verificar os critérios de aceitação.`,
      onSubmit(text, opts) {
        if (store.floor !== floor || store.workerAtDesk(desk.id)) return toast('O projeto ou a disponibilidade da mesa mudou. Prepare a tarefa novamente.', 'warn');
        deps.actions.hire(desk.id, text, opts.worktree, opts.provider, opts.model, opts.effort);
      },
    });
  }
  ctx.interactions.define('engineering', {
    reach: 4,
    hint: it => ({ k: it.label ?? '', parts: [hintTitle(it.label ?? 'Engenharia'), aside('Andares do mesmo projeto'), key('E', 'Abrir')] }),
    use: onE(it => it.deskId === 'elevator' ? selector() : void edit(Math.max(0, DISCIPLINES.findIndex(d => d.id === it.deskId)))),
  });
  ctx.usables.add({ usable: () => annex.group.visible ? annex.interactables : [], pickable: () => annex.group });
  window.addEventListener('keydown', e => {
    const match = shortcut.value === 'alt' ? e.altKey && !e.ctrlKey && !e.metaKey : shortcut.value === 'ctrlshift' && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey;
    if (!match || e.repeat || modalOpen() || isTyping(e) || !/^Digit[1-5]$/.test(e.code)) return;
    e.preventDefault(); e.stopImmediatePropagation(); go(Number(e.code.slice(-1)) - 1);
  }, true);
  ctx.ticks.add('world', ({ dt, t }) => {
    annex.group.visible = ctx.inOffice() && !ctx.upTop() && !!store.floor;
    if (current >= 0 && (store.floor !== lastProject || !ctx.inOffice() || ctx.upTop() || Math.abs(ctx.player.pos.x - S.x) > S.halfX + 1)) {
      current = -1;
      if (ctx.inOffice() && !ctx.upTop()) ctx.player.room = normalRoom;
      refresh();
    }
    lastProject = store.floor;
    if (annex.group.visible && current < 0 && Math.abs(ctx.player.pos.x - S.x) < S.halfX && Math.abs(ctx.player.pos.z) < S.halfZ) {
      const n = Math.round((ctx.player.pos.y - S.base) / S.storey);
      if (n >= 0 && n < DISCIPLINES.length && Math.abs(ctx.player.pos.y - engineeringArrival(n).y) < 2) {
        current = n;
        normalRoom = { ...ctx.player.room };
        ctx.player.room = { minX: S.x - S.halfX, maxX: S.x + S.halfX, minZ: -S.halfZ, maxZ: S.halfZ, wall: 0.25, enclosed: true };
        refresh();
      }
    }
    if (current >= 0) annex.update(ctx.reduceMotion.matches ? 0 : dt, ctx.reduceMotion.matches ? 0 : t);
  });
  store.on('floor', () => { if (store.floor) void fetchState(store.floor).then(refresh).catch(() => {}); });
  refresh();
}
