# Engineering floors

Back to the [README](../README.md).

The 3D office includes a five-storey engineering annex, with one room per discipline:
requirements, architecture and software design, implementation, verification and
validation, and deployment and operation. The annex shares the current project's
checkout, workers and artifact workspace; these rooms do not clone five repositories.
It uses the office's toon materials, outlined shapes and animated worker characters.

## Navigation

- Open **🏗 Engenharia** at the bottom left for the persistent floor list.
- **Alt + 1–5** instantly travels to a discipline. The first arrival is by its tables;
  returning during this browser session restores your position and facing.
- Press **J**, or use **Menu → Engenharia de software**, for a floor selector that also
  supports the existing controller menu navigation. Its elevator terminals open the
  same selector with **E / X**.
- While mouse-look is captured, press **Esc** to click the persistent floor list.
- The floor list can change shortcuts to **Ctrl + Shift + 1–5**, or disable them.
- **Voltar ao escritório do projeto** returns to where you entered the annex.

The annex is available on the Office map, inside a project, outside roof travel.
The five rooms are physically stacked at separate elevations, with safe railings and
collision floors. Walking between floors is never required. Changing projects through
its existing elevator still selects the project's own code, workers and saved workspace.

## Process plaque and artifacts

**Artefatos e processo** edits the selected lifecycle, phase, iteration, objective,
principal risk and each discipline's Markdown notes. Available lifecycle labels are
Unified Process (a lightweight adaptation), iterative/incremental, waterfall and spiral.
Selecting one changes the plaque and valid phase names; it does not enforce or execute
that process. A discipline can be revisited in any phase.

Each room has an animated visual guide (Clara, Atlas, Pixel, Vera or Nilo), themed
headwear, document tables and an explicitly illustrative diagram board. These guides
are not autonomous workers, and the illustrative diagrams are not computed from notes.

Notes have a sanitized Markdown preview, including linked images, and can be exported
as `.md`. Diagrams in code blocks remain text; this version does not execute Mermaid,
load 3D prototype files, generate bag designs, or implement WhatsApp integration.
**Documentos do projeto** opens the existing bookshelf for project Markdown documents.

**Salvar** explicitly stores the workspace on the server, in the current project's
`.agent-office/engineering.json`. Drafts and document scroll positions are kept only
in the current browser session; reload/closing the page loses unsaved drafts. Back up
that JSON file with other office data. It is separate from source-controlled docs.
Concurrent editors use revision checks: a stale save returns a conflict rather than
overwriting another editor. Export a conflicting draft before reloading the page to
load the latest saved version. Disk errors are surfaced instead of resetting saved work.

## Agent tasks

**Preparar tarefa do agente** opens the existing prompt dialog with the discipline's
role, personality, objective, risk, and current notes. Review and submit to start a real
worker at a free desk in the current project; provider/model and worktree choices use
the normal office controls. Merely visiting a room never starts model calls.

The prompt asks for results in `docs/engineering/<discipline>.md`, visible through the
bookshelf. It does not automatically import worker output into the workspace notes or
make a visual guide mirror a running worker. There is no WhatsApp/image/3D generation
pipeline yet; the workspace organizes the development of that pipeline.
