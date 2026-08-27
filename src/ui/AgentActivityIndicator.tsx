import { useId, useState } from 'react'
import type { AgentActivity, ControlsAgentActivity } from '@/application'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface AgentActivityIndicatorProps {
  activity: AgentActivity | ControlsAgentActivity | null
  placement?: 'sheet' | 'page'
}

export function AgentActivityIndicator({ activity, placement = 'sheet' }: AgentActivityIndicatorProps) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()

  if (!activity) return null

  const pending = activity.status === 'opened'
  return (
    <div className={placement === 'page' ? 'relative z-40' : 'absolute right-14 top-3 z-10'}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="relative h-8 rounded-full bg-foreground/5 px-3"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={pending ? 'Agent activity, new agent-opened view' : 'Agent activity, interaction recorded'}
        onClick={() => setOpen((current) => !current)}
      >
        <span>Agent</span>
        {pending && (
          <span
            data-testid="agent-activity-dot"
            className="absolute -right-1 -top-1 size-2.5 rounded-full bg-blue-600 ring-2 ring-background"
            aria-hidden="true"
          />
        )}
      </Button>
      {open && (
        <div
          id={popoverId}
          role="status"
          className="absolute right-0 top-11 w-[min(22rem,calc(100vw-2rem))] border border-foreground/10 bg-background p-4 text-foreground"
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
