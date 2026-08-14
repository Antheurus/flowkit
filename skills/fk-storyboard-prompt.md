Convert an external creative brief (client script, competitor breakdown, ChatGPT/Gemini-generated ad concept, reference video description) into a Flow-Kit-compliant storyboard — entities + scenes — ready for `/fk-create-project`.

Usage: `/fk-storyboard-prompt <brief text or file path> [--product-image <path>] [--duration <seconds>] [--language <id|en|...>]`

## Why this exists

Briefs written by a general chat model (or copied from a Midjourney/Kling/Runway/Luma workflow) are built for a **different tool** and fail — sometimes silently producing bad output, sometimes erroring — when fed straight into Flow Kit:

| What the brief does | Why it breaks here |
|---|---|
| Describes character appearance inside every scene prompt | Flow Kit refs (`imageInputs`) already carry appearance — restating it wastes tokens and can conflict with the ref |
| Tool flags: `--ar 9:16`, `--v 6`, `--style raw`, camera brand names as a suffix | Meaningless to Flow Kit's API — not parsed, just junk text the model has to ignore or misreads |
| One flat "visual prompt" per scene, no image/video split | Flow Kit needs a separate `prompt` (image) and `video_prompt` (Veo 3, 100-150 words, camera as its own sentence, Audio/SFX/Negative) |
| No chain awareness | Flow Kit scenes are ROOT or CONTINUATION (`fk-create-project.md`) — treating every scene as independent loses visual continuity a chain would give for free |
| Violent/aggressive wording left in (common in action or "villain" scripts) | Trips Google Flow's `UNSAFE_GENERATION` filter — the failure the user is usually debugging when they reach for this skill |

Running the brief through this conversion first is what "update because ntah gimana error beberapa kali" (fixing a prompt that kept erroring) actually means in practice.

## Step 1: Extract entities

Read the brief and pull out every recurring character, location, and prop/product into the `fk-create-project.md` entity shape — **name + appearance-only description**, nothing scene-specific:

- **Characters** — one base look, one outfit. If the brief gives the character multiple outfits per scene, keep only the default and push variants into scene prompts instead (`fk-create-project.md` Character rule).
- **Locations** — the recurring setting(s). A brief that treats "inside the mouth" or "the office" as a backdrop for multiple scenes should become one location entity, not restated prose each time.
- **Visual assets / products** — packaging, props, logos. **If the user supplies a real product photo** (`--product-image`), this entity skips AI generation entirely — see Step 6.

## Step 2: Segment into scenes

Compute scene count from the target duration: `ceil(duration_seconds / 8)` — Veo 3 clips are 8s. A brief's own scene breakdown (often uneven, e.g. 10s/16s/9s/10s) is a guide to *content*, not to be copied as literal timing; redistribute the content across N even 8s scenes.

State the redistribution to the user in one line if the total drifts from the requested duration (e.g. "4 scenes × 8s = 32s, close to your 30s ask").

## Step 3: Rewrite each scene — image prompt

Apply the Image Prompt Formula from `fk-create-project.md`:

```
[Subject] [action verb] [at/in Location]. [Specific visual detail]. [Camera/composition].
```

- Strip every tool flag (`--ar`, `--v`, `--style`, `--chaos`, camera-brand suffixes) — delete, don't translate.
- Strip appearance description — the entity's own `description` already carries it. Keep only pose/prop-in-hand if it's part of the action (e.g. "raises the needle" is action, "yellowish-brown tartar" is appearance — cut the second, keep the first).
- Reference entities **by name** — the name resolves to `character_names` on the scene, which resolves to `imageInputs`.

## Step 4: Rewrite each scene — video prompt (Veo 3)

Apply the 5-component structure from `fk-camera-guide.md`: `[Camera/Shot] + [Subject] + [Action] + [Setting] + [Style & Audio]`, 100-150 words, camera movement as its own sentence.

**Dialogue from the brief's "voiceover" lines usually belongs here, not in a separate narrator track** — if the brief's voiceover is characters talking (not off-screen narration), convert each line to Veo 3 native dialogue: `Character says: "line" (no subtitles)`. This skips the TTS/voice-template pipeline entirely for that content. Reserve `narrator_text` (`fk-gen-narrator.md`) for genuine off-screen narration the brief separates from character speech.

**If this step embeds any dialogue, `allow_voice: true` MUST be set on the project or the dialogue is silently discarded** — see the note in `fk-create-project.md` § Dialogue rules. Set it in the same `POST /api/projects` call this skill hands off to.

Always close with:
```
Audio: [ambient description].
SFX: [specific sound cues].
Negative: subtitles, watermark, text overlay.
```

## Step 5: Safe-language pass

Run every rewritten `prompt`, `video_prompt`, and entity `description` against the blocklist table in `fk-create-project.md` § Safe Prompt Language. A brief translated from another language (Malay, Vietnamese, etc.) can carry violent/aggressive words the original author didn't intend as graphic — check the **English rewrite**, not just the source text, since that's what reaches the filter.

## Step 6: Chain type per scene

Apply the ROOT/CONTINUATION rule from `fk-create-project.md` § Chain Structure Rules:
- Same character(s) + same/adjacent location + direct continuation → **CONTINUATION**, `parent_scene_id` = previous scene.
- Different character focus, different location, or a time skip → **ROOT**.

For a CONTINUATION scene with a child (i.e. something chains off it), write `transition_prompt` per `fk-create-project.md` § Transition Prompt — the full trajectory from this scene's frame to the child's frame. Leave it empty on ROOT scenes and leaf scenes.

## Step 7: Real product/prop photos skip generation

If `--product-image <path>` is given (a real product photo, logo, or packaging shot the user provides — accuracy matters more than a generated approximation):

1. `/fk-upload-image <path> --project <PID>` → get `media_id`
2. Create the entity with that `media_id` set directly (`fk-upload-image.md` Option C), or PATCH it onto an already-created entity
3. Do **not** include this entity in the `/fk-gen-refs` batch — it already has a `media_id`, so `GENERATE_CHARACTER_IMAGE` will skip it automatically, but confirm before spending a batch call on entities that don't need it

## Step 8: Output

Print the corrected storyboard:

```
ENTITIES
| Name | Type | Description (truncated) | Ref source |
|------|------|--------------------------|-----------|
| ... | character | ... | generate |
| ... | visual_asset | ... | uploaded photo (media_id set) |

SCENES (target: Nx8s ≈ Ns, requested Ms)
| # | chain_type | parent | prompt (truncated) | video_prompt (truncated) |
|---|-----------|--------|---------------------|---------------------------|
```

Then hand off directly into `/fk-create-project` Steps 1-3 (project + entities + video + scenes creation) using this corrected content — do not re-ask the user for the same information the brief already gave.
