import test from 'node:test';
import assert from 'node:assert/strict';
import { HardwareSampler, diskReading } from '../src/server/hardware.js';

const disk = diskReading({ bsize: 4096, blocks: 1000, bfree: 300, bavail: 250 }, 4);

test('storage reports space available to the user without counting reserved blocks', () => {
  assert.deepEqual(disk, { total: 4096000, used: 2867200, available: 1024000, sampledAt: 4 });
});

test('storage sampling starts once and publishes no GPU telemetry', async (t) => {
  let reads = 0;
  const sampler = new HardwareSampler('/tmp', { disk: async () => { reads++; return disk; } });
  t.after(() => sampler.stop());
  sampler.start(); sampler.start();
  await new Promise(setImmediate);
  assert.equal(reads, 1);
  assert.deepEqual(sampler.snapshot(), { storage: disk, gpus: [], gpuStatus: 'unavailable' });
  sampler.snapshot().storage!.available = 0;
  assert.equal(sampler.snapshot().storage!.available, disk.available);
});

test('pending disk reads after stop cannot publish data', async () => {
  let resolve!: (value: typeof disk) => void;
  const sampler = new HardwareSampler('/tmp', { disk: () => new Promise((done) => { resolve = done; }) });
  sampler.start(); sampler.stop(); resolve(disk);
  await new Promise(setImmediate);
  assert.equal(sampler.snapshot().storage, undefined);
});

test('disk failure does not stop the office or invent readings', async (t) => {
  const sampler = new HardwareSampler('/missing', { disk: async () => { throw new Error('missing'); } });
  t.after(() => sampler.stop());
  sampler.start();
  await new Promise(setImmediate);
  assert.equal(sampler.snapshot().storage, undefined);
  assert.deepEqual(sampler.snapshot().gpus, []);
});
