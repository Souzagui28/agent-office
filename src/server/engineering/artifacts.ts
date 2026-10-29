import fs from 'node:fs';
import { artifactPath } from '../../shared/engineering-flow.js';
import { artifactTemplate } from '../../shared/engineering-templates.js';
import type { DisciplineId } from '../../shared/engineering.js';
import { atomicWrite, fileHash, FlowError, safePath } from './files.js';

export class ArtifactStore {
  constructor(readonly root: string) {}
  read(id: DisciplineId) {
    const relative = artifactPath(id), file = safePath(this.root, relative);
    let content: string | undefined;
    try {
      if (fs.statSync(file).size > 150000) throw new FlowError('Artifact exceeds the editor limit', 413);
      content = fs.readFileSync(file, 'utf8');
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    return { path: relative, exists: content !== undefined, content: content ?? artifactTemplate(id), hash: content === undefined ? null : fileHash(content) };
  }
  write(id: DisciplineId, content: unknown, expected: unknown) {
    if (typeof content !== 'string' || !content.trim() || Buffer.byteLength(content, 'utf8') > 150000) throw new FlowError('Write a non-empty artifact of at most 150 KB');
    const current = this.read(id);
    if (current.hash !== expected) throw new FlowError('O artefato mudou. Reabra antes de salvar para preservar a outra edição.', 409);
    const file = safePath(this.root, artifactPath(id));
    atomicWrite(file, content, 0o644);
    return this.read(id);
  }
}
