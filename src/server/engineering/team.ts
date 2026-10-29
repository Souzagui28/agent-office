import { randomUUID } from 'node:crypto';
import { DISCIPLINES, type DisciplineId } from '../../shared/engineering.js';
import { MAX_ENGINEERING_HELPERS, SECTOR_DESKS, type EngineeringAssignment } from '../../shared/engineering-team.js';
import { artifactPath, FLOW_SPEC } from '../../shared/engineering-flow.js';
import type { AgentEffort, AgentProvider, WorkerInfo } from '../../shared/protocol.js';
import type { Floor } from '../floor.js';
import type { HireRequest } from '../office-workers.js';
import { nextFreeSeat } from '../../shared/layout.js';
import { FlowStore } from './flow.js';
import { FlowError } from './files.js';
import { ArtifactStore } from './artifacts.js';

export function disciplineOf(v: unknown): DisciplineId {
  if (!DISCIPLINES.some(d => d.id === v)) throw new FlowError('Unknown discipline');
  return v as DisciplineId;
}
export function leaderOf(floor: Floor, id: DisciplineId) {
  return floor.workers.list().find(w => w.engineering?.discipline === id && w.engineering.role === 'lead');
}
export function workerArtifacts(floor: Floor, worker?: string) {
  if (!worker) return new ArtifactStore(floor.dir);
  if (!floor.workers.get(worker)) throw new FlowError('No such worker on this project', 404);
  const root = floor.workers.owners().find(w => w.workerId === worker)?.cwd;
  if (!root) throw new FlowError('Worker workspace is unavailable', 409);
  return new ArtifactStore(root);
}
function deskFor(floor: Floor, id: DisciplineId) {
  const i = DISCIPLINES.findIndex(d => d.id === id);
  return SECTOR_DESKS[i].find(d => !floor.workers.deskOccupied(d)) ?? nextFreeSeat(d => floor.workers.deskOccupied(d), floor.plan.wing)?.id;
}
function brief(floor: Floor, assignment: EngineeringAssignment, request: string) {
  const d = DISCIPLINES.find(d => d.id === assignment.discipline)!;
  const stage = new FlowStore(floor.dir).read().stages[d.id];
  const inputs = FLOW_SPEC[d.id].inputs.map(artifactPath).join(', ') || 'referências fornecidas pelos stakeholders';
  const coordination = assignment.role === 'lead'
    ? `Você é ${d.agent}, chefe da etapa. Pode contratar até ${MAX_ENGINEERING_HELPERS} auxiliares presentes usando hire_worker do MCP agent-office ou office-workers hire. Divida tarefas independentes, acompanhe list_workers, use tell_worker para orientar e list_reports / office-workers reports para reunir resultados. Os auxiliares herdam sua área e tarefa. Consulte read_stage_artifact para ler entregas em worktrees separadas. Consolide o artefato, verifique as evidências e use report_work para submetê-lo à revisão humana. Não declare aprovação por conta própria.`
    : `Você é um auxiliar de ${d.agent}, na tarefa ${assignment.task}, sob responsabilidade do chefe ${assignment.parent}. Execute apenas a subtarefa recebida. Não contrate outros agentes. Registre o resultado com report_work ou office-workers report. O chefe é responsável pelo documento canônico; só o altere se isso fizer parte da subtarefa. Seu chefe consultará o relatório e consolidará o trabalho.`;
  return `${request}\n\n${coordination}\n${d.role}. ${d.personality}\nObjetivo: ${stage.objective}\nEntradas: ${inputs}\nSaída canônica: ${artifactPath(d.id)}\nChecklist: ${stage.steps.map(s => s.text).join('; ')}\nLeia as entradas e o template com read_stage_artifact (sem worker para consultar o projeto, inclusive em worktree separada). Não invente resultados, entrevistas ou testes executados. Registre hipóteses e dúvidas. Preserve trabalho existente.`;
}
export interface LeadRequest { discipline: DisciplineId; prompt: string; worktree: boolean; provider?: AgentProvider; model?: string; effort?: AgentEffort; }
export async function startLeader(floor: Floor, ask: LeadRequest, by: string, owner?: string) {
  if (leaderOf(floor, ask.discipline)) throw new FlowError('Este chefe já tem uma sessão. Abra o terminal ou envie uma nova mensagem.', 409);
  if (ask.worktree) await floor.workers.fetchBase();
  if (leaderOf(floor, ask.discipline)) throw new FlowError('Outra pessoa iniciou este chefe; reabra o setor.', 409);
  const desk = deskFor(floor, ask.discipline);
  if (!desk) throw new FlowError('Não há mesa disponível', 409);
  const a: EngineeringAssignment = { discipline: ask.discipline, role: 'lead', task: randomUUID() };
  const w = floor.workers.spawn(desk, by, brief(floor, a, ask.prompt), ask.worktree, 'agent', ask.provider, ask.model, ask.effort, undefined, owner, [], undefined, a);
  if (typeof w === 'string') throw new FlowError(w, 409);
  new FlowStore(floor.dir).start(ask.discipline, w.id, a.task);
  return w;
}
export async function delegate(floor: Floor, me: WorkerInfo, ask: HireRequest) {
  const parent = me.engineering;
  if (!parent || parent.role !== 'lead') throw new FlowError('Somente o chefe da etapa pode contratar auxiliares.', 403);
  const stage = new FlowStore(floor.dir).read().stages[parent.discipline];
  if (stage.task !== parent.task) throw new FlowError('A tarefa deste chefe foi substituída.', 409);
  const children = () => floor.workers.list().filter(w => w.engineering?.parent === me.id);
  if (children().length >= MAX_ENGINEERING_HELPERS) throw new FlowError(`Limite de ${MAX_ENGINEERING_HELPERS} auxiliares presentes. Recolha as entregas e libere uma mesa antes de contratar outro.`, 409);
  const worktree = ask.worktree ?? !!floor.project.branch;
  if (worktree) await floor.workers.fetchBase();
  if (!floor.workers.get(me.id) || new FlowStore(floor.dir).read().stages[parent.discipline].task !== parent.task || children().length >= MAX_ENGINEERING_HELPERS) throw new FlowError('O chefe ou a disponibilidade da equipe mudou.', 409);
  const desk = ask.desk ?? deskFor(floor, parent.discipline);
  if (!desk) throw new FlowError('Não há mesa disponível', 409);
  const used = new Set(children().map(w => w.engineering?.sequence));
  let sequence = 1; while (used.has(sequence)) sequence++;
  const a: EngineeringAssignment = { discipline: parent.discipline, role: 'member', parent: me.id, task: parent.task, sequence };
  const provider = ask.provider ?? me.provider;
  const w = floor.workers.spawn(desk, me.name, brief(floor, a, ask.prompt), worktree, 'agent', provider, ask.model ?? (provider === me.provider ? me.model : undefined), ask.effort ?? me.effort, undefined, floor.workers.ownerOf(me.id), [], undefined, a);
  if (typeof w === 'string') throw new FlowError(w, 409);
  return w;
}
export function reportsFor(floor: Floor, me: WorkerInfo) {
  if (!me.engineering) throw new FlowError('Este agente não está associado a uma etapa', 403);
  const flow = new FlowStore(floor.dir).read();
  return flow.reports.filter(r => r.task === me.engineering!.task).map(r => {
    const w = floor.workers.get(r.worker);
    return { ...r, name: w?.name, discipline: w?.engineering?.discipline, artifactWorker: w?.id, artifactPath: w?.engineering ? artifactPath(w.engineering.discipline) : undefined };
  });
}
