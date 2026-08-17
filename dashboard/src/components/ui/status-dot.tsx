import type { StatusType } from '../../types'
import { STATUS_COLOR } from '../../lib/statusColors'
import { cn } from '../../lib/utils'

interface StatusDotProps {
  status?: StatusType
  color?: string
  pulse?: boolean
  className?: string
}

export default function StatusDot({ status, color, pulse = false, className }: StatusDotProps) {
  const resolved = color ?? (status ? STATUS_COLOR[status] : 'var(--muted)')
  return (
    <span
      className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', className)}
      style={{ background: resolved, animation: pulse ? 'pulse 1.2s ease-in-out infinite' : undefined }}
    />
  )
}
