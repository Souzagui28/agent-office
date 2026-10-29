import { DISCIPLINES, type DisciplineId } from './engineering.js';

export interface Step { id: string; text: string; done: boolean; }
export interface Stage {
  objective: string;
  status: 'todo' | 'doing' | 'review' | 'done';
  steps: Step[];
  task?: string;
  leader?: string;
  approvedBy?: string;
  approvedAt?: number;
}
export interface WorkReport { worker: string; task: string; summary: string; at: number; }
export interface EngineeringFlow { revision: number; stages: Record<DisciplineId, Stage>; reports: WorkReport[]; }
export const FLOW_SPEC = {
  requirements: { title: 'Especificação e backlog', inputs: [], objective: 'Transformar o problema em requisitos priorizados e critérios de aceitação verificáveis.', steps: ['Identificar problema, stakeholders e prioridades', 'Registrar evidências da elicitação e hipóteses', 'Definir RF, RNF, user stories e critérios de aceitação', 'Revisar escopo e priorizar o backlog'] },
  architecture: { title: 'Arquitetura e decisões', inputs: ['requirements'], objective: 'Escolher uma solução que atenda aos drivers e registrar seus custos e limitações.', steps: ['Consumir requisitos e identificar drivers mensuráveis', 'Comparar alternativas e restrições', 'Descrever C4, dados e interfaces necessários', 'Registrar decisões e riscos arquiteturais'] },
  implementation: { title: 'Incremento e protótipo', inputs: ['requirements', 'architecture'], objective: 'Entregar um incremento executável e rastreável aos requisitos selecionados.', steps: ['Selecionar itens do backlog e definir pronto', 'Criar protótipo e implementar o incremento', 'Verificar execução e registrar mudanças', 'Preparar instruções reproduzíveis e revisão'] },
  validation: { title: 'Casos e evidências de teste', inputs: ['requirements', 'implementation'], objective: 'Verificar os critérios de aceitação com casos de teste e evidências reais.', steps: ['Relacionar RF e US aos casos de teste', 'Definir pré-condições, passos e resultados esperados', 'Executar e registrar resultados obtidos e evidências', 'Registrar defeitos, retestes e avaliação da usuária'] },
  operations: { title: 'Operação e entrega', inputs: ['architecture', 'implementation', 'validation'], objective: 'Disponibilizar a entrega com instruções de operação, custos e recuperação.', steps: ['Revisar evidências e limitações da entrega', 'Documentar configuração e implantação', 'Definir observação, custos, backup e recuperação', 'Verificar o procedimento e registrar a versão entregue'] },
} satisfies Record<DisciplineId, {title: string; inputs: DisciplineId[]; objective: string; steps: string[]}>;
export const artifactPath = (id: DisciplineId) => `docs/engineering/${id}.md`;
export function newFlow(): EngineeringFlow {
  return { revision: 0, reports: [], stages: Object.fromEntries(DISCIPLINES.map(d => [d.id, {
    objective: FLOW_SPEC[d.id].objective, status: 'todo', steps: FLOW_SPEC[d.id].steps.map((text, i) => ({ id: `${d.id}-${i + 1}`, text, done: false })),
  }])) as EngineeringFlow['stages'] };
}
export function validFlow(v: unknown): v is EngineeringFlow {
  if (!v || typeof v !== 'object') return false;
  const s = v as EngineeringFlow;
  return Number.isSafeInteger(s.revision) && s.revision >= 0 && !!s.stages && DISCIPLINES.every(d => {
    const t = s.stages[d.id];
    return t && typeof t.objective === 'string' && t.objective.length <= 2000 && ['todo', 'doing', 'review', 'done'].includes(t.status)
      && Array.isArray(t.steps) && t.steps.length >= 1 && t.steps.length <= 50 && new Set(t.steps.map(x => x?.id)).size === t.steps.length
      && (t.task === undefined || (typeof t.task === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(t.task)))
      && (t.leader === undefined || (typeof t.leader === 'string' && /^[a-f0-9]{12}$/.test(t.leader)))
      && t.steps.every(x => x && typeof x.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(x.id) && typeof x.text === 'string' && !!x.text.trim() && x.text.length <= 500 && typeof x.done === 'boolean');
  }) && Array.isArray(s.reports) && s.reports.length <= 200 && s.reports.every(r => r && typeof r.worker === 'string' && /^[a-f0-9]{12}$/.test(r.worker) && typeof r.task === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(r.task) && typeof r.summary === 'string' && r.summary.length <= 30000 && Number.isFinite(r.at));
}
