/** Disciplines stay stable while the selected lifecycle and its phases change. */
export const PROCESSES = {
  unified: { name: 'Processo Unificado · adaptação leve', phases: ['Concepção', 'Elaboração', 'Construção', 'Transição'] },
  iterative: { name: 'Iterativo e incremental', phases: ['Planejamento da iteração', 'Desenvolvimento', 'Avaliação do incremento'] },
  waterfall: { name: 'Cascata', phases: ['Requisitos', 'Design', 'Implementação', 'Testes', 'Implantação'] },
  spiral: { name: 'Espiral', phases: ['Objetivos e alternativas', 'Análise de riscos', 'Desenvolvimento e validação', 'Planejamento do próximo ciclo'] },
} as const;
export type ProcessId = keyof typeof PROCESSES;
export const DISCIPLINES = [
  { id: 'requirements', name: 'Engenharia de Requisitos', short: 'Requisitos', icon: '📋', color: '#40a878', agent: 'Clara', role: 'Analista de requisitos', personality: 'Escuta com calma e transforma pedidos vagos em exemplos e critérios claros.', artifacts: ['Stakeholders e necessidades', 'Influência × interesse', 'Casos de uso e aceitação'] },
  { id: 'architecture', name: 'Arquitetura e Design de Software', short: 'Arquitetura', icon: '📐', color: '#4f7fe0', agent: 'Atlas', role: 'Arquiteto de software', personality: 'Pondera alternativas e explica custos antes de escolher uma arquitetura.', artifacts: ['Drivers e atributos de qualidade', 'C4, dados e modelo ER', 'Decisões arquiteturais · ADR'] },
  { id: 'implementation', name: 'Implementação', short: 'Implementação', icon: '🛠', color: '#9470e0', agent: 'Pixel', role: 'Engenheiro de software', personality: 'Curioso e mão na massa: prefere um protótipo pequeno que possa executar.', artifacts: ['Plano do incremento', 'Protótipos e referências', 'Issues, branches e PRs'] },
  { id: 'validation', name: 'Verificação e Validação', short: 'Testes', icon: '🧪', color: '#dcaa16', agent: 'Vera', role: 'Engenheira de testes', personality: 'Cética e bem-humorada: procura contraexemplos e pede evidências.', artifacts: ['Plano e casos de teste', 'Evidências e defeitos', 'Validação com a fabricante'] },
  { id: 'operations', name: 'Implantação e Operação', short: 'Operação', icon: '🚀', color: '#ea7352', agent: 'Nilo', role: 'Engenheiro de operação', personality: 'Calmo e preventivo: planeja custos, observação e recuperação.', artifacts: ['Execução e configuração', 'Custos e observabilidade', 'Versões e recuperação'] },
] as const;
export type DisciplineId = typeof DISCIPLINES[number]['id'];
export interface EngineeringState {
  revision: number;
  process: ProcessId;
  phase: string;
  iteration: string;
  objective: string;
  risk: string;
  notes: Record<DisciplineId, string>;
}
export function initialEngineering(): EngineeringState {
  return { revision: 0, process: 'unified', phase: 'Concepção', iteration: '1',
    objective: 'Avaliar design visual e modelo 3D aproximado de uma bolsa a partir de uma imagem e medidas.',
    risk: 'Uma imagem não revela todas as dimensões e faces. Registrar suposições e validar com a fabricante.',
    notes: Object.fromEntries(DISCIPLINES.map(d => [d.id, `# ${d.name}\n\n${d.artifacts.map(a => `## ${a}\n\nA preencher.\n`).join('\n')}\n## Definição de pronto\n\n- [ ] Definir uma evidência de conclusão.\n`])) as Record<DisciplineId, string> };
}
/** No silent truncation: invalid payloads must not replace saved work. */
export function validEngineering(v: unknown): v is EngineeringState {
  if (!v || typeof v !== 'object') return false;
  const s = v as EngineeringState;
  if (!Number.isSafeInteger(s.revision) || s.revision < 0 || !Object.hasOwn(PROCESSES, s.process)) return false;
  if (!(PROCESSES[s.process].phases as readonly string[]).includes(s.phase)) return false;
  if (![s.iteration, s.objective, s.risk].every(x => typeof x === 'string' && x.length <= 2000)) return false;
  return !!s.notes && DISCIPLINES.every(d => typeof s.notes[d.id] === 'string' && s.notes[d.id].length <= 50000);
}
/** Sectors use the original office pods and service area. Project floors are unchanged. */
export const ENGINEERING_ZONES = [
  { x: -10.5, z: -4, rotY: 0, minX: -16, maxX: -6.5, minZ: -9, maxZ: -1.3, arrival: { x: -10.5, z: -1.5, rotY: Math.PI } },
  { x: -1.5, z: -4, rotY: 0, minX: -5.5, maxX: 4.2, minZ: -9, maxZ: -1.3, arrival: { x: -1.5, z: -1.5, rotY: Math.PI } },
  { x: -10.5, z: 4, rotY: Math.PI, minX: -16, maxX: -6.5, minZ: 1.3, maxZ: 9, arrival: { x: -10.5, z: 1.5, rotY: 0 } },
  { x: -1.5, z: 4, rotY: Math.PI, minX: -5.5, maxX: 4.2, minZ: 1.3, maxZ: 9, arrival: { x: -1.5, z: 1.5, rotY: 0 } },
  { x: 13, z: -7, rotY: 0, minX: 9, maxX: 16.5, minZ: -11, maxZ: -3, arrival: { x: 13, z: -3.5, rotY: Math.PI } },
] as const;
export function engineeringArrival(index: number): { x: number; y: number; z: number; rotY: number } {
  if (!Number.isInteger(index) || index < 0 || index >= DISCIPLINES.length) throw new RangeError('Unknown discipline sector');
  return { ...ENGINEERING_ZONES[index].arrival, y: 0 };
}
export function engineeringZoneAt(x: number, y: number, z: number): number {
  if (y < -0.2 || y > 1.8) return -1;
  return ENGINEERING_ZONES.findIndex(b => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);
}
