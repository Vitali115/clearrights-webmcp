import type { ActivitySnapshot } from '@/application'

export function ActivityPanel({ snapshot }: { snapshot: ActivitySnapshot }) {
  return (
    <section className="mx-auto w-full max-w-3xl p-5 sm:px-8 sm:py-7" aria-labelledby="controls-section-title">
      <h1 id="controls-section-title" tabIndex={-1} className="text-[22px] font-medium tracking-tight outline-none">Activity</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Session-only actions across Privacy, Accessibility, and Site guide. Prompts and raw payloads are not stored.</p>
      {snapshot.events.length === 0 ? (
        <div className="mt-7 border-t border-foreground/10 py-8">
          <p className="font-medium">No activity in this session</p>
          <p className="mt-1 text-sm text-muted-foreground">Human and agent actions will appear here.</p>
        </div>
      ) : (
        <ol className="mt-7">
          {[...snapshot.events].reverse().map((event) => (
            <li key={event.id} className="border-t border-foreground/10 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium capitalize">{event.source} · {event.module.replace('_', ' ')}</p>
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
