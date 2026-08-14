import type { Character, Request, Scene, StatusType } from '../types'

export type SceneStage = 'image' | 'video' | 'upscale'

export interface StageCount {
  done: number
  processing: number
  failed: number
  pending: number
  total: number
}

export function count(statuses: StatusType[]): StageCount {
  return {
    done: statuses.filter(s => s === 'COMPLETED').length,
    processing: statuses.filter(s => s === 'PROCESSING').length,
    failed: statuses.filter(s => s === 'FAILED').length,
    pending: statuses.filter(s => s === 'PENDING').length,
    total: statuses.length,
  }
}

export function sceneStageStatus(scene: Scene, stage: SceneStage): StatusType {
  if (stage === 'image') return scene.vertical_image_status !== 'PENDING' ? scene.vertical_image_status : scene.horizontal_image_status
  if (stage === 'video') return scene.vertical_video_status !== 'PENDING' ? scene.vertical_video_status : scene.horizontal_video_status
  return scene.vertical_upscale_status !== 'PENDING' ? scene.vertical_upscale_status : scene.horizontal_upscale_status
}

export function charStatus(c: Character, requests: Request[]): StatusType {
  if (c.media_id) return 'COMPLETED'
  const reqs = requests.filter(r => r.character_id === c.id)
  if (reqs.some(r => r.status === 'PROCESSING')) return 'PROCESSING'
  if (reqs.some(r => r.status === 'FAILED')) return 'FAILED'
  return 'PENDING'
}

export const STAGE_TYPES: Record<SceneStage, string[]> = {
  image: ['GENERATE_IMAGE', 'REGENERATE_IMAGE', 'EDIT_IMAGE'],
  video: ['GENERATE_VIDEO', 'REGENERATE_VIDEO'],
  upscale: ['UPSCALE_VIDEO'],
}

export function latestRequest(requests: Request[], sceneId: string, stage: SceneStage): Request | undefined {
  return requests
    .filter(r => r.scene_id === sceneId && STAGE_TYPES[stage].includes(r.type))
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0]
}

/**
 * Total real generation calls sent for this scene+stage across ALL request rows —
 * not just the latest row's retry_count. On the workflow-schema video path a retry
 * resubmits a fresh generation rather than re-polling (see skills/fk-doctor.md § retry
 * policy), so retry_count alone undercounts what actually happened. Sum retry_count+1
 * per row (each row is itself retry_count+1 real attempts) to get the true total.
 */
export function attemptCount(requests: Request[], sceneId: string, stage: SceneStage): number {
  return requests
    .filter(r => r.scene_id === sceneId && STAGE_TYPES[stage].includes(r.type))
    .reduce((sum, r) => sum + r.retry_count + 1, 0)
}

/** Per-video stage completion %, used by Dashboard throughput and project stage-rollup cards. */
export function videoStageBreakdown(scenes: Scene[]): Record<SceneStage, StageCount> {
  return {
    image: count(scenes.map(s => sceneStageStatus(s, 'image'))),
    video: count(scenes.map(s => sceneStageStatus(s, 'video'))),
    upscale: count(scenes.map(s => sceneStageStatus(s, 'upscale'))),
  }
}
