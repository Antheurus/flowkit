# Flow Kit Changelog

## v1.2.0 — Flow's own AI agent can now be used to build scenes

- **You can now have Flow's built-in AI agent build your scenes**, instead of only sending generation requests at it directly. In practice it's noticeably better: given a character reference it rewrites the prompts itself, keeps the right characters attached, and holds the look consistent from shot to shot. In this release it fixed two frames where a character had drifted into looking like a completely different creature.
- **Fixed:** a bug that would have stopped the agent from working at all — the security check token wasn't being attached to its requests, which fails in a way that looks like the security check itself is broken. Nothing to do on your side; the extension handles it.
- **Note on signing in:** exported browser cookies are *not* enough to use the agent. They let pages load and look logged in, then the first real action gets bounced back to the sign-in screen. It needs a normal one-time Google sign-in, after which it's remembered.
- **Heads up if you generate images through the agent:** images it creates need to be brought back into your project before video generation will use them — Flow's internal IDs don't carry over. This release does that for you when asked.
- Still open: video generation can hang on the known "Workflow polling timeout" issue, and every retry starts a **brand-new paid generation**. Check attempt counts on the Storyboard page before retrying.

## v1.1.0 — New Storyboard page, and two real bugs found + fixed

- **New "Storyboard" page** in the dashboard nav — shows every scene's status and, critically, how many times a real generation was actually sent to Flow for it (not just the current retry count). Built directly in response to finding out video generation had been silently duplicated 2-5x per scene; check this page before generating anything again.
- **New `storyboard/` folder** at the project root — conventions, a template for starting a new storyboard, and a running log of production issues so they don't repeat.
- **Fixed:** dialogue in scene prompts was being silently discarded when the project didn't have voice explicitly enabled, producing generic sounds instead of actual spoken lines. Set "allow voice" when creating a project with dialogue.
- **Found (not yet fixed):** retrying a stuck video generation resubmits a brand-new generation to Flow instead of checking the existing one — confirmed this produced up to 10 real generations for a single scene during one troubleshooting session. Check the new Storyboard page's attempt counts before retrying anything.

## v1.1.0 — Video generation can get permanently stuck on some accounts/models — known issue, workaround included

- Found a real bug: video generation can fail forever with `"Workflow polling timeout"`, even after waiting a long time — it's not actually slow, the status-check code has a bug for one of Flow's response formats. If you hit this: open the project directly in `labs.google/fx/tools/flow` in Chrome with the extension active — that recovers the real status. Full detail for future debugging in `skills/fk-doctor.md`.
- Added a `LOG_LEVEL` setting (env var, defaults to normal) for turning on detailed logs when diagnosing an issue like this one.

## v1.1.0 — New skill: turn any ad script into a Flow Kit storyboard

- Added `/fk-storyboard-prompt` — paste in a creative brief from Gemini/ChatGPT (or anything written for Midjourney/Kling/Runway) and it gets converted into a storyboard Flow Kit can actually run, fixing the usual causes of repeated generation errors (appearance described in every scene, tool-specific flags, missing audio/dialogue structure).
- Local app updated to the latest release: rebuilt dashboard (multi-language UI, AI provider switching), and the dashboard now needs `npm install` once before `npm run dev` (no `node_modules` shipped).
- No action needed unless you use the dashboard — run `npm install` inside `dashboard/` once, then `npm run dev`.

---
