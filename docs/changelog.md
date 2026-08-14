# Flow Kit Changelog

## v1.1.0 — Video generation can get permanently stuck on some accounts/models — known issue, workaround included

- Found a real bug: video generation can fail forever with `"Workflow polling timeout"`, even after waiting a long time — it's not actually slow, the status-check code has a bug for one of Flow's response formats. If you hit this: open the project directly in `labs.google/fx/tools/flow` in Chrome with the extension active — that recovers the real status. Full detail for future debugging in `skills/fk-doctor.md`.
- Added a `LOG_LEVEL` setting (env var, defaults to normal) for turning on detailed logs when diagnosing an issue like this one.

## v1.1.0 — New skill: turn any ad script into a Flow Kit storyboard

- Added `/fk-storyboard-prompt` — paste in a creative brief from Gemini/ChatGPT (or anything written for Midjourney/Kling/Runway) and it gets converted into a storyboard Flow Kit can actually run, fixing the usual causes of repeated generation errors (appearance described in every scene, tool-specific flags, missing audio/dialogue structure).
- Local app updated to the latest release: rebuilt dashboard (multi-language UI, AI provider switching), and the dashboard now needs `npm install` once before `npm run dev` (no `node_modules` shipped).
- No action needed unless you use the dashboard — run `npm install` inside `dashboard/` once, then `npm run dev`.

---
