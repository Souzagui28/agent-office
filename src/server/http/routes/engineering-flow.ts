import { DISCIPLINES } from '../../../shared/engineering.js';
import { isAgentEffort, isAgentProvider } from '../../../shared/protocol.js';
import { FlowStore } from '../../engineering/flow.js';
import { ArtifactStore } from '../../engineering/artifacts.js';
import { FlowError } from '../../engineering/files.js';
import { disciplineOf, startLeader, workerArtifacts } from '../../engineering/team.js';
import { floorParam } from './files.js';
import { readBody, sameOrigin, send } from '../util.js';
import type { Route } from '../router.js';

export const engineeringFlowRoute: Route = {
  prefix: '/api/engineering/', auth: 'session',
  async handle(ctx, { req, res, url, path, session }) {
    try {
      const floor = floorParam(ctx, url);
      if (!floor) return send(res, 404, { error: 'No such project' });
      const flow = new FlowStore(floor.dir), root = new ArtifactStore(floor.dir);
      if (path === '/api/engineering/flow' && req.method === 'GET') {
        const state = flow.read();
        const artifacts = Object.fromEntries(DISCIPLINES.map(d => {
          const a = root.read(d.id), lead = state.stages[d.id].leader;
          let candidate;
          if (lead && floor.workers.get(lead)) {
            try { const c = workerArtifacts(floor, lead).read(d.id); candidate = { exists: c.exists, hash: c.hash, worker: lead }; }
            catch { candidate = { exists: false, worker: lead }; }
          }
          return [d.id, { path: a.path, exists: a.exists, hash: a.hash, candidate }];
        }));
        return send(res, 200, { state, artifacts }, { 'cache-control': 'no-store' });
      }
      if (path === '/api/engineering/artifact' && req.method === 'GET') {
        const id = disciplineOf(url.searchParams.get('discipline'));
        return send(res, 200, workerArtifacts(floor, url.searchParams.get('worker') ?? undefined).read(id), { 'cache-control': 'no-store' });
      }
      if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
      if (!sameOrigin(req, ctx.cfg)) return send(res, 403, { error: 'Forbidden' });
      let b;
      try { b = JSON.parse(await readBody(req, 300000)); } catch { throw new FlowError('Invalid JSON'); }
      if (!b || typeof b !== 'object' || Array.isArray(b)) throw new FlowError('Invalid request');
      const id = disciplineOf(b.discipline);
      if (path === '/api/engineering/team/start') {
        if (typeof b.prompt !== 'string' || !b.prompt.trim() || b.prompt.length > 12000) throw new FlowError('Descreva a tarefa em até 12000 caracteres');
        if (b.provider !== undefined && (!isAgentProvider(b.provider) || !floor.project.agentProviders.includes(b.provider))) throw new FlowError('Provider is not available');
        if (b.effort !== undefined && !isAgentEffort(b.effort)) throw new FlowError('Invalid reasoning effort');
        if (b.model !== undefined && (typeof b.model !== 'string' || b.model.length > 256)) throw new FlowError('Invalid model');
        const w = await startLeader(floor, { discipline: id, prompt: b.prompt, worktree: b.worktree === true, provider: b.provider, model: b.model, effort: b.effort }, session.account?.name ?? 'Você', session.account?.id);
        return send(res, 200, { worker: w });
      }
      if (path === '/api/engineering/flow') return send(res, 200, flow.edit(id, b.revision, b.objective, b.steps));
      if (path === '/api/engineering/artifact') {
        const result = root.write(id, b.content, b.hash);
        flow.invalidate(id);
        return send(res, 200, result);
      }
      if (path === '/api/engineering/approve') {
        const state = flow.read(), stage = state.stages[id];
        if (state.revision !== b.revision) throw new FlowError('O quadro mudou; reabra antes de aprovar', 409);
        if (stage.status !== 'review' || !stage.steps.every(s => s.done)) throw new FlowError('Revise a entrega e conclua o checklist antes de aprovar');
        if (b.worker && (b.worker !== stage.leader || floor.workers.get(b.worker)?.engineering?.task !== stage.task)) throw new FlowError('O candidato não é do chefe atual', 403);
        const candidate = workerArtifacts(floor, b.worker || undefined).read(id);
        if (!candidate.exists || candidate.hash !== b.sourceHash) throw new FlowError('A entrega mudou ou não existe. Abra o artefato e revise novamente.', 409);
        const current = root.read(id);
        if (current.hash !== b.rootHash) throw new FlowError('O artefato do projeto mudou; revise novamente.', 409);
        let revision = b.revision;
        if (candidate.hash !== current.hash) {
          root.write(id, candidate.content, current.hash);
          revision = flow.invalidate(id).revision;
        }
        return send(res, 200, flow.approve(id, revision, session.account?.name ?? 'Você'));
      }
      return send(res, 404, { error: 'Not found' });
    } catch (e) {
      return send(res, e instanceof FlowError ? e.status : 500, { error: e instanceof FlowError ? e.message : 'Não foi possível gravar ou carregar o trabalho. Os arquivos existentes foram preservados.' });
    }
  },
};
