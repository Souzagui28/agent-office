import { statfs } from 'node:fs/promises';
import type { GpuState, StorageState } from '../shared/protocol.js';

const DISK_MS = 30_000;
interface Dependencies {
  disk(): Promise<StorageState>;
}

export function diskReading(s: { bsize: number; blocks: number; bfree: number; bavail: number }, sampledAt: number): StorageState {
  return { total: s.blocks * s.bsize, used: Math.max(0, (s.blocks - s.bfree) * s.bsize), available: Math.max(0, s.bavail * s.bsize), sampledAt };
}

/** Storage only: GPU polling was removed after host kernel lockups. */
export class HardwareSampler {
  private deps: Dependencies;
  private timer?: NodeJS.Timeout;
  private stopped = true;
  private storage?: StorageState;
  private diskBusy = false;

  constructor(dir: string, deps: Partial<Dependencies> = {}) {
    this.deps = { disk: async () => diskReading(await statfs(dir), Date.now()), ...deps };
  }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    void this.readDisk();
    this.timer = setInterval(() => { void this.readDisk(); }, DISK_MS);
    this.timer.unref();
  }

  stop() {
    this.stopped = true;
    clearInterval(this.timer);
  }

  snapshot() {
    return { storage: this.storage && { ...this.storage }, gpus: [] as GpuState[], gpuStatus: 'unavailable' } as const;
  }

  private async readDisk() {
    if (this.stopped || this.diskBusy) return;
    this.diskBusy = true;
    try { const storage = await this.deps.disk(); if (!this.stopped) this.storage = storage; }
    catch { /* An unsupported or missing filesystem is unavailable, not zero free space. */ }
    finally { this.diskBusy = false; }
  }
}
