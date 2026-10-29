import * as THREE from 'three';
import { DISCIPLINES } from '../../../shared/engineering';
import type { WorkerInfo } from '../../../shared/protocol';
import type { Ctx, Hint } from '../../core/context';
import { registerWorkerStyle } from '../../core/worker-style';
import { aside, hintTitle, key } from '../../core/hint';
import type { DeskKey } from '../../interaction';
import { store } from '../../state';
import { openPrompt } from '../../ui/prompt';
import { toast } from '../../ui/dom';
import { specialist } from './characters';
import type { buildEngineering } from './world';

export function createEngineeringTeam(ctx: Ctx, studio: ReturnType<typeof buildEngineering>) {
  const leader = (i: number) => [...store.workers.values()].find(w => w.engineering?.discipline === DISCIPLINES[i].id && w.engineering.role === 'lead');
  registerWorkerStyle((model, info) => {
    const a = info.engineering;
    if (!a) return;
    const i = DISCIPLINES.findIndex(d => d.id === a.discipline);
    if (i < 0) return;
    const appearance = specialist(i, model);
    const heroScale = model.root.scale.x;
    return { frame(w, desk, dt, t) {
      const isHero = w.engineering?.role === 'lead' && !w.meeting && ctx.inOffice();
      const parent = isHero ? studio.anchors[i] : desk.seatAnchor;
      if (model.root.parent !== parent) { parent.add(model.root); model.root.position.set(0, 0, 0); model.root.rotation.set(0, 0, 0); }
      model.root.scale.setScalar(isHero ? heroScale : w.engineering?.role === 'member' ? 0.62 : 1);
      if (isHero) model.root.userData.interact = studio.interactables.find(it => it.deskId === `lead:${a.discipline}`);
      else delete model.root.userData.interact;
      appearance.afterUpdate(ctx.reduceMotion.matches ? 0 : t);
    } };
  });
  function sync() { studio.placeholders.forEach((p, i) => p.visible = !leader(i)); }
  store.on('workers', sync); sync();
  function useWorker(w: WorkerInfo, action: DeskKey) {
    ctx.interactions.use({ kind: 'desk', deskId: w.deskId, x: 0, z: 0, radius: 1 }, action, null);
  }
  function openWhenReady(id: string, floor: string) {
    const tryOpen = () => {
      if (store.floor !== floor) { off(); return; }
      const w = store.workers.get(id);
      if (w) { off(); useWorker(w, 'E'); }
    };
    const off = store.on('workers', tryOpen);
    tryOpen(); setTimeout(off, 20000);
  }
  function start(i: number, initial = '') {
    const current = leader(i);
    if (current) return useWorker(current, 'P');
    const d = DISCIPLINES[i], floor = store.floor;
    if (!floor) return;
    openPrompt({ title: `Trabalhar com ${d.agent}`, subtitle: `${d.role}. Sessão real com terminal, alterações, retomada e até 3 auxiliares da equipe.`,
      initial, providerOption: true, worktreeOption: !!store.project?.branch, submitLabel: 'Iniciar agente',
      onSubmit: async (prompt, opts) => {
        try {
          const res = await fetch(`/api/engineering/team/start?floor=${encodeURIComponent(floor)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ discipline: d.id, prompt, ...opts }) });
          const result = await res.json(); if (!res.ok) throw new Error(result.error ?? 'Não foi possível iniciar o agente');
          if (store.floor === floor) openWhenReady(result.worker.id, floor);
        } catch (e) { toast((e as Error).message, 'error'); }
      },
    });
  }
  function use(i: number, action: DeskKey) {
    const w = leader(i);
    if (w) return useWorker(w, action);
    if (action === 'E' || action === 'P') start(i);
  }
  function hint(i: number): Hint {
    const w = leader(i), d = DISCIPLINES[i];
    if (!w) return { k: `new-${i}`, parts: [hintTitle(`${d.agent} · ${d.role}`), aside('Agente da etapa'), key('E', 'Dar tarefa'), key('P', 'Dar tarefa')] };
    return { k: `${w.id}:${w.status}:${w.activity}`, parts: [hintTitle(`${d.agent} · ${w.status}`), aside(w.activity ?? d.role), key('E', 'Terminal'), key('P', 'Mensagem'), key('C', 'Alterações'), key('R', 'Retomar'), key('O', 'PR'), key('X', 'Liberar agente')] };
  }
  return { leader, start, use, hint, useWorker };
}
export type EngineeringTeam = ReturnType<typeof createEngineeringTeam>;
