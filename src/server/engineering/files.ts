import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export class FlowError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
export function safePath(root: string, relative: string) {
  const parts = relative.split('/');
  if (parts.some(x => !x || x === '..' || x === '.' || x.includes('\\'))) throw new FlowError('Invalid artifact path');
  let at = path.resolve(root);
  for (const part of parts) {
    at = path.join(at, part);
    try { if (fs.lstatSync(at).isSymbolicLink()) throw new FlowError('Symbolic links are not supported', 403); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
  }
  return at;
}
export function readJson<T>(file: string, initial: () => T, valid: (v: unknown) => v is T): T {
  try {
    if (fs.lstatSync(file).isSymbolicLink()) throw new FlowError('Symbolic links are not supported', 403);
    const v: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!valid(v)) throw new FlowError('Saved workflow is invalid; preserved for recovery', 500);
    return v;
  } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return initial(); throw e; }
}
export function atomicWrite(file: string, text: string, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try { fs.writeFileSync(temp, text, { flag: 'wx', mode }); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
export function fileHash(text: string) { return createHash('sha256').update(text).digest('hex'); }
