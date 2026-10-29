import { DISCIPLINES, type DisciplineId } from '../../shared/engineering.js';
import { FLOW_SPEC, newFlow, validFlow, type EngineeringFlow, type Step } from '../../shared/engineering-flow.js';
import { atomicWrite, FlowError, readJson, safePath } from './files.js';

export class FlowStore {
  private file: string;
  constructor(dir: string) { this.file = safePath(dir, '.agent-office/engineering-flow.json'); }
  read() { return readJson(this.file, newFlow, validFlow); }
  save(state: EngineeringFlow, expected: number) {
    if (!validFlow(state)) throw new FlowError('Invalid workflow');
    if (this.read().revision !== expected) throw new FlowError('O quadro mudou. Reabra antes de salvar.', 409);
    state.revision = expected + 1;
    atomicWrite(this.file, JSON.stringify(state, null, 2));
    return state;
  }
  edit(id: DisciplineId, revision: number, objective: unknown, steps: unknown) {
    const s = this.read();
    s.stages[id] = { ...s.stages[id], objective: objective as string, steps: steps as Step[] };
    if (s.stages[id].status === 'done') {
      s.stages[id].status = 'review'; delete s.stages[id].approvedAt; delete s.stages[id].approvedBy;
    }
    return this.save(s, revision);
  }
  start(id: DisciplineId, worker: string, task: string) {
    const s = this.read(), rev = s.revision;
    s.stages[id] = { ...s.stages[id], leader: worker, task, steps: s.stages[id].steps.map(step => ({ ...step, done: false })), status: 'doing', approvedBy: undefined, approvedAt: undefined };
    return this.save(s, rev);
  }
  report(id: DisciplineId, worker: string, task: string, summary: string, lead: boolean) {
    const s = this.read(), rev = s.revision;
    if (s.stages[id].task !== task) throw new FlowError('This report belongs to an older task', 409);
    s.reports = [...s.reports.filter(r => r.worker !== worker), { worker, task, summary, at: Date.now() }].slice(-200);
    if (lead) {
      if (s.stages[id].leader !== worker) throw new FlowError('Only the current chief can submit this stage', 403);
      s.stages[id].status = 'review'; delete s.stages[id].approvedAt; delete s.stages[id].approvedBy;
    }
    return this.save(s, rev);
  }
  approve(id: DisciplineId, revision: number, by: string) {
    const s = this.read(), stage = s.stages[id];
    if (stage.status !== 'review') throw new FlowError('A entrega ainda não está em revisão');
    if (!stage.steps.every(x => x.done)) throw new FlowError('Revise e marque os passos antes de aprovar');
    stage.status = 'done'; stage.approvedBy = by; stage.approvedAt = Date.now();
    return this.save(s, revision);
  }
  invalidate(id: DisciplineId) {
    const s = this.read(), rev = s.revision;
    const affected = new Set<DisciplineId>([id]);
    for (const d of DISCIPLINES) if (FLOW_SPEC[d.id].inputs.some(input => affected.has(input))) affected.add(d.id);
    for (const d of DISCIPLINES) if (affected.has(d.id)) {
      const stage = s.stages[d.id];
      if (stage.status === 'done') stage.status = 'review';
      delete stage.approvedBy; delete stage.approvedAt;
    }
    return this.save(s, rev);
  }
}
