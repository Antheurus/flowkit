import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

interface AccentCardProps extends ComponentProps<'div'> {
  accentColor: string
  /** 'flag' — neutral border, colored left accent, plain surface bg (review verdicts, graded findings).
   *  'alert' — border and left accent both colored, tinted background (hard failures, active state). */
  variant?: 'flag' | 'alert'
}

export default function AccentCard({ accentColor, variant = 'flag', className, style: styleProp, children, ...props }: AccentCardProps) {
  const style =
    variant === 'alert'
      ? {
          border: `1px solid ${accentColor}`,
          borderLeftWidth: 3,
          background: `color-mix(in oklab, ${accentColor} 8%, var(--card))`,
        }
      : {
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${accentColor}`,
          background: 'var(--surface)',
        }

  return (
    <div className={cn('rounded-md', className)} style={{ ...style, ...styleProp }} {...props}>
      {children}
    </div>
  )
}
