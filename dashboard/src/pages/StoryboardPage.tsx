import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchAPI } from '../api/client'
import type { Project, Character, Video, Scene, Request } from '../types'
import { attemptCount, sceneStageStatus, type SceneStage } from '../lib/stageStats'
import { useTranslation } from '../i18n/useTranslation'
import { statusLabel, chainLabel } from '../i18n/labels'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import ProjectSwitcher from '../components/projects/ProjectSwitcher'
import StatusDot from '../components/ui/status-dot'

interface ActiveProject {
  project_id: string
}

function AttemptBadge({ n }: { n: number }) {
  const { t } = useTranslation()
  if (n === 0) return null
  const risky = n > 1
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] tracking-wide border"
      style={{
        borderColor: risky ? 'var(--red)' : 'var(--border)',
        color: risky ? 'var(--red)' : 'var(--muted)',
      }}
      title={risky ? t('storyboard.attempts.warning') : undefined}
    >
      {t('storyboard.attempts', { n })}
    </span>
  )
}

export default function StoryboardPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [scenesByVideo, setScenesByVideo] = useState<Record<string, Scene[]>>({})
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async (pid: string) => {
    setLoading(true)
    const [proj, chars, vids] = await Promise.all([
      fetchAPI<Project>(`/api/projects/${pid}`),
      fetchAPI<Character[]>(`/api/projects/${pid}/characters`),
      fetchAPI<Video[]>(`/api/videos?project_id=${pid}`),
    ])
    const sceneLists = await Promise.all(vids.map(v => fetchAPI<Scene[]>(`/api/scenes?video_id=${v.id}`)))
    const sbv: Record<string, Scene[]> = {}
    vids.forEach((v, i) => { sbv[v.id] = sceneLists[i] })
    const reqs = await fetchAPI<Request[]>(`/api/requests?project_id=${pid}`)
    setProject(proj)
    setCharacters(chars)
    setVideos(vids)
    setScenesByVideo(sbv)
    setRequests(reqs)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAPI<Project[]>('/api/projects').then(setProjects)
  }, [])

  useEffect(() => {
    if (id) { fetchAll(id); return }
    fetchAPI<ActiveProject>('/api/active-project')
      .then(active => navigate(`/storyboard/${active.project_id}`, { replace: true }))
      .catch(() => setLoading(false))
  }, [id, fetchAll, navigate])

  if (loading || !project) {
    return <div className="text-xs" style={{ color: 'var(--muted)' }}>{t('storyboard.loading')}</div>
  }

  const stages: SceneStage[] = ['image', 'video']

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-lg font-semibold" style={{ color: 'var(--text)' }}>{t('storyboard.title')}</h1>
        <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{t('storyboard.subtitle')}</span>
      </div>

      <ProjectSwitcher projects={projects} value={project.id} onChange={pid => navigate(`/storyboard/${pid}`)} />

      <Card className="py-4">
        <CardHeader>
          <CardTitle className="text-xs tracking-widest uppercase">{t('storyboard.entities', { n: characters.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {characters.length === 0 ? (
            <div className="text-xs" style={{ color: 'var(--muted)' }}>{t('storyboard.noEntities')}</div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
              {characters.map(ch => (
                <div key={ch.id} className="flex items-center gap-2 rounded-md p-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {ch.reference_image_url ? (
                    <img src={ch.reference_image_url} alt={ch.name} className="w-8 h-8 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded shrink-0" style={{ background: 'var(--muted)', opacity: 0.2 }} />
                  )}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[11px] font-medium truncate">{ch.name}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[8px]">{ch.entity_type}</Badge>
                      <StatusDot status={ch.media_id ? 'COMPLETED' : 'PENDING'} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {videos.map(v => {
        const scenes = (scenesByVideo[v.id] ?? []).slice().sort((a, b) => a.display_order - b.display_order)
        return (
          <Card key={v.id} className="py-4">
            <CardHeader>
              <CardTitle className="text-xs tracking-widest uppercase">{v.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {scenes.length === 0 ? (
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{t('storyboard.noScenes')}</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {scenes.map(s => {
                    const thumb = s.vertical_image_url || s.horizontal_image_url
                    return (
                      <div key={s.id} className="flex gap-3 rounded-md p-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <div className="shrink-0 rounded overflow-hidden flex items-center justify-center" style={{ width: 72, aspectRatio: '9/16', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                          {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <span className="text-[8px]" style={{ color: 'var(--muted)' }}>—</span>}
                        </div>
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-medium">{t('storyboard.scene', { n: s.display_order + 1 })}</span>
                            <Badge variant="outline" className="text-[8px]">{chainLabel(t, s.chain_type)}</Badge>
                            {stages.map(stage => {
                              const status = sceneStageStatus(s, stage)
                              const n = attemptCount(requests, s.id, stage)
                              return (
                                <span key={stage} className="inline-flex items-center gap-1 text-[9px]" style={{ color: 'var(--muted)' }}>
                                  <StatusDot status={status} />
                                  {stage}:{statusLabel(t, status)}
                                  <AttemptBadge n={n} />
                                </span>
                              )
                            })}
                          </div>
                          {s.video_prompt && (
                            <p className="text-[10px] line-clamp-2 m-0" style={{ color: 'var(--muted)' }}>{s.video_prompt}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
