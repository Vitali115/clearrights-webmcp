import type { ActivitySnapshot } from '@/application'
import { AgentMark } from '@/ui/AgentMark'

export function ActivityPanel({ snapshot }: { snapshot: ActivitySnapshot }) {
  return (
    <section className="mx-auto w-full max-w-3xl p-5 sm:px-8 sm:py-7" aria-labelledby="activity-section-title">
      {snapshot.events.length === 0 ? (
        <div className="border-t border-foreground/10 py-8">
          <p className="font-medium">No activity in this session</p>
          <p className="mt-1 text-sm text-muted-foreground">Human and agent actions will appear here.</p>
        </div>
      ) : (
        <ol className="mt-7">
          {[...snapshot.events].reverse().map((event) => (
            <li key={event.id} className="border-t border-foreground/10 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex min-w-0 items-center gap-1 text-sm font-medium">
                  {event.source === 'agent' ? <AgentMark /> : null}
                  <span className="capitalize">{event.source} · {event.module.replace('_', ' ')}</span>
                </p>
                <time className="text-xs text-muted-foreground" dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</time>
              </div>
              <p className="mt-1 text-sm">{event.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">{event.outcome} · {event.action}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
