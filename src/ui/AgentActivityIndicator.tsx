import { useId, useState } from 'react'
import type { AgentActivity } from '@/application'
import { Button } from '@/components/ui/button'
import { Bot, Check, Sparkles } from 'lucide-react'

interface AgentActivityIndicatorProps {
  activity: AgentActivity | null
}

export function AgentActivityIndicator({ activity }: AgentActivityIndicatorProps) {
  const [open, setOpen] = useState(false)
  const popoverId = useId()

  if (!activity) return null

  const pending = activity.status === 'opened'
  return (
    <div className="absolute right-14 top-3 z-10">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative bg-background shadow-sm"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={pending ? 'Agent activity, view awaiting review' : 'Agent activity, view review started'}
        onClick={() => setOpen((current) => !current)}
      >
        <Bot data-icon="inline-start" />
        <span className="hidden sm:inline">Agent activity</span>
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
          className="absolute right-0 top-11 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg"
        >
          <div className="flex gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              {pending ? <Sparkles className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
            </span>
            <div className="space-y-1">
              <p className="font-medium">{pending ? 'Agent-opened view' : 'You started reviewing this view'}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{activity.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
