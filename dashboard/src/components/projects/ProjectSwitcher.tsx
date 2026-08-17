import type { Project } from '../../types'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'

const MAX_NAME_LENGTH = 20

function truncateName(name: string) {
  return name.length > MAX_NAME_LENGTH ? `${name.slice(0, MAX_NAME_LENGTH)}...` : name
}

interface ProjectSwitcherProps {
  projects: Project[]
  value: string
  onChange: (projectId: string) => void
  className?: string
}

export default function ProjectSwitcher({ projects, value, onChange, className }: ProjectSwitcherProps) {
  if (projects.length === 0) return null

  return (
    <div className={className}>
      <Tabs value={value} onValueChange={onChange}>
        <div className="overflow-x-auto">
          <TabsList
            variant="line"
            className="h-auto w-max justify-start gap-4 rounded-none border-b border-[var(--border)] p-0 pb-px"
          >
            {projects.map(p => (
              <TabsTrigger
                key={p.id}
                value={p.id}
                title={p.name}
                className="shrink-0 rounded-none px-0.5 py-2 text-[11px] tracking-wide"
              >
                {truncateName(p.name)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  )
}
