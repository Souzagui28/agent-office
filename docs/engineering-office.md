# Engineering studio

Back to the [README](../README.md).

## One project per floor

The existing building, exterior, elevator, floor dimensions (36 × 26 m), desk pods,
meeting room, lounge and worker desks are preserved. Five open engineering sectors
share each project's floor. There is no separate annex, no miniature replacement
room and no extra storey for a discipline.

| Sector | Furnishings | Stage specialist |
| --- | --- | --- |
| Requirements | Cork stakeholder board, notes, conversation table and stools | Clara: glasses, bun, scarf and clipboard; reading and note-taking gestures |
| Architecture and software design | Component diagram, quality drivers, drafting table, blueprint, ruler and miniature blocks | Atlas: blazer, glasses, bow tie, blueprint and ruler; examines alternatives |
| Implementation | Pegboard, tools, gear and rotating bag maquette | Pixel: raised goggles, apron, pencil and screwdriver; tinkering gesture |
| Verification and validation | Test checklist, inspection table, ruler, sample and scanning magnifier | Vera: hard hat, reflective vest and magnifying glass; inspection gesture |
| Deployment and operation | Console, tablet, server racks and backup model | Nilo: headset, microphone and operator vest; checks the tablet |

The characters reuse the office's Worker rig and toon materials. Their silhouettes,
props, gestures and workspaces are different; only Vera wears a hat. Before a
session starts, a specialist is a visual placeholder. Starting one replaces it
with a real worker in the same spot, using the chosen provider, model and effort.
Helpers sit at ordinary desks, with the same outfit at a smaller scale. Physical
progress panels reflect saved checklist counts and review status; other maquettes
and status lights remain illustrative.

## Navigation

- **J**, or **Menu → Engenharia de software**, opens a floor-plan selector.
- **Alt + 1–5** instantly goes to a sector on the current project floor. Returning
  during this page session restores your position and facing in that sector.
- **🏗 Engenharia** opens the persistent sector list. Press **Esc** to release
  mouse-look before clicking it. Shortcuts can be changed to Ctrl+Shift+1–5 or disabled.
- **Entrada do projeto** returns to the existing elevator entrance.
- The existing elevator and project list continue to change projects; sector
  navigation never sends a `floor.go` request or changes the project.
- Walk freely between sectors through the original office's aisles. Added
  furniture has collision boundaries and leaves the arrival points clear.

The studio is available on the Office map. Visitors with a saved position in the
removed annex are returned to the original project's entrance on reconnect.

## Process plaque and artifacts

The plaque by the existing elevator belongs to the project. **Quadro da etapa →
Processo e notas** edits lifecycle, phase, iteration, objective, main risk and each
discipline's previous Markdown notes. Options are Unified Process (a lightweight adaptation), iterative/incremental,
waterfall and spiral. Selecting one changes labels and valid phases; it does not
execute or enforce that lifecycle. Disciplines can be revisited during any phase.

Notes have sanitized Markdown previews (including linked images), Markdown export,
and the existing project bookshelf. Code blocks remain text; this version does not
execute Mermaid, preview 3D model files, generate bag designs or connect WhatsApp.

**Salvar** stores notes in the project's `.agent-office/engineering.json`, preserving
the previous version's saved artifacts. Concurrent editors use revision checks:
a stale save returns a conflict. Export a conflicting draft before reloading to load
the latest saved version. Disk errors do not silently reset saved work.

Drafts and document scroll positions last for this page session. Reloading loses
unsaved drafts. Back up the workspace JSON with the office's other data; it is
separate from source-controlled project documentation.

## Real specialists and delegation

At a character, **E** starts its session or opens its terminal. **P** sends a
message; **C** opens changes; **R** resumes; **O** opens PR controls; **X** sends
it home. The same controls are available in the stage board's team cards and at
the assigned desks. Existing desk workers keep their identities; a specialist
gets a suffix if its name is already in use.

Each chief can use `hire_worker` (MCP) or `office-workers hire` to delegate up to
three present helpers. Helpers inherit stage, task, parent, owner, and by default
provider/model/effort. They are ordinary worker sessions subject to the office's
budget, capacity, worktree, account and terminal controls. Helpers cannot hire
further workers. The chief consolidates their reports; personalities and outfits
do not imply separate models. Starting the board never starts five sessions.

The office chooses a free desk in the sector's pod, then another free seat if
needed. Operation shares the nearest existing desks. Worktree options behave
like ordinary worker hiring. Worktrees isolate code; shared-directory workers
must coordinate writes. Sending a chief home does not automatically discard its
helpers or their work. Reports remain saved; read a helper's worktree before
sending it home if its unmerged document is needed for consolidation.

### Agent tools

The existing worker-token-authenticated MCP and CLI now include:

- `list_reports` / `office-workers reports`: reports on the same task.
- `report_work({summary})` / `office-workers report --summary "…"`: submit actual
  results and evidence. A helper reports to its chief; a chief requests review.
- `read_stage_artifact({discipline, worker?})` /
  `office-workers artifact requirements [--worker <id>]`: read a canonical project
  document (or its template), or a same-task worker's document in a separate
  worktree. This also lets a worker consume approved project inputs while its own
  worktree has an older base.

A chief must write its canonical artifact before requesting review. Reports never
approve work automatically. Old-task reports and cross-task worker artifact reads
are rejected. Worker assignment metadata and hook identity survive office restarts.

## Stage board and artifacts

**J → Quadro da etapa**, the sector menu, or **E** at a board opens all five stage
tabs. Each has an editable objective, consumed artifacts, an editable checklist,
a canonical output/template, team controls and submitted reports. Save checklist
edits before switching tabs; unsaved changes are discarded on close with a notice.
The board refreshes every five seconds while no edits are pending.

| Stage | Canonical output | Contents |
| --- | --- | --- |
| Requirements | `docs/engineering/requirements.md` | Problem, stakeholders, elicitation evidence, RF/RNF, prioritized backlog, US and acceptance criteria |
| Architecture | `docs/engineering/architecture.md` | Drivers, alternatives, C4/interfaces/data, ADRs, risks and experiments |
| Implementation | `docs/engineering/implementation.md` | Selected increment, definition of done, prototype/code links, execution, PR and limitations |
| Validation | `docs/engineering/validation.md` | TC → US/RF, preconditions, steps, expected/actual results, status, evidence, defects and consolidated report |
| Operation | `docs/engineering/operations.md` | Version, deployment/configuration, observation/costs, backup and recovery |

Templates contain generic structure and prompts, never fabricated interviews or
PASS results. Link inputs rather than copying them. Test cases and their report
share one source. External reference documents are not bundled with the feature.
Existing notes remain in `engineering.json`; they are not overwritten or silently
migrated into source-controlled documentation.

**Abrir template** previews and edits a missing artifact; creating it writes the
canonical path. Existing files open with sanitized Markdown preview. Saves use a
content hash: conflicting edits are rejected. Files are limited to 150 KB and
symbolic links are rejected. Disk corruption is preserved for recovery.

When the chief submits, the stage becomes **Em revisão**. Review its document,
complete and save the checklist, then choose **Aprovar entrega**. The server
checks workflow revision and document hashes again. If the chief used a separate
worktree, approval copies only that reviewed Markdown file into the project.
Code changes still require their normal PR review and merge. The approval records
author and time. Changing an approved document reopens affected downstream stages
for review, including transitive consumers. Starting a new chief task resets its
checklist so previous checks cannot approve new work accidentally.

Workflow and reports are stored in `.agent-office/engineering-flow.json` per
project. Back this up alongside the existing workspace notes, worker metadata
and the source-controlled Markdown artifacts. The board does not run a lifecycle
engine, enforce template semantics, generate a bag/3D model, or connect WhatsApp.
