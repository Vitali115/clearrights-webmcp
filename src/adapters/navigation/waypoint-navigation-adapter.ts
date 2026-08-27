import type {
  SiteGuidePanelSection,
  SiteNavigationOrigin,
  SiteNavigationAdapter,
  SiteDestinationTarget,
} from '@clearrights/sdk/site-guide'

export interface WaypointNavigationHost {
  openRoute(path: string, hash: string | undefined, context: NavigationContext): void | Promise<void>
  openPanel(section: SiteGuidePanelSection, context: NavigationContext): void | Promise<void>
  getLocation(): string
}

export interface NavigationContext {
  origin: SiteNavigationOrigin
  destinationId: string
  label: string
}

export class WaypointNavigationAdapter implements SiteNavigationAdapter {
  readonly id = 'waypoint-visible-navigation'

  constructor(host: WaypointNavigationHost) {
    this.host = host
  }

  private readonly host: WaypointNavigationHost

  async navigate({
    destinationId,
    label,
    target,
    origin,
  }: {
    destinationId: string
    label: string
    target: SiteDestinationTarget
    origin: SiteNavigationOrigin
  }): Promise<{ location: string }> {
    const context = { destinationId, label, origin }
    if (target.kind === 'route') {
      await this.host.openRoute(target.path, target.hash, context)
    } else {
      await this.host.openPanel(target.section, context)
    }
    return { location: this.host.getLocation() }
  }
}
