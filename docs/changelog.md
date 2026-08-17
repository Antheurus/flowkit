# Flow Kit Changelog

## v1.2.5 — Dashboard no longer breaks when the window is narrower than full-screen

- **The dashboard home screen now adapts to a smaller window** instead of squeezing content down to unreadable fragments or cutting it off entirely. Resize the browser (or use it on a smaller monitor) and the stat cards and panels now stack cleanly instead of overlapping the edge of the screen.
- **The pipeline progress bars now change color to match their percentage label** — a stage that just hit 100% now shows a green bar, not the same blue as one still in progress.
- Same narrow-window fix applied to the Project Detail page's Overview tab.
- **Still narrow-screen only:** on a genuinely phone-width window the sidebar and one row of the pipeline table still need a small side-scroll to see everything — this is a desktop tool and full mobile support wasn't part of this pass.

## v1.2.4 — Progress bars read correctly again, and the dashboard finally ships its own font

- **Empty progress bars no longer look full.** The track behind every progress bar was painting a solid light-grey band, so a stage sitting at 0/7 looked like a bar with something in it. Tracks are now a dark, recessed line — the blue fill is the only thing you see.
- **The same grey is used for all secondary text.** Timestamps, captions and helper text in the shadcn-based parts of the app were rendering in a slightly different grey than the rest of the dashboard. One grey now, everywhere.
- **The dashboard now ships the font it uses.** Until now the interface asked for DM Mono but never bundled it — it only appeared if your computer already had that font, and otherwise you got whatever monospace your system fell back to. The dashboard now bundles Geist Mono and uses it for everything, so it looks identical on every machine and browser.
- **Button labels are easier to read.** Text on blue buttons is now pure white instead of off-white.
- **Focus outlines are blue instead of grey**, matching the rest of the interface.

No action required — just reload the dashboard after updating.

---

## v1.2.3 — Status indicators now look and behave the same everywhere

- **The Needs Attention list is back to a proper flagged box** (not the plain border-only version from the last release) — same treatment used for hard failures everywhere else in the dashboard.
- **Every status dot in the app is now the same shape and color** — a few places (the pipeline stage legend, in particular) were quietly using square dots while everything else used round ones.
- No behavior changes, purely visual consistency.

## v1.2.2 — Dashboard styling cleanup

- **Needs Attention list (Dashboard)** no longer looks like a stack of boxes — cleaner flagged rows with a thin red accent bar.
- **Switching projects on Storyboard and Gallery** is now a tab bar you click across instead of a dropdown you have to open. Long project names shorten with "..." — hover to see the full name.
- **Active / Archived / All filter (Projects page)** and the "created" date under each project card got a visual cleanup — no more mismatched gray box.
- **Not yet done:** thumbnails still occasionally show as broken images (Flow's own image links expire) and there's still no way to leave a note on a scene — both are scoped and written up in `PLAN.md`, not built yet.

## v1.2.1 — Agent moved to a new port

- **The local agent now runs on port `8743` instead of `8100`.** If you have anything bookmarked or scripted against `http://127.0.0.1:8100`, update it to `8743`. The dashboard and extension already point at the new port; no action needed for those.
- **Action required:** reload the browser extension once (`chrome://extensions` → reload) so it picks up the new port — it will show "Agent disconnected" until you do.

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
