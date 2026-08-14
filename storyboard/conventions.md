# Storyboard Conventions

The full rules live in `skills/fk-create-project.md` (entity/scene formulas, chain rules,
safe-language table) and `skills/fk-camera-guide.md` (Veo 3 vocabulary). This is the
checklist to run through before creating anything, not a replacement for reading those.

## Before writing a single prompt

1. **External brief?** (client script, Gemini/ChatGPT ad concept, Midjourney/Kling-style prompts) — run it through `/fk-storyboard-prompt` first. Don't hand-convert it; that skill exists because hand-converting misses the tool-specific syntax that causes silent generation errors.
2. **Scene count** — `ceil(target_duration_seconds / 8)`. Redistribute the brief's own scene timing across even 8s Veo 3 clips; don't copy uneven timing literally.
3. **Entities** — appearance goes in the entity `description`, never repeated in scene `prompt`/`video_prompt`. One base outfit per character.
4. **Real product/prop photos** — if the user supplies one, upload it (`/fk-upload-image`) and set it as the entity's `media_id` directly. Don't generate an AI approximation of a real product's packaging.

## Dialogue — the check that gets skipped

If any scene embeds character dialogue (`Character says: "line" (no subtitles)`),
**`allow_voice: true` must be set on the project** — at creation (`POST /api/projects`)
or immediately after (`PATCH /api/projects/<PID>`). Skipping this doesn't error — it
silently produces generic non-verbal vocalization instead of the written line, because
the worker appends its own `Audio: ...no narration, no voiceover.` to every prompt when
the flag is unset. See `issues.md` for the incident this was found in.

## Before generating video (not just images)

- **Check attempt history first**: `GET /api/requests?video_id=<VID>&type=GENERATE_VIDEO`, or the dashboard's Storyboard page. A retry on the workflow-schema response path resubmits a fresh generation every time — it is not a free re-poll. If a scene already has attempts, know that before triggering more; see `issues.md`.
- **Stuck in PROCESSING with a `Workflow polling timeout` error?** That's not slow rendering — it's a client-side polling bug (`skills/fk-doctor.md` § A2). Don't just wait longer or bump the timeout; it won't resolve on its own.

## Safe language

Run every prompt against the blocklist table in `fk-create-project.md` § Safe Prompt
Language before submitting — catches most `UNSAFE_GENERATION` failures before they cost
a generation attempt.
