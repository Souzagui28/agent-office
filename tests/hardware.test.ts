import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { HardwareSampler, csvFields, diskReading, parseGpuLine } from '../src/server/hardware.js';

const reading = '0, NVIDIA GeForce RTX 3080, 3, 1303, 10240, 52, 101.33, 340.00, 53';

test('parses the RTX 3080 query into independently typed metrics with byte sizes', () => {
  const gpu = parseGpuLine(reading, 123)!;
  assert.equal(gpu.name, 'NVIDIA GeForce RTX 3080');
  assert.equal(gpu.utilization, 3);
  assert.equal(gpu.memoryUsed, 1303 * 2 ** 20);
  assert.equal(gpu.memoryTotal, 10 * 2 ** 30);
  assert.equal(gpu.temperature, 52);
  assert.equal(gpu.powerDraw, 101.33);
  assert.equal(gpu.powerLimit, 340);
  assert.equal(gpu.fan, 53);
  assert.equal(gpu.sampledAt, 123);
});

test('unsupported metrics remain unavailable rather than becoming zero or NaN', () => {
  const gpu = parseGpuLine('1, Test GPU, N/A, [Not Supported], 8192, N/A, N/A, N/A, N/A', 0)!;
  assert.equal(gpu.utilization, undefined);
  assert.equal(gpu.memoryUsed, undefined);
  assert.equal(gpu.temperature, undefined);
  assert.equal(gpu.memoryTotal, 8192 * 2 ** 20);
  assert.equal(gpu.fan, undefined);
  assert.equal(parseGpuLine('driver error', 0), undefined);
  assert.equal(parseGpuLine('-1, GPU, 0, 0, 0, 0, 0, 0, 0', 0), undefined);
  assert.equal(parseGpuLine('0, GPU, 999, 0, 0, 0, 0, 0, 500', 0)!.utilization, undefined);
});

test('CSV model names with commas and quotes do not shift the numeric columns', () => {
  assert.deepEqual(csvFields('1, "GPU, \'edition\'", 90'), ['1', "GPU, 'edition'", '90']);
  assert.equal(parseGpuLine('0, "GPU, ""Pro""", 5, 1, 4, 40, 12, 99, 0', 0)!.name, 'GPU, "Pro"');
});

test('storage reports space available to the user without counting reserved blocks', () => {
  assert.deepEqual(diskReading({ bsize: 4096, blocks: 1000, bfree: 300, bavail: 250 }, 4), {
    total: 4096000, used: 2867200, available: 1024000, sampledAt: 4,
  });
});

class FakeGpu extends EventEmitter {
  stdout = new PassThrough();
  killed = false;
  kill() { this.killed = true; this.emit('close', 0); return true; }
}

test('one persistent collector handles chunked multi-GPU output and releases its process', async (t) => {
  const gpu = new FakeGpu();
  let starts = 0, now = 1000;
  const disk = diskReading({ bsize: 1, blocks: 100, bfree: 30, bavail: 20 }, now);
  const sampler = new HardwareSampler('/tmp', { gpu: () => { starts++; return gpu; }, disk: async () => disk, now: () => now });
  t.after(() => sampler.stop());
  sampler.start(); sampler.start();
  gpu.stdout.write(reading.slice(0, 30));
  assert.deepEqual(sampler.snapshot().gpus, []);
  gpu.stdout.write(reading.slice(30) + '\n' + reading.replace(/^0,/, '1,') + '\n');
  await new Promise(setImmediate);
  assert.equal(starts, 1);
  assert.equal(sampler.snapshot().gpus.length, 2);
  assert.equal(sampler.snapshot().storage?.available, 20);
  assert.equal(sampler.snapshot().gpuStatus, 'live');
  now += 4000;
  assert.equal(sampler.snapshot().gpuStatus, 'stale');
  sampler.stop();
  assert.equal(gpu.killed, true);
  gpu.stdout.write(reading + '\n');
  assert.equal(sampler.snapshot().gpus[0].sampledAt, 1000, 'stopped collectors ignore later output');
});

test('missing nvidia-smi and disk failures do not stop the office or invent readings', async (t) => {
  const gpu = new FakeGpu();
  const sampler = new HardwareSampler('/missing', { gpu: () => gpu, disk: async () => { throw new Error('missing'); } });
  t.after(() => sampler.stop());
  sampler.start();
  gpu.emit('error', new Error('ENOENT'));
  await new Promise(setImmediate);
  assert.equal(sampler.snapshot().gpuStatus, 'unavailable');
  assert.equal(sampler.snapshot().storage, undefined);
});
