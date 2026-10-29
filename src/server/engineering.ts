import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { initialEngineering, validEngineering, type EngineeringState } from '../shared/engineering.js';

/** One state file per project; revision checks protect edits from other windows. */
export class EngineeringWorkspace {
  private file: string;
  constructor(dir: string) { this.file = path.join(dir, '.agent-office', 'engineering.json'); }
  read(): EngineeringState {
    try {
      if (fs.lstatSync(path.dirname(this.file)).isSymbolicLink()) throw new Error('Workspace symlinks are not supported');
      if (fs.lstatSync(this.file).isSymbolicLink()) throw new Error('Workspace symlinks are not supported');
      const state: unknown = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (!validEngineering(state)) throw new Error('Invalid engineering workspace');
      return state;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return initialEngineering();
      throw e;
    }
  }
  save(value: unknown): EngineeringState | null {
    if (!validEngineering(value)) throw new Error('Invalid engineering workspace');
    const current = this.read();
    if (value.revision !== current.revision) return null;
    const state = { ...value, revision: current.revision + 1 };
    const dir = path.dirname(this.file);
    fs.mkdirSync(dir, { recursive: true });
    if (fs.lstatSync(dir).isSymbolicLink()) throw new Error('Workspace symlinks are not supported');
    const temp = `${this.file}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temp, JSON.stringify(state, null, 2), { flag: 'wx', mode: 0o600 });
      fs.renameSync(temp, this.file);
    } finally {
      if (fs.existsSync(temp)) fs.unlinkSync(temp);
    }
    return state;
  }
}
