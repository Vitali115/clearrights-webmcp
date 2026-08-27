import { useState } from 'react'
import type { ActivityCoordinator } from '@/application'
import type { SiteGuideCatalog, SiteGuideRuntime, SiteGuideSnapshot } from '@/domain'
import { Button } from '@/components/ui/button'

export function SiteGuidePanel({
  runtime,
  catalog,
  snapshot,
  activity,
  destinationIds,
}: {
  runtime: SiteGuideRuntime
  catalog: SiteGuideCatalog
  snapshot: SiteGuideSnapshot
  activity: ActivityCoordinator
  destinationIds: readonly string[]
}) {
  const [opening, setOpening] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const destinations = destinationIds.map((id) => catalog.getDestination(id))
  const currentDestination = snapshot.currentDestinationId
    ? destinations.find(({ id }) => id === snapshot.currentDestinationId)
    : undefined

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
    <section className="mx-auto w-full max-w-3xl p-5 sm:px-8 sm:py-7" aria-labelledby="related-privacy-pages-title">
      <h1 id="related-privacy-pages-title" tabIndex={-1} className="text-[22px] font-medium tracking-tight outline-none">Related privacy pages</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Pages declared by Waypoint and available to both people and compatible agents.</p>
      {currentDestination && (
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Last opened: {currentDestination.label}
        </p>
      )}
      <ul className="mt-7">
        {destinations.map((destination) => (
          <li key={destination.id} className="flex items-start justify-between gap-5 border-t border-foreground/10 py-4">
            <div>
              <p className="font-medium">{destination.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{destination.summary}</p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 rounded-full"
              aria-label={`Open ${destination.label}`}
              disabled={opening !== null}
              onClick={() => void open(destination.id, destination.label)}
            >
              {opening === destination.id ? 'Opening…' : 'Open'}
            </Button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-5 text-sm text-destructive">{error}</p>}
    </section>
  )
}
