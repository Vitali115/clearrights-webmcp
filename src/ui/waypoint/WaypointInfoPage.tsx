import type { ReactNode } from 'react'
import type { WaypointInfoPageDefinition } from '@/demo/waypoint/info-pages'
import { Button } from '@/components/ui/button'

export function WaypointInfoPage({
  page,
  controlsAction,
  agentActivityAction,
  onBack,
}: {
  page: WaypointInfoPageDefinition
  controlsAction: ReactNode
  agentActivityAction?: ReactNode
  onBack(): void
}) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b border-foreground/10">
        <div className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8">
          <button type="button" className="font-medium tracking-tight" onClick={onBack}>Waypoint</button>
          <nav className="flex items-center gap-1" aria-label="Waypoint information navigation">
            <Button variant="ghost" className="h-9 rounded-full px-4" onClick={onBack}>Back</Button>
            {agentActivityAction}
            {controlsAction}
          </nav>
        </div>
      </header>

      <article className="mx-auto w-[min(48rem,calc(100%-2.5rem))] py-14 sm:w-[min(48rem,calc(100%-4rem))] sm:py-20">
        <p className="text-sm font-medium text-muted-foreground">{page.eyebrow}</p>
        <h1
          tabIndex={-1}
          data-route-focus
          className="mt-4 font-heading text-[clamp(2.5rem,7vw,4.75rem)] font-medium leading-[0.98] tracking-[-0.045em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {page.title}
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">{page.summary}</p>

        <div className="mt-14 border-t border-foreground/10">
          {page.sections.map((section) => (
            <section key={section.heading} className="grid gap-4 border-b border-foreground/10 py-8 sm:grid-cols-[12rem_1fr]">
              <h2 className="text-base font-medium tracking-tight">{section.heading}</h2>
              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
          Waypoint Travel is fictional. This page exists to demonstrate a developer-declared Site Guide destination.
        </p>
      </article>
    </main>
  )
}
