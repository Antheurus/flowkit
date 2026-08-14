# New Storyboard — <project name>

Copy this file, fill it in, then hand it to `/fk-create-project` (or `/fk-storyboard-prompt`
first if starting from an external brief). Read `conventions.md` before filling this in.

## Project

- **Name:**
- **Story (1-2 sentences):**
- **Material:** (`GET /api/materials` for options)
- **Orientation:** VERTICAL | HORIZONTAL
- **Language:**
- **Uses embedded character dialogue?** yes/no — if yes: `allow_voice: true` at creation, no exceptions.
- **Target duration:** ___s → scene count = ceil(duration / 8)

## Entities

| Name | Type | Description (appearance only) | Ref source |
|------|------|-------------------------------|-----------|
| | character/location/visual_asset | | generate / real photo (`--product-image`) |

## Scenes

| # | chain_type | parent | prompt (image) | video_prompt (Veo 3, 100-150 words) | dialogue? |
|---|-----------|--------|-----------------|--------------------------------------|-----------|
| 0 | ROOT | | | | |

## Pre-flight checklist

- [ ] Every scene prompt checked against the safe-language blocklist
- [ ] No character appearance repeated in `prompt`/`video_prompt` (refs handle it)
- [ ] `allow_voice` set correctly if any scene has dialogue
- [ ] Chain types follow the ROOT/CONTINUATION rule (same character+location = CONTINUATION)
- [ ] Real product/prop photos uploaded via `/fk-upload-image`, not generated
