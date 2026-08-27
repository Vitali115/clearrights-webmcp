import { useMemo, useState } from 'react'
import type { ActivityCoordinator } from '@/application'
import type { SiteGuideCatalog, SiteGuideRuntime, SiteGuideSnapshot } from '@/domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SiteGuidePanel({
  runtime,
  catalog,
  snapshot,
  activity,
}: {
  runtime: SiteGuideRuntime
  catalog: SiteGuideCatalog
  snapshot: SiteGuideSnapshot
  activity: ActivityCoordinator
}) {
  const [query, setQuery] = useState('')
  const [opening, setOpening] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const results = useMemo(() => catalog.search(query), [catalog, query])
  const categories = [...new Set(results.map(({ category }) => category))]

  const open = async (destinationId: string, label: string) => {
    setOpening(destinationId)
    setError(null)
    try {
      await runtime.navigate(destinationId, 'human')
      activity.record({
        source: 'human',
        module: 'site_guide',
        action: 'navigation',
        outcome: 'succeeded',
        summary: `You opened ${label}.`,
        targetId: destinationId,
      })
    } catch (cause) {
      activity.record({
        source: 'human',
        module: 'site_guide',
        action: 'navigation',
        outcome: 'failed',
        summary: `${label} could not be opened.`,
        targetId: destinationId,
      })
      setError(cause instanceof Error ? cause.message : 'The destination could not be opened.')
    } finally {
      setOpening(null)
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl p-5 sm:px-8 sm:py-7" aria-labelledby="controls-section-title">
      <h1 id="controls-section-title" tabIndex={-1} className="text-[22px] font-medium tracking-tight outline-none">Site guide</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Destinations declared by Waypoint. Search and open the same entries available to the agent.</p>
      <div className="mt-6">
        <Label htmlFor="site-guide-search" className="sr-only">Search site destinations</Label>
        <Input
          id="site-guide-search"
          type="search"
          value={query}
          placeholder="Search destinations"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {snapshot.currentDestinationId && (
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Last opened: {catalog.getDestination(snapshot.currentDestinationId).label}
        </p>
      )}
      <div className="mt-7 space-y-8">
        {categories.map((category) => (
          <section key={category} aria-labelledby={`site-guide-${category.replaceAll(' ', '-').toLowerCase()}`}>
            <h2 id={`site-guide-${category.replaceAll(' ', '-').toLowerCase()}`} className="text-[13px] font-medium text-muted-foreground">{category}</h2>
            <ul>
              {results.filter((destination) => destination.category === category).map((destination) => (
                <li key={destination.id} className="flex items-start justify-between gap-5 border-t border-foreground/10 py-4">
                  <div>
                    <p className="font-medium">{destination.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{destination.summary}</p>
                  </div>
                  <Button variant="outline" className="shrink-0 rounded-full" disabled={opening !== null} onClick={() => void open(destination.id, destination.label)}>
                    {opening === destination.id ? 'Opening…' : 'Open'}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {results.length === 0 && <p className="border-t border-foreground/10 py-8 text-sm text-muted-foreground">No declared destination matches this search.</p>}
      </div>
      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
    </section>
  )
}
