import { spawn, type ChildProcess } from 'node:child_process';
import { statfs } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import type { GpuState, StorageState } from '../shared/protocol.js';

const DISK_MS = 30_000;
const STALE_MS = 3_000;
const QUERY = 'index,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,power.limit,fan.speed';
type GpuProcess = Pick<ChildProcess, 'on' | 'kill'> & { stdout: Readable | null };
interface Dependencies {
  gpu(): GpuProcess;
  disk(): Promise<StorageState>;
  now(): number;
}

/** Small CSV reader: GPU model names may contain quoted commas. */
export function csvFields(line: string): string[] {
  const fields: string[] = [];
  let field = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && quoted && line[i + 1] === '"') { field += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) { fields.push(field.trim()); field = ''; }
    else field += ch;
  }
  fields.push(field.trim());
  return fields;
}

export function parseGpuLine(line: string, sampledAt: number): GpuState | undefined {
  const fields = csvFields(line);
  if (fields.length !== 9 || !/^\d+$/.test(fields[0]) || !fields[1]) return undefined;
  const number = (i: number, max = Infinity) => {
    if (!/^\d+(?:\.\d+)?$/.test(fields[i])) return undefined;
    const value = Number(fields[i]);
    return Number.isFinite(value) && value <= max ? value : undefined;
  };
  const memory = (i: number) => { const value = number(i); return value === undefined ? undefined : value * 2 ** 20; };
  return {
    index: Number(fields[0]), name: fields[1], utilization: number(2, 100),
    memoryUsed: memory(3), memoryTotal: memory(4), temperature: number(5, 150),
    powerDraw: number(6), powerLimit: number(7), fan: number(8, 100), sampledAt,
  };
}

export function diskReading(s: { bsize: number; blocks: number; bfree: number; bavail: number }, sampledAt: number): StorageState {
  return { total: s.blocks * s.bsize, used: Math.max(0, (s.blocks - s.bfree) * s.bsize), available: Math.max(0, s.bavail * s.bsize), sampledAt };
}

/** One persistent nvidia-smi process, never a new command every frame or every client. */
export class HardwareSampler {
  private deps: Dependencies;
  private process?: GpuProcess;
  private timer?: NodeJS.Timeout;
  private stopped = true;
  private storage?: StorageState;
  private gpus = new Map<number, GpuState>();
  private diskBusy = false;

  constructor(dir: string, deps: Partial<Dependencies> = {}) {
    this.deps = {
      gpu: () => spawn('nvidia-smi', [`--query-gpu=${QUERY}`, '--format=csv,noheader,nounits', '--loop-ms=500'], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }),
      disk: async () => diskReading(await statfs(dir), Date.now()),
      now: Date.now,
      ...deps,
    };
  }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.startGpu();
    void this.readDisk();
    this.timer = setInterval(() => { void this.readDisk(); this.startGpu(); }, DISK_MS);
    this.timer.unref();
  }

  stop() {
    this.stopped = true;
    clearInterval(this.timer);
    this.process?.kill();
    this.process = undefined;
  }

  snapshot() {
    const now = this.deps.now();
    const gpus = [...this.gpus.values()].sort((a, b) => a.index - b.index).map((gpu) => ({ ...gpu }));
    const gpuStatus = !gpus.length ? 'unavailable' : this.process && gpus.every((gpu) => now - gpu.sampledAt <= STALE_MS) ? 'live' : 'stale';
    return { storage: this.storage && { ...this.storage }, gpus, gpuStatus } as const;
  }

  private startGpu() {
    if (this.stopped || this.process) return;
    let child: GpuProcess;
    try { child = this.deps.gpu(); } catch { return; }
    this.process = child;
    let buffer = '';
    child.stdout?.on('data', (chunk: Buffer | string) => {
      if (this.stopped || this.process !== child) return;
      buffer += String(chunk);
      if (buffer.length > 65_536) { buffer = ''; return; }
      let end: number;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
        const gpu = parseGpuLine(line, this.deps.now());
        if (gpu) this.gpus.set(gpu.index, gpu);
      }
    });
    const ended = () => { if (this.process === child) this.process = undefined; };
    child.on('error', ended);
    child.on('close', ended);
  }

  private async readDisk() {
    if (this.stopped || this.diskBusy) return;
    this.diskBusy = true;
    try { const storage = await this.deps.disk(); if (!this.stopped) this.storage = storage; }
    catch { /* An unsupported or missing filesystem is unavailable, not zero free space. */ }
    finally { this.diskBusy = false; }
  }
}
