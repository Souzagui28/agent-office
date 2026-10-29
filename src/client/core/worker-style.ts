import type { WorkerInfo } from '../../shared/protocol';
import type { Worker } from '../world/character';
import type { DeskView } from '../world/types';

export interface WorkerStyle { frame(info: WorkerInfo, desk: DeskView, dt: number, t: number): void; }
type Factory = (model: Worker, info: WorkerInfo) => WorkerStyle | undefined;
const factories: Factory[] = [];
const styles = new WeakMap<Worker, WorkerStyle[]>();
/** Features decorate workers through this registry; desk controls and lifecycle stay shared. */
export function registerWorkerStyle(factory: Factory) { factories.push(factory); }
export function updateWorkerStyle(model: Worker, info: WorkerInfo, desk: DeskView, dt: number, t: number) {
  let entries = styles.get(model);
  if (!entries) { entries = factories.map(f => f(model, info)).filter((x): x is WorkerStyle => !!x); styles.set(model, entries); }
  for (const style of entries) style.frame(info, desk, dt, t);
}
