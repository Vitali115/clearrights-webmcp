import type { SiteGuideCatalog } from './catalog'
import type { SiteNavigationAdapter } from './navigator'
import type { SiteNavigationOrigin, SiteNavigationResult } from './model'

export interface SiteGuideSnapshot {
  catalogVersion: string
  currentDestinationId: string | null
  lastNavigation: SiteNavigationResult | null
}

export interface SiteGuideRuntime {
  getSnapshot(): SiteGuideSnapshot
  subscribe(listener: (snapshot: SiteGuideSnapshot) => void): () => void
  navigate(destinationId: string, origin: SiteNavigationOrigin): Promise<SiteNavigationResult>
}

export function createSiteGuideRuntime({
  catalog,
  navigator,
}: {
  catalog: SiteGuideCatalog
  navigator: SiteNavigationAdapter
}): SiteGuideRuntime {
  let snapshot: SiteGuideSnapshot = {
    catalogVersion: catalog.version,
    currentDestinationId: null,
    lastNavigation: null,
  }
  const listeners = new Set<(snapshot: SiteGuideSnapshot) => void>()
  const publish = (next: SiteGuideSnapshot) => {
    snapshot = clone(next)
    const publicSnapshot = clone(snapshot)
    for (const listener of listeners) listener(publicSnapshot)
  }

  return {
    getSnapshot: () => clone(snapshot),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async navigate(destinationId, origin) {
      const destination = catalog.getDestination(destinationId)
      const opened = await navigator.navigate({
        destinationId,
        label: destination.label,
        target: clone(destination.target),
        origin,
      })
      const result: SiteNavigationResult = {
        destinationId,
        label: destination.label,
        target: clone(destination.target),
        origin,
        location: opened.location,
      }
      publish({
        catalogVersion: catalog.version,
        currentDestinationId: destinationId,
        lastNavigation: result,
      })
      return clone(result)
    },
  }
}

function clone<T>(value: T): T {
  if (value === null) return value
  return JSON.parse(JSON.stringify(value)) as T
}
