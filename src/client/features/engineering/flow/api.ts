import type { DisciplineId } from '../../../../shared/engineering';
import type { EngineeringFlow } from '../../../../shared/engineering-flow';
export interface ArtifactMeta { path: string; exists: boolean; hash: string | null; candidate?: { exists: boolean; hash?: string | null; worker: string }; }
export interface FlowView { state: EngineeringFlow; artifacts: Record<DisciplineId, ArtifactMeta>; }
export interface ArtifactView { path: string; exists: boolean; hash: string | null; content: string; }
export async function flowRequest<T>(floor: string, endpoint: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/engineering/${endpoint}${endpoint.includes('?') ? '&' : '?'}floor=${encodeURIComponent(floor)}`, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json(); if (!res.ok) throw new Error(data.error ?? 'Não foi possível carregar o trabalho'); return data;
}
