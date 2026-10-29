// Engineering task tools share the existing per-worker hook identity and transport.
export const ENGINEERING_PATHS = { reports: '/reports', report: '/report', artifact: '/artifact' };
export const ENGINEERING_TOOLS = [
  { name: 'list_reports', title: 'Read team reports', description: 'Read reports submitted by the chief and helpers on your engineering task. Use this to consolidate delegated work.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: 'report_work', title: 'Submit engineering work', description: 'Submit your actual result and evidence to the task. A helper reports to its chief. A chief must first write the canonical artifact; its report requests human review and does not approve the stage.', inputSchema: { type: 'object', properties: { summary: { type: 'string', maxLength: 30000 } }, required: ['summary'], additionalProperties: false }, annotations: { destructiveHint: false, openWorldHint: false } },
  { name: 'read_stage_artifact', title: 'Read stage artifact', description: 'Read a canonical engineering artifact from the project, or a worker on your own task. Use worker to read a helper delivery in a separate worktree.', inputSchema: { type: 'object', properties: { discipline: { type: 'string', enum: ['requirements', 'architecture', 'implementation', 'validation', 'operations'] }, worker: { type: 'string' } }, required: ['discipline'], additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } },
];
export function parseEngineeringArgs(argv) {
  const [cmd, ...args] = argv;
  if (!['reports', 'report', 'artifact'].includes(cmd)) return undefined;
  if (cmd === 'reports') { if (args.some(a => a !== '--json')) throw new Error('reports takes no arguments'); return { cmd }; }
  if (cmd === 'report') {
    if (!args.length) return { cmd };
    if (args.length === 2 && ['--summary', '--prompt'].includes(args[0])) return { cmd, prompt: args[1] };
    throw new Error('report reads its summary from stdin or --summary');
  }
  const [discipline, ...rest] = args;
  if (!discipline || (rest.length && (rest.length !== 2 || rest[0] !== '--worker'))) throw new Error('artifact <discipline> [--worker <id>]');
  return { cmd, discipline, ...(rest.length ? { worker: rest[1] } : {}) };
}
export async function engineeringTool(name, args, call, io) {
  const method = { list_reports: 'reports', report_work: 'report', read_stage_artifact: 'artifact' }[name];
  if (!method) return undefined;
  return { text: JSON.stringify(await call(method, method === 'reports' ? undefined : args, io), null, 1) };
}
