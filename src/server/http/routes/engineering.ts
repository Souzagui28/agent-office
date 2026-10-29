import { EngineeringWorkspace } from '../../engineering.js';
import { validEngineering } from '../../../shared/engineering.js';
import { floorParam } from './files.js';
import { readBody, sameOrigin, send } from '../util.js';
import type { Route } from '../router.js';

export const engineeringRoute: Route = {
  path: '/api/engineering', auth: 'session',
  async handle(ctx, { req, res, url }) {
    const floor = floorParam(ctx, url);
    if (!floor) return send(res, 404, { error: 'No such project' });
    const workspace = new EngineeringWorkspace(floor.dir);
    if (req.method === 'GET') return send(res, 200, workspace.read(), { 'cache-control': 'no-store' });
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!sameOrigin(req, ctx.cfg)) return send(res, 403, { error: 'Forbidden' });
    let body: unknown;
    try { body = JSON.parse(await readBody(req, 1100000)); }
    catch { return send(res, 400, { error: 'Invalid or oversized workspace' }); }
    if (!validEngineering(body)) return send(res, 400, { error: 'Invalid workspace' });
    const saved = workspace.save(body);
    return saved ? send(res, 200, saved) : send(res, 409, { error: 'Outro editor salvou alterações. Exporte seu rascunho e recarregue a página para carregar a versão atual.' });
  },
};
