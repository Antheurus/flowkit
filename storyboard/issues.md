# Production Issues Log

Real issues found while actually running a storyboard through the Flow Kit pipeline —
what happened, root cause, and what to check next time. Full technical detail lives in
`skills/fk-doctor.md`; this is the short version tied to when it was actually hit.

---

## 2026-08-14 — Sensodyne project: dialogue silently discarded

**Symptom:** all 4 scenes generated with no spoken dialogue — generic non-verbal sound
instead of the `Character says: "..."` lines written in each `video_prompt`.

**Root cause:** the project was created without `allow_voice: true`. The worker appends
`"Audio: ...no narration, no voiceover."` to every prompt when that flag is unset,
directly after the dialogue lines — Veo 3 received contradictory instructions in the
same prompt.

**Check next time:** set `allow_voice: true` at project creation whenever the storyboard
embeds dialogue. See `conventions.md` § Dialogue.

---

## 2026-08-14 — Sensodyne project: 2-3x duplicate videos in Flow

**Symptom:** user found the same scenes duplicated/tripled in the Flow project media
library after a `GENERATE_VIDEO` batch repeatedly failed and was retried.

**Root cause:** the failures were caused by a separate bug (`Workflow polling timeout` —
see below), and every retry attempt — including ones triggered by restarting the agent
mid-diagnosis — resubmitted a brand new generation to Flow rather than re-checking an
existing one. Assumed retries were free re-polls; they weren't, for this response path.

**Check next time:** before retrying a `GENERATE_VIDEO` request (manually or via an agent
restart), check `GET /api/requests?video_id=<VID>&type=GENERATE_VIDEO` for prior attempts
on the same scene. Duplicates already in Flow can only be cleaned up from Flow's own UI.

---

## 2026-08-14 — Sensodyne project: video generation stuck in PROCESSING, never completes

**Symptom:** `GENERATE_VIDEO` requests sat `PROCESSING` for 20+ minutes with
`error_message: "Workflow polling timeout after <N>s"`, regardless of how high
`VIDEO_POLL_TIMEOUT` was raised.

**Root cause:** not a timing issue. Flow's newer "workflow schema" response includes a
`primaryMediaId` that isn't a valid argument to the `GET /v1/media/{id}` endpoint the
polling code reuses — every poll returned a permanent `400 INVALID_ARGUMENT`, which the
code misread as "still generating." No timeout could have fixed it.

**Check next time:** don't just raise the timeout and wait. See `skills/fk-doctor.md`
§ A2 for the full diagnosis and the current workaround (open the project in
`labs.google/fx/tools/flow` in Chrome to recover real state via the extension's passive
TRPC intercept).
