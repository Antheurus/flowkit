# Flow Kit Progress

## Session — 2026-08-17 (cont 4) — v1.2.5 (dashboard no longer breaks below ~1000px)

User pasted a screenshot of the dashboard looking cut off and asked to fix it. The screenshot showed
only one KPI card, a truncated Pipeline Throughput row, and no Needs Attention panel — the shape of a
window narrower than the page needs. Reproduced it live against the running dev server (already up on
5173) rather than guessing: at 1000px everything still fit, but the KPI row (`grid-cols-4`, no
breakpoint) and the two-column body row (`gridTemplateColumns: '1.55fr 1fr'`, also no breakpoint) both
had zero responsive handling, unlike `VideoGallery.tsx`'s `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
and the `repeat(auto-fill, minmax(...))` pattern used on Projects/Storyboard/Characters — so this was
the one screen in the app that hadn't picked up the house responsive pattern. Below ~700px the
Pipeline Throughput row's fixed `width: 160`/`width: 76` inline styles made it worse: flex-shrink
default let the row compress the video title down to "Ji…" while still fitting on one line, which
reads as broken truncation rather than a layout that adapted.

Fix: `DashboardPage.tsx` KPI grid is now `grid-cols-2 xl:grid-cols-4`; the throughput/attention row is
`grid-cols-1 lg:grid-cols-[1.55fr_1fr]` so it stacks instead of squeezing; the throughput row's name
and per-stage columns got `flex-shrink-0` plus an `overflow-x-auto` wrapper, so a genuinely narrow
window scrolls that one row horizontally instead of truncating video titles to two letters. Same
`gridTemplateColumns` fixed-ratio-no-breakpoint bug existed in `ProjectDetailPage.tsx`'s Overview tab
(`1.4fr 1fr`) — fixed identically since it's the same defect class. Separately, while comparing the
throughput row to the screenshot: `Progress`'s indicator was hardcoded `bg-primary` regardless of
`value`, so a 100%-complete stage's bar stayed the same blue as a 0% one while the percentage label
beside it was already color-coded green/yellow/muted — added an optional `indicatorColor` prop
(default unchanged) and wired it at the one call site where the mismatch was visible; the other three
`<Progress>` call sites (StageNode, ProjectDetailPage's two stage-rollup grids) have no adjacent
color-coded label, so left them on the default blue rather than inventing a semantic that wasn't there.

Verified live at 1280/900/768/640/430px both before and after: KPI cards now hold 2-up down to a
narrow window instead of wrapping "SCENES IN FLIGHT" onto three lines, the body row stacks to one
column below 1024px instead of squeezing, and Progress bars now change color at each breakpoint
matching the percentage text. 640px and below still needs a horizontal scroll to see the third stage
column and the badge on the Pipeline Throughput row (by design, not squeeze) — deliberately did not
touch the sidebar's fixed 208px width or build a mobile nav collapse, since this is a desktop ops
console with a browser-extension dependency and true phone-width support wasn't asked for; noted as a
scope boundary, not silently dropped. `bun run build` (tsc -b && vite build): clean, no type errors.

---

## Session — 2026-08-17 (cont 3) — v1.2.4 (one design-token namespace, one shipped typeface)

Started as a plain question — which libraries the dashboard styles with — and the inventory itself
turned up the defect. Stack is Tailwind v4 (config-less, everything in `@theme` inside
`dashboard/src/index.css`), shadcn at style `radix-nova` over radix-ui primitives, CVA + clsx +
tailwind-merge, lucide icons, tw-animate-css. My first read of the file was wrong and is worth
recording so nobody re-derives it: I called the shadcn slots "still at light defaults, so new
components will render light", but `<html class="dark">` is set and the `.dark` block sat *below*
`:root` at equal specificity (0,1,0), so it won on source order and popover et al. resolved dark all
along. Driving the live dev server is what corrected it — `getComputedStyle` on the real page, not a
read of the cascade.

What the browser did show was a genuine name collision. The file carried two token namespaces under
one set of names: the product palette (`--accent` = brand blue, `--muted` = muted *text*, read
directly as `var(--x)` by 118 and 17 call sites respectively) and shadcn's semantic slots, where
`--accent` means the subtle hover *surface* and `--muted` the muted *surface*. Nothing errors — the
two meanings just quietly overwrite each other. Live consequence: `bg-muted` computed
`rgb(100,116,139)`, so nine Progress tracks on the dashboard home painted as solid mid-slate bars,
which reads as "this bar is filled" on a stage that is 0/7; the same value backed table-header,
tabs-list, avatar-fallback, skeleton and every ghost/outline hover. Second half of the same
collision: `text-muted-foreground` resolved to `oklch(0.708 0 0)`, a neutral grey that disagreed with
the `#64748b` the 118 hand-written sites use, so the app ran two muted greys side by side.

Fix keeps the palette as the single source and translates at the boundary rather than renaming 135
call sites — `@theme inline` now maps `--color-muted` and `--color-accent` to a new `--elevated`
(`#222240`, which continues the existing ladder 13→19→26→**34**→37 in the R/G channel), and
`--color-muted-foreground` to the palette's own `--muted`. Every other shadcn slot is now *derived*
(`--primary: var(--accent)`, `--popover: var(--card)`, `--destructive: var(--red)`, …) instead of
restating a literal, the dead light `:root` values and the duplicate `.dark` block are gone, and the
greyscale leftovers were pointed at real palette colours: `--ring` → brand blue, `--chart-1..5` →
blue/green/yellow/red/purple, `--sidebar-*` → the navy family. `--primary-foreground` went
`#e2e8f0` → `#ffffff`, lifting button-label contrast 2.98:1 → 3.68:1.

Typography was the second ask and had the same shape — two owners, and the one that won was the one
nobody shipped. `body` set `font-family: 'DM Mono', 'Fira Code', 'Cascadia Code', ui-monospace` as a
plain unlayered rule while `@layer base { html { @apply font-sans } }` set Geist; unlayered beats a
layer, so mono won everywhere — except none of those three mono families is a webfont here, so the
product's primary typeface rendered only because this machine happens to have DM Mono installed, and
anyone else fell through to `ui-monospace`. Meanwhile `@fontsource-variable/geist` *was* downloaded
on every load to style exactly three titles (`font-heading` on Card/Sheet/Dialog). Swapped to
`@fontsource-variable/geist-mono`, dropped the sans package, deleted the `font-family` line from
`body`, and pointed `--font-sans`/`--font-mono`/`--font-heading` at the one family so the sole owner
is `@layer base { body { … font-sans } }`.

Verified against the running dev server on :5173 (note it binds IPv6 only — `127.0.0.1:5173` gives
ERR_CONNECTION_REFUSED, `localhost` works). Before/after `getComputedStyle`: `bg-muted`
`rgb(100,116,139)` → `rgb(34,34,64)`; `text-muted-foreground` → `rgb(100,116,139)`; elements painted
the old bright slate 9 → 0; `--ring` → `#3b82f6`; body font → `Geist Mono Variable`, `document.fonts`
reporting it loaded. `npm run build` (tsc -b + vite) green, 1874 modules in 342ms, and the built CSS
holds 9 `Geist Mono` references against 0 for `DM Mono` and 0 for `Geist Variable` — i.e. the
unshipped font is gone and the unused one is no longer downloaded. Drove home, /projects,
/projects/:id Overview + Pipeline and /logs at 1440x900 and looked at each, plus hover on the ghost
and outline buttons (`oklab(0.268 …/0.5)` and `oklab(0.282 …/0.5)`, both the new elevated navy rather
than the old slate). One thing verification could *not* cover: `bg-accent` is used nowhere in source,
so Tailwind never emits the class and the probe reads `rgba(0,0,0,0)` — that half of the fix is a
closed trap for the next `shadcn add`, not an observed rendering.

Two contrast figures left deliberately alone because they are brand decisions, not defects to fix
unilaterally: white on `#3b82f6` is 3.68:1 and `--muted` `#64748b` on `--card` is 3.55:1, both under
AA's 4.5:1 for 12–13px text. The one-line fixes are `--primary: var(--accent-dim)` (6.70:1) and
lifting `--muted` toward `#8494ad`; the second would move 118 call sites at once, which is exactly
why it is the user's call. Touched `dashboard/src/index.css`, `dashboard/package.json`,
`dashboard/package-lock.json` only — the `agent/*` modifications in the tree predate this session and
were left untouched.

---

## Session — 2026-08-17 (cont 2) — v1.2.3 (status/severity primitives unified across the whole dashboard)

Follow-on to the v1.2.2 styling pass, after the user pushed back on the Needs Attention treatment
from that session: the flat left-border-only row I'd shipped was itself the parity break, not the
fix. A read-only survey (forked subagent) across all six pages plus the pipeline components found
the app's real established pattern was a box with a neutral `var(--border)` outline and a colored
3px left accent on `var(--surface)`, already used three times in `SceneDetailSheet.tsx` (review
verdict card, per-error severity rows, and — closest analog to Needs Attention — a stronger
fully-red-bordered/tinted variant for a hard request failure). The survey also surfaced two more
divergences nobody had reported: `STATUS_COLOR`/`VERDICT_COLORS` (the COMPLETED/PROCESSING/
FAILED/PENDING → green/yellow/red/muted mapping) was independently redefined, byte-identical, in
four files (`StoryboardPage.tsx`, `ProjectDetailPage.tsx`, `SceneCard.tsx`, `SceneDetailSheet.tsx`),
and `StageNode.tsx`'s status legend used square dots while every other status indicator in the app
(~13 occurrences) used round ones.

Confirmed scope with the user first (all 6 pages, visual + primitive consolidation only, no layout
changes) before touching code, given the first attempt had already gone sideways once. Built three
shared primitives: `lib/statusColors.ts` (the single `STATUS_COLOR`/`VERDICT_COLORS` source),
`components/ui/status-dot.tsx` (`<StatusDot status={StatusType}>` or `<StatusDot color={string}>`,
with an optional `pulse` prop for the two "actively running" indicators that used to hand-roll a
`pulse` keyframe animation inline), and `components/ui/accent-card.tsx` (`<AccentCard accentColor
variant="flag"|"alert">`, generalizing SceneDetailSheet's two existing box treatments — `flag` for
graded/categorical content, `alert` for a hard failure or active state). Then swept every caller:
Dashboard's Needs Attention rows now render through `AccentCard variant="alert"` (matching
SceneDetailSheet's own hard-failure treatment, since they're displaying the literal same kind of
content — a FAILED request's error message — just in two different places), all ~13 status dots
across `StoryboardPage`, `ProjectDetailPage`, `PipelineView`, `SceneCard`, `SceneDetailSheet`,
`StageNode` (now round, matching everywhere else) and `GuidePage` (health/connection dots, which
are boolean-driven rather than `StatusType`-driven, hence `StatusDot`'s dual `status`/`color` props)
now render through the one `StatusDot` component, and `SceneDetailSheet`'s three box patterns plus
its `reviewRunning` block all route through `AccentCard`. Also normalized a pulse-animation timing
inconsistency found along the way (PipelineView's "running" dot was 1.6s, SceneDetailSheet's was
1.2s) to one shared 1.2s baked into `StatusDot`.

Verified: `npx tsc -b --noEmit` clean (rc=0); `npx eslint .` unchanged at the same 4 pre-existing
errors as the prior session (three shadcn primitives' own fast-refresh warnings, one
`setState`-in-effect in `StoryboardPage`'s active-project redirect — confirmed via line-content,
not just count, that these are the same four); a `python3` sweep confirmed exactly one remaining
`STATUS_COLOR`/`VERDICT_COLORS` definition in the whole `dashboard/src` tree and zero square dots.
Drove the real dev server with `playwright-cli`: screenshotted Dashboard (Needs Attention now reads
as a proper alert box, not a bare border), Storyboard (status/entity dots), a project's Pipeline tab
(StageNode's legend dots now round, matching the SceneCard status badge beside them), and opened a
SceneDetailSheet to confirm the status badge and layout render correctly post-refactor.

---

## Session — 2026-08-17 (cont) — v1.2.2 (dashboard styling pass: attention list, project switcher, segmented control)

Styling pass over the dashboard, invoked via the `design-taste-frontend` skill (which is written for landing pages — this is a dark ops-console dashboard, out of that skill's stated scope, so only its general anti-slop principles applied, not the marketing-page rules). Four fixes shipped, two more scoped and written into `PLAN.md` as not-yet-built, one item dropped as out of scope.

**Needs Attention (DashboardPage.tsx):** rows were a bordered box with a red `border-left` nested inside the card's own 1px border — busy, read as a stack of boxes rather than a flagged list. Replaced with a flat row: red left-accent bar directly on the row, no background/border box, hairline `border-bottom` between rows (last row has none), subtle hover highlight. Confirmed with the user this was the intended direction ("bar tipis, no box") before building.

**Project switcher → tab bar (new `components/projects/ProjectSwitcher.tsx`, shared).** Storyboard and Gallery pages both used a native `<select>` dropdown to switch the active project. Replaced with a horizontally-scrollable underline-tab bar built on the existing `Tabs`/`TabsList`/`TabsTrigger` primitive's `line` variant (already in `components/ui/tabs.tsx`, previously unused anywhere in the app) — no new CSS needed, just composition. Names longer than 20 characters truncate with `...` (`title` attribute carries the full name for hover). One component, two call sites; built to be reused by any future page needing the same switcher, per the user's explicit ask.

**Active/Archived/All segmented control (ProjectsPage.tsx) + project card footer.** Root cause of both complaints was the same CSS variable: shadcn's `bg-muted` token resolves to `--muted: #64748b`, a mid-slate gray that has zero relation to this app's actual dark navy/purple palette (`--bg`/`--surface`/`--card`/`--border`) — it's also reused directly as *text* muted color everywhere else in the app via inline `style={{color: 'var(--muted)'}}`, so changing the token itself was out of scope (too wide a blast radius for a targeted fix). Instead overrode at the two call sites only: the tab list's container now uses `var(--surface)` + `var(--border)` and the active pill uses `var(--card)`, matching the card/surface language used everywhere else; the project card's `CardFooter` (previously `bg-muted/50 border-t`, a heavy tonal block under a light "created at" caption) drops the background and border entirely, relying on the `Card`'s own flex gap for spacing. `CardFooter` and `TabsList` are shared primitives used elsewhere (ProjectDetailPage's Overview/Characters/Videos/Pipeline tabs, `SceneDetailSheet`'s tabs) — verified in the browser after the change that both remain visually untouched, since the overrides were applied via `className` at the two specific call sites, not to the primitives themselves.

**Dropped, not built:** a "who's actively working on this" indicator — raised while reviewing a screenshot, then the user corrected that it wasn't actually requested. Confirmed and skipped; not written into `PLAN.md` either, since it's not a real ask.

**Deferred to `PLAN.md`, not built this session (both at the user's explicit request):** MinIO-backed media persistence — root-caused while reading the request (scene thumbnails intermittently show broken-image icons because `vertical_image_url`/`horizontal_image_url` are Flow's own expiring signed `storage.googleapis.com`/`lh3.googleusercontent.com` URLs, refreshed only while a Flow tab is open via the existing `urls_refreshed` WS event) — and a scene-notes feature (no `note` table/field or user/auth concept exists anywhere in `agent/models`/`agent/db/schema.py` today). Both written up as their own sections in `PLAN.md` with schema/API/UI shape and open questions, explicitly marked PLANNED NOT BUILT.

Verified by driving the real dev server (`:5173`, already running) with `playwright-cli`: screenshotted Dashboard, Projects, Storyboard, and Gallery before/after, clicked through the new switcher on Gallery to confirm it actually changes the loaded project (video/scene counts update, empty state renders correctly), and screenshotted ProjectDetailPage to confirm its own tabs were unaffected by the ProjectsPage-scoped override. `npx tsc -b --noEmit` clean (rc=0). `npx eslint .` reports 4 pre-existing errors (three shadcn primitives' fast-refresh warnings, one `setState`-in-effect in `StoryboardPage.tsx`'s pre-existing active-project redirect) — confirmed via `git diff` that none of the four are in code this session touched. Did not touch the repo's other pre-existing dirty files (`agent/api/videos.py`, `agent/db/crud.py`, `agent/db/schema.py`, `agent/models.json`, `agent/models/video.py`, `agent/sdk/*`, `agent/services/flow_client.py`) — those were already modified before this session started and belong to other in-progress work.

---

## Session — 2026-08-17 — v1.2.1 (agent port moved off 8100)

Moved the local agent's REST API off port `8100` to `8743` at the user's request — `8100` collides with nothing on this machine specifically, the ask was just to get off a common/guessable port. `agent/config.py`'s `API_PORT` default is the only place that actually needed changing (it's already env-overridable, so this only moves the default); everything else — `dashboard/vite.config.ts`'s proxy targets, `extension/manifest.json`'s `host_permissions`, `extension/background.js`'s callback fetch, `tools/review_server.py` / `review_board.html`, `scripts/statusline.sh`, `setup.py`/`setup.sh`'s generated doc text, and every `curl http://127.0.0.1:8100/...` example across `CLAUDE.md`/`AGENTS.md`/`GEMINI.md`/`README.md` and both `skills/fk-*.md` (source) and `.claude/commands/fk-*.md` (generated stubs plus the handful still shipped as full un-migrated content, per the setup.py memory) — was a literal `8100` → `8743` sweep, verified with `git grep -c 8100` landing at zero outside the one historical mention in this file's own 2026-08-15 entry, which was left untouched on purpose. Restarted the running `python -m agent.main` (the old pid didn't die on plain `SIGTERM` — uvicorn ignored it and kept serving on 8100 until `SIGKILL`, worth knowing next restart) and confirmed `curl http://127.0.0.1:8743/health` returns `extension_connected: true`; the dashboard's Vite dev server auto-restarted on its own config change and proxies through correctly. Not yet verified: the Chrome extension itself, which caches its loaded manifest/host_permissions until manually reloaded at `chrome://extensions` — `extension_connected` read `false` immediately after the restart and needs that reload to reconnect, out of the agent's reach.

Also, at the same request, built `~/.claude/references/port.md` (global, not project-scoped) — a port registry across every project under `PROJECT_MISPAQUL_ATTORIQ/*` and `DATA_BRIGHTY_MISPAQUL_ATTORIQ/*`, scanned via a `python3` sweep of docker-compose/`.env`/justfile/vite.config/main.go/package.json/README for port-bearing lines (74 projects, 214 entries, ranked by source confidence). Extended the existing "never pick a Docker port without asking" rule in `~/.claude/rules/lessons.md` (Infra section) to require every app — Docker or not — register its port there at assignment time, not just Docker ones. flowkit's own row now reads `8743` (API), `5173` (dashboard dev), `9222` (WS/CDP bridge — fixed by Chrome's remote-debugging convention, not ours to reassign). Done via the `rules-writer` skill's Mode D discipline: searched the corpus first (no existing owner), snapshotted before editing, verified the diff was exactly the intended line, and ran `corpus-lint.py` clean.

## Session — 2026-08-15 — v1.2.0 (Flow's own creation agent reached as an API; two ad projects driven through it)

Started from "failed semua", which turned out to be the *previous* project (`f5ed185f`, Sensodyne Ngilu Monster): its 4 scene images were fine and all 4 `GENERATE_VIDEO`s were terminally FAILED — 3 on the § A2 workflow-polling bug, and 1 that failed over on a later retry with `"Request had invalid authentication credentials"` after the token went stale ~1.5h into the burst. The new project had zero requests; nothing had been run against it at all.

Built a second storyboard ("Rimpangi vs Karangi") from the user's three reference images, uploading each as an entity `media_id` so no ref generation was spent, then generated all 6 scene images as waves (2 ROOT via `GENERATE_IMAGE`, then 4 sequential `EDIT_IMAGE` down the chain). Visual review before spending video credits was what earned its keep: scenes 2 and 3 had drifted badly — the tartar monster had become a grey stone golem and the tooth character was scowling — which is the predictable cost of a 5-deep `EDIT_IMAGE` chain, since each edit drifts a little from the last.

The fix is the session's main finding. The user asked for a way to talk to Flow's own in-project AI agent rather than only POSTing generation requests, on the theory it would be more reliable; it is, markedly — asked to fix the two frames it rewrote the prompts itself, re-attached the right character refs, and returned both corrected. Reaching it took a real auth detour worth recording: a cookie export scoped to `labs.google` (8 cookies) authenticates **reads only**, so the app renders fully signed-in and the failure only surfaces on the first *write*, which bounces to `signin?error=Callback` — Flow re-validates against Google OAuth (`scope=auth/aisandbox`) and needs the `google.com` set no such export can contain. Resolved with a one-time human login in headed **Patchright** (vanilla Playwright is refused outright by Google sign-in) into a persistent profile. Two self-inflicted traps along the way: the first login watcher keyed off `location.href` and reported `LOGGED_IN` while the browser was fully logged out, because Flow's signed-out landing page sits on the *same* `/tools/flow` URL as the app — only the storage-state dump exposed it, and detection now keys off the session cookie; and `docs/profile/` was not gitignored while holding a live Google session, so `git add -A` would have committed it (fixed, verified 0 matches).

Then the user made the architectural correction that mattered: none of that Patchright machinery belongs in production, because the extension already exists. Capturing the network call on submit proved them right in the strongest way — the agent is a plain `POST https://aisandbox-pa.googleapis.com/v1/flowCreationAgent:streamChat?alt=sse`, on a host already in the extension's `host_permissions` and already proxied by `handleApiRequest`, with the bearer token already captured and reCAPTCHA already solved. So production needs **no** DOM automation; the browser scripts collapse to discovery tooling. One real defect blocked it: the captcha injection matched `clientContext.recaptchaContext` and `requests[].clientContext`, but this endpoint nests under `agentClientContext`, so the token was silently never injected and the call would have failed exactly as though the captcha had not been solved — the most misleading failure available, since it sends the reader to debug grecaptcha rather than a key name. Added that branch (`extension/background.js`, `node --check` clean).

Also learned that Flow's `/edit/<uuid>` permalinks are a **different id space** from `media_id` — none of the harvested uuids matched any scene — and that `<img>` src scraping returns nothing usable, so after two misses the DOM was abandoned for the card's own Download control (which returns a **ZIP**, not an image, wrapping a prompt-named JPEG that makes cards self-identifying). Agent-produced images therefore come back into the pipeline by downloading the pixels and re-uploading via `/api/flow/upload-image`; scenes 2 and 3 were repointed that way and all 6 now read COMPLETED with UUID `media_id`s. A second spot was then started from scratch through the agent (project `56103a4d`, a wooden schoolkid character shot for a class photo): character sheet generated via `EDIT_CHARACTER_IMAGE` from the user's uploaded reference, then shots 1-3 built one agent message at a time, each naming the previous image — continuity held with no extra prompting. Contract, mermaid flow and orchestration chain documented in `docs/automation/flow-creation-agent.md`.

Not done: videos for either project (the § A2 bug is still open upstream and every retry is a fresh paid generation), shots 4-6 of the schoolkid spot, and the agent-side service that would make the agent path usable from the pipeline — it needs to hold `agentSessionId` + an incrementing `turnNumber`, dispatch via the existing WS `api_request`, parse SSE frames, and poll project media afterwards since a returning turn does not mean images exist. Nothing was pushed to `origin` (it is `crisng95/flowkit`; `git push --dry-run` returns a 403 for this account) — all 4 commits went to the user's own fork `Antheurus/flowkit`, which also backed up 5 of the user's commits that had been sitting unpushed for ~24h.

---

## Session — 2026-08-14 (cont) — v1.1.0 (Storyboard page + storyboard/ knowledge folder; quantified the duplicate-generation bug)

The user checked the Flow web UI (per the earlier ask) and reported two things: scenes with no real dialogue (just generic vocalization), and the same scenes appearing doubled/tripled in Flow's media library. Root-caused both.

**Dialogue bug:** `_build_video_prompt` (`agent/sdk/services/operations.py`) appends its own `Audio:` instruction based on the project's `allow_voice` flag, which defaults to `false`. The Sensodyne project was created without setting it, so every scene got `"Audio: ...no narration, no voiceover."` appended directly after its own `Character says: "..."` lines — a direct contradiction Veo 3 resolved by producing generic sound instead of speech. Fixed on the live project via PATCH; documented in `fk-create-project.md` and `fk-storyboard-prompt.md` next to the dialogue-writing rules so the next storyboard sets it at creation.

**Duplicate-generation bug, quantified:** re-read `generate_scene_video()`'s own code comment — a workflow-schema `op_name` (bare UUID) "cannot recover... need primary_media_id which isn't persisted yet," so it falls through and resubmits a fresh `generate_video()` call to Flow on every retry, justified by a comment claiming "Low Priority is free, duplicate is OK." That assumption doesn't hold once the § A2 polling bug is in play — retries never succeed, so every scene burns its full `MAX_RETRIES` in real Flow submissions, and it doesn't hold on a paid tier at all. Counted the actual damage from the DB: scene 1 (which got an extra manual diagnostic resubmit while chasing the § A2 bug) had **10** real `GENERATE_VIDEO` submissions to Flow; scenes 2-4 had **5** each — 25 total for a single 4-scene project. Documented in `fk-doctor.md`'s retry policy section.

Given the user's broader ask — a knowledge folder plus a page that would have prevented generating blind — asked two scoping questions (folder location, page type) rather than guessing: user chose a `storyboard/` subfolder inside this repo, and a dashboard page over a plain doc. Built both. `storyboard/` holds `conventions.md` (checklist referencing the full rules in `skills/`, not duplicating them), `template.md` (copy-to-start), and `issues.md` (all three bugs found this session, in short form). The dashboard gained a new **Storyboard** nav page (`dashboard/src/pages/StoryboardPage.tsx`) showing every project's entities and scenes with real per-stage status plus a new `attemptCount()` helper (`dashboard/src/lib/stageStats.ts`) that sums `retry_count + 1` across ALL request rows for a scene+stage — the number that was invisible before and is what actually would have shown the 10/5/5/5 duplication live, in red, before it happened again. No new backend endpoint was needed — the existing `/api/requests?project_id=` plus the dashboard's existing `fetchAPI` helper already covered it. Added English + Indonesian i18n strings (other 5 languages fall back to English per the existing pattern); `npx tsc -b --noEmit` clean; drove the page with `playwright-cli` against the real Sensodyne project and confirmed the attempt counts render correctly (screenshot showed exactly 10/5/5 as red warning badges).

Did not resubmit video generation this session — with `allow_voice` now fixed and the duplication risk now visible, that's a decision for the user to make once they've assessed the real state of the Flow project (likely via the passive TRPC intercept mentioned in the previous entry, or Flow's own UI).

---

## Session — 2026-08-14 (cont) — v1.1.0 (found and documented a real bug in the new workflow-schema video poller)

The 4 Sensodyne scene videos never completed — `GENERATE_VIDEO` requests failed twice, once at the 420s default `VIDEO_POLL_TIMEOUT` (5 retries, ~40 min) and again after bumping it to 1200s (1 more retry, ~20 min), both ending in the same `"Workflow polling timeout after <N>s"`. Raising the timeout was the wrong fix — added `LOG_LEVEL` as a real config option (`agent/config.py`, `agent/main.py`, defaults to `INFO`, same pattern as every other env-driven setting) and restarted at `DEBUG` to see what `_poll_workflows` (`agent/sdk/services/operations.py`) was actually receiving from `client.get_media()`. It's a permanent `400 {"error": {"code": 400, "message": "Request contains an invalid argument.", "status": "INVALID_ARGUMENT"}}` on every single poll, not an intermittent "not ready" — the code at operations.py:175 treats any non-200 status as "still generating" and loops forever, so no timeout value could ever have worked. Root cause: the `primaryMediaId` Flow returns in its newer workflow-schema response (added upstream in `af66bde`, "Low Priority workflow schema") isn't a valid argument to the old `GET /v1/media/{id}` endpoint that the polling code reuses from the pre-workflow-schema code path — and this response shape isn't gated to low-priority models, it showed up on the plain `veo_3_1_i2v_s_fast_portrait`/`PAYGATE_TIER_ONE` model too. Also improved the poller to log the actual response body on non-200 instead of just the status code (`operations.py`), since that's what made the real cause visible instead of another guess.

The submission to Flow itself succeeded (confirmed via `"Detected workflow-schema response: 1 workflow(s)"` in the log) — only the client-side status check is broken, so the video may genuinely have rendered server-side with no way for this code to know. The one currently-working path to real state for this response shape, per `refresh_project_urls()`'s own docstring, is opening the project in `labs.google/fx/tools/flow` in Chrome — the extension passively intercepts Flow's TRPC response and reports real media URLs back. Documented the full finding in `skills/fk-doctor.md` § A2 (replacing an earlier, wrong "just needs a longer timeout" entry written before the DEBUG-level evidence existed) so a future session doesn't re-spend the ~65 minutes this took to disprove. Did not attempt to patch `_poll_workflows` itself — the correct polling endpoint for a workflow-schema media id isn't known, and guessing at Google's API shape isn't something to do without evidence.

---

## Session — 2026-08-14 — v1.1.0 (fk-storyboard-prompt skill + Sensodyne ad production)

Updated the local checkout from `939b956` to `e269cd7` (11 upstream commits — dashboard rebuild with i18n and provider switching, `/fk-change-provider`) via stash/fast-forward/pop; a pre-existing uncommitted WIP (threading `duration_seconds` through `flow_client.py`/`videos.py`/`crud.py`/`schema.py`/`models.json`, with the author's own TODO noting the correct Flow API field for sub-8s clips is still unknown) survived the merge untouched and remains uncommitted — it is not this session's work and was left alone rather than finished or discarded. Started both the agent (`127.0.0.1:8100`) and, after `npm install` (dashboard had no upstream-committed `node_modules`), the new dashboard dev server (`localhost:5173`).

Added `/fk-storyboard-prompt`, a new skill (`skills/fk-storyboard-prompt.md`) that converts an externally-authored creative brief — a client script, a Gemini/ChatGPT ad concept, anything written in Midjourney/Kling/Runway prompt syntax — into a Flow-Kit-compliant storyboard. It exists because a user-supplied Gemini-generated Sensodyne ad script was erroring repeatedly when used as-is: it described character appearance inside every scene prompt (Flow Kit's `imageInputs` refs already carry that), used `--ar 9:16`-style flags Flow Kit doesn't parse, had no image/video prompt split, no Veo 3 5-component structure, and no ROOT/CONTINUATION chain awareness. The skill is registered via `python setup.py --tool claude` and documented in `CLAUDE.md`'s skills table.

Applied the skill to build a real 4-scene, ~32s VERTICAL/3d_pixar video project ("Sensodyne Ngilu Monster", `f5ed185f-efee-4861-9bed-ede5b161566d`): 4 entities (2 characters, 1 location, 1 product asset), with the product asset (Sensodyne Tube) using the user's real product photo via `/fk-upload-image` instead of an AI-generated approximation — packaging accuracy matters for a real product ad. Character/dialogue voiceover from the brief was converted to native Veo 3 in-scene dialogue (`Character says: "..." (no subtitles)`) rather than routed through the separate narrator/TTS pipeline, since it's character speech, not off-screen narration. Reference images (3) and scene images (4, wave-based — 3 ROOT + 1 CONTINUATION via `EDIT_IMAGE`) both completed with `all_succeeded: true`; scene video generation for all 4 scenes was still in progress on the Flow backend when the pipeline was verified (batch-status polling showed all 4 `processing` for several minutes — video gen with native audio appears to run longer than the ~2-5 min/scene the skill docs estimate).

Also caught and reverted a self-inflicted regression: running `setup.py --tool claude` to register the one new command also blanket-regenerated all 36 `.claude/commands/*.md` files, and 13 of those were shipped upstream with full inline content (not yet migrated to the thin `<!-- AUTO-GENERATED -->` redirect-stub pattern the other 23 already use) — the regen silently flattened all 13 down to 5-line stubs, discarding real committed content as an unintended side effect of installing one skill. Reverted those 13 paths to `HEAD` before committing; only the genuinely new file and the two intentional edits (`CLAUDE.md`, `skills/fk-storyboard-prompt.md`) landed. `dashboard/package-lock.json` also picked up minor macOS-optional-dependency drift from the `npm install` (added `@emnapi/*` wasm-build optional deps, flipped a few `dev` flags to `devOptional`) — benign, committed alongside.

`origin` for this checkout is `https://github.com/crisng95/flowkit`, the upstream maintainer's repo (commit author `Tuan Nguyen`, not this user) — not a fork this user owns. Commits from this session were made locally and were **not** pushed; pushing to a third party's repo needs explicit instruction, not a default action.

---
