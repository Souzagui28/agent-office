import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EngineeringWorkspace } from '../src/server/engineering.js';
import { DISCIPLINES, PROCESSES, engineeringArrival, initialEngineering, validEngineering } from '../src/shared/engineering.js';
import { blockerAt, groundAt } from '../src/client/player/collide.js';
import * as THREE from 'three';

function workspace(t: { after(fn: () => void): void }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, data: new EngineeringWorkspace(dir) };
}
test('workspace persists process and every discipline, including Unicode, across instances', t => {
  const { dir, data } = workspace(t);
  const state = data.read();
  state.notes.requirements = '# Bolsa\n\nInfluência × interesse e critérios de aceitação.';
  state.process = 'spiral'; state.phase = PROCESSES.spiral.phases[1];
  assert.equal(data.save(state)?.revision, 1);
  assert.deepEqual(new EngineeringWorkspace(dir).read(), { ...state, revision: 1 });
});
test('stale writers cannot overwrite another editors saved artifacts', t => {
  const { data } = workspace(t);
  const first = data.read(); const stale = data.read();
  first.notes.validation = 'Evidência aprovada'; data.save(first);
  stale.notes.validation = 'Texto antigo';
  assert.equal(data.save(stale), null);
  assert.equal(data.read().notes.validation, 'Evidência aprovada');
});
test('invalid and oversized payloads do not alter persisted work', t => {
  const { data } = workspace(t); const state = data.read(); data.save(state);
  for (const invalid of [null, { ...state, process: '__proto__' }, { ...state, phase: 'Inventada' }, { ...state, revision: -1 }, { ...state, notes: {} }, { ...state, objective: 'x'.repeat(2001) }]) {
    assert.equal(validEngineering(invalid), false);
    assert.throws(() => data.save(invalid));
  }
  const tooLong = data.read(); tooLong.notes.architecture = 'x'.repeat(50001);
  assert.throws(() => data.save(tooLong));
  assert.equal(data.read().revision, 1);
});
test('projects remain isolated and defaults are fresh instances', t => {
  const a = workspace(t); const b = workspace(t);
  const state = a.data.read(); state.notes.operations = 'Só projeto A'; a.data.save(state);
  assert.notEqual(b.data.read().notes.operations, state.notes.operations);
  assert.equal(initialEngineering().revision, 0);
});
test('corrupt state and symbolic links are not silently overwritten', t => {
  const { dir, data } = workspace(t);
  data.save(data.read());
  const file = path.join(dir, '.agent-office/engineering.json');
  fs.writeFileSync(file, 'broken'); assert.throws(() => data.read());
  fs.unlinkSync(file); fs.symlinkSync(path.join(dir, 'outside.json'), file);
  assert.throws(() => data.read()); assert.throws(() => data.save(initialEngineering()));
});
test('every instant arrival is on a distinct supported floor and clear of the tables', () => {
  const heights = new Set<number>();
  for (let i = 0; i < DISCIPLINES.length; i++) {
    const at = engineeringArrival(i); heights.add(at.y);
    assert.ok(at.y < 50, 'collision engine supports ground up to 50m');
    const floor = { minX: at.x - 8, maxX: at.x + 8, minZ: -6, maxZ: 6, bottom: at.y - 0.36, top: at.y };
    assert.equal(groundAt([floor], at.x, at.z, at.y), at.y);
    assert.equal(blockerAt({ pos: new THREE.Vector3(at.x, at.y, at.z), colliders: [floor], grounded: true, stepOffset: 0 }, at.x, at.z, at.y), null);
  }
  assert.equal(heights.size, DISCIPLINES.length);
  assert.throws(() => engineeringArrival(-1)); assert.throws(() => engineeringArrival(5));
});
