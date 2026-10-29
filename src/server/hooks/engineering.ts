import type http from 'node:http';
import type { Floor } from '../floor.js';
import type { WorkerInfo } from '../../shared/protocol.js';
import { disciplineOf, workerArtifacts, reportsFor } from '../engineering/team.js';
import { FlowStore } from '../engineering/flow.js';
import { FlowError } from '../engineering/files.js';
import { readBody, send } from '../http/util.js';

/** Uses the same worker-scoped hook token already checked by officeWorkers. */
export async function engineeringHook(floor: Floor, me: WorkerInfo, req: http.IncomingMessage, res: http.ServerResponse, action: string) {
  try {
    if (!me.engineering) throw new FlowError('Este agente não está associado a uma etapa', 403);
    if (action === '/reports' && req.method === 'GET') return send(res, 200, { reports: reportsFor(floor, me) });
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const body = JSON.parse(await readBody(req, 100000));
    if (action === '/artifact') {
      const id = disciplineOf(body.discipline);
      const worker = typeof body.worker === 'string' ? floor.workers.get(body.worker) : undefined;
      if (body.worker && (!worker || worker.engineering?.task !== me.engineering.task)) throw new FlowError('Artifact worker is not on your task', 403);
      return send(res, 200, workerArtifacts(floor, worker?.id).read(id));
    }
    if (action !== '/report') return send(res, 404, { error: 'Not found' });
    if (typeof body.summary !== 'string' || !body.summary.trim() || body.summary.length > 30000) throw new FlowError('Write a report of at most 30000 characters');
    if (me.engineering.role === 'lead' && !workerArtifacts(floor, me.id).read(me.engineering.discipline).exists) throw new FlowError('Grave o artefato canônico antes de submeter a entrega.');
    new FlowStore(floor.dir).report(me.engineering.discipline, me.id, me.engineering.task, body.summary, me.engineering.role === 'lead');
    return send(res, 200, { ok: true, review: me.engineering.role === 'lead' });
  } catch (e) { return send(res, e instanceof FlowError ? e.status : 400, { error: (e as Error).message }); }
}
