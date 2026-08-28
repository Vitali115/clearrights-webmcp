import { useId, useState } from 'react'
import type { AgentActivity, ControlsAgentActivity } from '@/application'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { AgentMark } from '@/ui/AgentMark'

interface AgentActivityIndicatorProps {
  activity: AgentActivity | ControlsAgentActivity | null
  placement?: 'sheet' | 'page'
}

export function AgentActivityIndicator({ activity, placement = 'sheet' }: AgentActivityIndicatorProps) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()

  if (!activity) return null

  const pending = activity.status === 'opened'
  const onPage = placement === 'page'
  return (
    <div
      data-agent-indicator=""
      className={onPage ? 'relative z-40' : 'relative shrink-0'}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="relative rounded-full"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={pending ? 'Agent activity, new agent-opened view' : 'Agent activity, interaction recorded'}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
      >
        <AgentMark className="size-4" />
        {pending && (
          <span
            data-testid="agent-activity-dot"
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-blue-600 ring-2 ring-background"
            aria-hidden="true"
          />
        )}
      </Button>
      {open && (
        <div
          id={popoverId}
          role="status"
          className={`absolute top-10 z-20 w-[min(22rem,calc(100vw-2rem))] border border-foreground/10 bg-background p-4 text-foreground ${onPage ? 'right-0' : 'left-0'}`}
        >
          <div className="flex gap-3">
            {pending
              ? <span className="mt-2 size-2.5 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
              : <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><Check className="size-4" aria-hidden="true" /></span>}
            <div className="space-y-1">
              <p className="font-medium">{pending ? 'Opened by agent' : 'You interacted with this view'}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{activity.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
