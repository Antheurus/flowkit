import type { StatusType } from '../types'

export const STATUS_COLOR: Record<StatusType, string> = {
  COMPLETED: 'var(--green)',
  PROCESSING: 'var(--yellow)',
  PENDING: 'var(--muted)',
  FAILED: 'var(--red)',
}

export const VERDICT_COLORS: Record<string, string> = {
  excellent: 'var(--green)',
  good: 'var(--green)',
  acceptable: 'var(--yellow)',
  poor: 'var(--red)',
  unusable: 'var(--red)',
}
