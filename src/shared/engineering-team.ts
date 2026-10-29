import { DISCIPLINES, type DisciplineId } from './engineering.js';

export interface EngineeringAssignment {
  discipline: DisciplineId;
  role: 'lead' | 'member';
  task: string;
  parent?: string;
  sequence?: number;
}
export const MAX_ENGINEERING_HELPERS = 3;
export function validAssignment(v: unknown): v is EngineeringAssignment {
  if (!v || typeof v !== 'object') return false;
  const a = v as EngineeringAssignment;
  if (!DISCIPLINES.some(d => d.id === a.discipline) || !/^[a-zA-Z0-9_-]{1,80}$/.test(a.task ?? '')) return false;
  return a.role === 'lead' ? a.parent === undefined : a.role === 'member' && /^[a-f0-9]{12}$/.test(a.parent ?? '') && Number.isSafeInteger(a.sequence) && a.sequence! > 0 && a.sequence! <= 999;
}
export function engineeringIdentity(a: unknown) {
  if (!validAssignment(a)) return undefined;
  const d = DISCIPLINES.find(d => d.id === a.discipline)!;
  return { assignment: a, name: a.role === 'lead' ? d.agent : `${d.agent}-${a.sequence}`, color: d.color };
}
/** The four existing desk pods, plus the nearest desks for the operation sector. */
export const SECTOR_DESKS = [
  ['desk-1', 'desk-2', 'desk-3', 'desk-4'], ['desk-5', 'desk-6', 'desk-7', 'desk-8'],
  ['desk-9', 'desk-10', 'desk-11', 'desk-12'], ['desk-13', 'desk-14', 'desk-15', 'desk-16'],
  ['desk-8', 'desk-7', 'desk-6', 'desk-5'],
];

export function uniqueEngineeringName(base: string, used: Set<string>) {
  let name = base, n = 2;
  while (used.has(name)) name = `${base}-${n++}`;
  return name;
}
