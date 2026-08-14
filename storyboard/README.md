# Storyboard Knowledge

Reusable knowledge for authoring a new ad/video storyboard in Flow Kit — separate from
`skills/`, which teaches the agent *how* to drive the pipeline. This folder is where the
*conventions and lessons* live so a new storyboard starts from what's already been learned,
not from a blank page.

- `conventions.md` — the rules a storyboard must follow, distilled to what actually matters when starting a new one. Points at the full source (`skills/fk-create-project.md`, `skills/fk-camera-guide.md`) rather than repeating it.
- `template.md` — copy this to start a new storyboard. Fill in entities and scenes, run the safe-language and dialogue checks before creating anything via the API.
- `issues.md` — production issues found while actually running a storyboard through the pipeline, and what to check next time so they don't repeat.

## Where the live state lives

This folder holds knowledge, not state. A project's actual entities, scenes, and generation
status live in `flow_agent.db` (queryable via the API) and are visible in the dashboard's
**Storyboard** page (`dashboard/`, `npm run dev`) — check that page before generating
anything, so a scene that already has 3 video attempts doesn't get a 4th.
