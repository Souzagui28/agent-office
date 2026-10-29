# Engineering studio

Back to the [README](../README.md).

## One project per floor

The existing building, exterior, elevator, floor dimensions (36 × 26 m), desk pods,
meeting room, lounge and worker desks are preserved. Five open engineering sectors
share each project's floor. There is no separate annex, no miniature replacement
room and no extra storey for a discipline.

| Sector | Furnishings | Visual specialist |
| --- | --- | --- |
| Requirements | Cork stakeholder board, notes, conversation table and stools | Clara: glasses, bun, scarf and clipboard; reading and note-taking gestures |
| Architecture and software design | Component diagram, quality drivers, drafting table, blueprint, ruler and miniature blocks | Atlas: blazer, glasses, bow tie, blueprint and ruler; examines alternatives |
| Implementation | Pegboard, tools, gear and rotating bag maquette | Pixel: raised goggles, apron, pencil and screwdriver; tinkering gesture |
| Verification and validation | Test checklist, inspection table, ruler, sample and scanning magnifier | Vera: hard hat, reflective vest and magnifying glass; inspection gesture |
| Deployment and operation | Console, tablet, server racks and backup model | Nilo: headset, microphone and operator vest; checks the tablet |

The characters reuse the office's Worker rig and toon materials. Their silhouettes,
props, gestures and workspaces are different; only Vera wears a hat. They are visual
guides, not independently running agents. Boards, maquettes and status lights are
illustrative, not generated project results or live telemetry.

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

The plaque by the existing elevator belongs to the project. **Artefatos e processo**
edits lifecycle, phase, iteration, objective, main risk and each discipline's Markdown
notes. Options are Unified Process (a lightweight adaptation), iterative/incremental,
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

## Agent tasks

**Preparar tarefa do agente** opens the existing prompt dialog with the discipline's
role, personality, objective, risk and current notes. Review and send to start a
real worker at an available project desk. Visiting a sector makes no model calls.

The prompt asks for results in `docs/engineering/<discipline>.md`, available in the
bookshelf. Worker output is not automatically imported into workspace notes, and
visual guides do not mirror the status of running workers.
