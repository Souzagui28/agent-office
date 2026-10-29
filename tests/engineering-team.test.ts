import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Floor } from '../src/server/floor.js';
import type { WorkerInfo } from '../src/shared/protocol.js';
import { FlowStore } from '../src/server/engineering/flow.js';
import { ArtifactStore } from '../src/server/engineering/artifacts.js';
import { safePath } from '../src/server/engineering/files.js';
import { delegate, startLeader, reportsFor, workerArtifacts } from '../src/server/engineering/team.js';
import { engineeringIdentity, uniqueEngineeringName, validAssignment } from '../src/shared/engineering-team.js';
import { newFlow, validFlow } from '../src/shared/engineering-flow.js';
import { artifactTemplate } from '../src/shared/engineering-templates.js';
import { DISCIPLINES } from '../src/shared/engineering.js';
import { saveWorkers, restoreWorkers } from '../src/server/workers/persist.js';
import { newWorker } from '../src/server/workers/worker.js';
import { restoreTracker } from '../src/server/usage.js';
import { parseArgs, buildRequest, handleMcp } from '../bin/office-workers.js';

function fixture(t: { after(fn: () => void): void }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-team-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, flow: new FlowStore(dir), artifacts: new ArtifactStore(dir) };
}
function mockFloor(dir: string) {
  const list: WorkerInfo[] = [], calls: unknown[][] = [];
  const workers = {
    list: () => list, get: (id: string) => list.find(w => w.id === id),
    deskOccupied: (id: string) => list.some(w => w.deskId === id),
    fetchBase: async () => {}, ownerOf: () => 'owner-1',
    owners: () => list.map(w => ({ workerId: w.id, cwd: dir })),
    spawn(...args: any[]) {
      calls.push(args);
      const identity = engineeringIdentity(args[12])!;
      const w = { id: (list.length + 1).toString(16).padStart(12, '0'), name: identity.name, deskId: args[0], engineering: identity.assignment, provider: args[5] ?? 'codex', model: args[6], effort: args[7] } as WorkerInfo;
      list.push(w); return w;
    },
  };
  const floor = { dir, workers, plan: { wing: 0 }, project: { agentProviders: ['codex'], branch: undefined } } as unknown as Floor;
  return { floor, list, calls };
}

test('chiefs and helpers keep identity, task, provider and owner through normal worker spawning', async t => {
  const { dir, flow } = fixture(t), { floor, calls } = mockFloor(dir);
  const lead = await startLeader(floor, { discipline: 'requirements', prompt: 'Identificar riscos', worktree: false, provider: 'codex', model: 'gpt-test', effort: 'high' }, 'Usuário', 'owner-1');
  assert.equal(lead.name, 'Clara');
  assert.equal(flow.read().stages.requirements.leader, lead.id);
  assert.equal(calls[0][9], 'owner-1');
  assert.match(String(calls[0][2]), /Não declare aprovação/);
  await assert.rejects(startLeader(floor, { discipline: 'requirements', prompt: 'duplicate', worktree: false }, 'User'), /já tem uma sessão/);
  const helper = await delegate(floor, lead, { prompt: 'Enumerar dúvidas', worktree: false });
  assert.deepEqual(helper.engineering, { discipline: 'requirements', role: 'member', task: lead.engineering!.task, parent: lead.id, sequence: 1 });
  assert.equal(helper.name, 'Clara-1');
  assert.equal(helper.deskId, 'desk-2');
  assert.equal(helper.model, 'gpt-test'); assert.equal(helper.effort, 'high');
  assert.equal(calls[1][9], 'owner-1');
  assert.match(String(calls[1][2]), /Não contrate outros agentes/);
  await assert.rejects(delegate(floor, helper, { prompt: 'nested' }), /Somente o chefe/);
  await delegate(floor, lead, { prompt: 'Second', worktree: false });
  await delegate(floor, lead, { prompt: 'Third', worktree: false });
  await assert.rejects(delegate(floor, lead, { prompt: 'Fourth' }), /Limite de 3/);
  assert.equal(calls.length, 4);
  flow.start('requirements', lead.id, 'replacement');
  await assert.rejects(delegate(floor, lead, { prompt: 'stale' }), /substituída/);
});

test('simultaneous worktree starts recheck ownership after fetch', async t => {
  const { dir } = fixture(t), { floor, calls } = mockFloor(dir);
  const ask = { discipline: 'validation', prompt: 'Testar', worktree: true } as const;
  const results = await Promise.allSettled([startLeader(floor, ask, 'A'), startLeader(floor, ask, 'B')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(calls.length, 1);
});

test('reports remain task scoped, revision protected and subject to explicit human approval', async t => {
  const { dir, flow } = fixture(t), { floor, list } = mockFloor(dir);
  const lead = await startLeader(floor, { discipline: 'validation', prompt: 'Verificar', worktree: false }, 'User');
  const helper = await delegate(floor, lead, { prompt: 'TC-01', worktree: false });
  flow.report('validation', helper.id, lead.engineering!.task, 'TC-01 não executado; falta ambiente', false);
  assert.equal(flow.read().stages.validation.status, 'doing');
  flow.report('validation', lead.id, lead.engineering!.task, 'Resultado consolidado; revisão necessária', true);
  assert.equal(flow.read().stages.validation.status, 'review');
  assert.equal(reportsFor(floor, lead).length, 2);
  assert.throws(() => flow.approve('validation', flow.read().revision, 'User'), /passos/);
  const state = flow.read();
  const edited = flow.edit('validation', state.revision, state.stages.validation.objective, state.stages.validation.steps.map(s => ({ ...s, done: true })));
  assert.throws(() => flow.approve('validation', state.revision, 'User'), /mudou/);
  const approved = flow.approve('validation', edited.revision, 'User');
  assert.equal(approved.stages.validation.approvedBy, 'User');
  assert.ok(approved.stages.validation.approvedAt);
  flow.start('validation', lead.id, 'next-task');
  assert.ok(flow.read().stages.validation.steps.every(s => !s.done));
  assert.throws(() => flow.report('validation', helper.id, lead.engineering!.task, 'old report', false), /older task/);
  list[0].engineering!.task = 'next-task';
  assert.equal(reportsFor(floor, lead).length, 0);
});

test('upstream artifact changes reopen approved consumers transitively', t => {
  const { flow } = fixture(t);
  const state = flow.read();
  for (const stage of Object.values(state.stages)) { stage.status = 'done'; stage.approvedBy = 'User'; stage.approvedAt = 1; }
  flow.save(state, 0);
  const invalidated = flow.invalidate('requirements');
  assert.ok(Object.values(invalidated.stages).every(s => s.status === 'review' && !s.approvedBy && !s.approvedAt));
});

test('canonical artifacts protect other edits, projects, sizes and filesystem boundaries', t => {
  const { dir, artifacts } = fixture(t);
  const missing = artifacts.read('requirements');
  assert.equal(missing.exists, false); assert.match(missing.content, /RF/);
  const first = artifacts.write('requirements', '# Requisitos\nRF-01', missing.hash);
  assert.throws(() => artifacts.write('requirements', '# stale', null), /mudou/);
  assert.equal(new ArtifactStore(dir).read('requirements').content, first.content);
  assert.throws(() => artifacts.write('requirements', 'x'.repeat(150001), first.hash), /150 KB/);
  for (const relative of ['../outside', '/tmp/outside', 'docs/../outside', 'docs\\outside']) assert.throws(() => safePath(dir, relative));
  fs.symlinkSync(dir, path.join(dir, 'linked'));
  assert.throws(() => safePath(dir, 'linked/file'), /Symbolic/);
  const { floor } = mockFloor(dir);
  assert.throws(() => workerArtifacts(floor, '../unknown'), /No such worker/);
  assert.equal(artifacts.read('architecture').exists, false);
});

test('corrupt state, malicious steps and stale writers never silently replace workflow', t => {
  const { dir, flow } = fixture(t);
  const state = flow.read(); flow.save(state, 0);
  assert.throws(() => flow.save(newFlow(), 0), /mudou/);
  assert.equal(validFlow({ ...state, reports: [{ worker: 'fake', task: 't', summary: 'x', at: 1 }] }), false);
  const invalid = newFlow(); invalid.stages.requirements.steps = [null as any];
  assert.equal(validFlow(invalid), false);
  fs.writeFileSync(path.join(dir, '.agent-office/engineering-flow.json'), 'corrupt');
  assert.throws(() => flow.read());
  assert.throws(() => flow.save(newFlow(), 0));
  assert.equal(fs.readFileSync(path.join(dir, '.agent-office/engineering-flow.json'), 'utf8'), 'corrupt');
});

test('templates link consumed artifacts and keep test cases and evidence in one source', () => {
  for (const d of DISCIPLINES) assert.ok(artifactTemplate(d.id).length > 100);
  assert.match(artifactTemplate('validation'), /US/);
  assert.match(artifactTemplate('validation'), /RF/);
  assert.match(artifactTemplate('architecture'), /requirements\.md/);
  assert.equal(validAssignment({ discipline: 'requirements', role: 'member', parent: 'bad', task: 'task', sequence: 1 }), false);
  assert.equal(uniqueEngineeringName('Pixel', new Set(['Pixel', 'Pixel-2'])), 'Pixel-3');
});

test('engineering MCP tools reuse worker-authenticated transport and report CLI reads explicit summary', async () => {
  assert.deepEqual(parseArgs(['report', '--help']), { cmd: 'help' });
  assert.deepEqual(parseArgs(['report', '--summary', 'Evidence']), { cmd: 'report', prompt: 'Evidence' });
  assert.deepEqual(parseArgs(['artifact', 'requirements', '--worker', '000000000002']), { cmd: 'artifact', discipline: 'requirements', worker: '000000000002' });
  const office = { url: 'http://localhost:4600', worker: '000000000001', token: 'test' };
  assert.equal(buildRequest('reports', office).method, 'GET');
  assert.match(buildRequest('report', office, { summary: 'Evidence' }).url, /\/report\?worker=/);
  const calls: RequestInit[] = [];
  const result = await handleMcp({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'report_work', arguments: { summary: 'TC-01 failed; attached evidence' } } }, {
    env: { AGENT_OFFICE_HOOK_URL: office.url, AGENT_OFFICE_WORKER_ID: office.worker, AGENT_OFFICE_HOOK_TOKEN: office.token },
    fetch: async (_: unknown, init: RequestInit) => { calls.push(init); return new Response(JSON.stringify({ ok: true, review: true })); },
  });
  assert.equal(result?.result.isError, undefined);
  assert.deepEqual(JSON.parse(String(calls[0].body)), { summary: 'TC-01 failed; attached evidence' });
});


test('saved chiefs and helpers restore assignment and hook identity after a restart', async t => {
  const { dir } = fixture(t), { floor, list } = mockFloor(dir);
  const chief = await startLeader(floor, { discipline: 'architecture', prompt: 'Compare drivers', worktree: false }, 'User');
  await delegate(floor, chief, { prompt: 'Compare storage', worktree: false });
  const file = path.join(dir, 'workers.json');
  const records = list.map(info => newWorker({ ...info, kind: 'agent', color: '#fff', status: 'idle', createdAt: 1, createdBy: 'User', cols: 80, rows: 24, viewers: [], acked: true }, restoreTracker(undefined), `token-${info.id}`));
  saveWorkers(file, records, false);
  const restored = new Map();
  restoreWorkers(file, restored, 'codex', () => false);
  assert.equal(restored.size, 2);
  for (const w of records) {
    assert.deepEqual(restored.get(w.info.id).info.engineering, w.info.engineering);
    assert.equal(restored.get(w.info.id).hookToken, w.hookToken);
  }
});
