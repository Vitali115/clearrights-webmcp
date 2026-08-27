import type {
  SiteGuidePanelSection,
  SiteNavigationAdapter,
  SiteDestinationTarget,
} from '@clearrights/sdk/site-guide'

export interface WaypointNavigationHost {
  openRoute(path: string, hash?: string): void | Promise<void>
  openPanel(section: SiteGuidePanelSection): void | Promise<void>
  getLocation(): string
}

export class WaypointNavigationAdapter implements SiteNavigationAdapter {
  readonly id = 'waypoint-visible-navigation'

  constructor(host: WaypointNavigationHost) {
    this.host = host
  }

  private readonly host: WaypointNavigationHost

  async navigate({ target }: { destinationId: string; target: SiteDestinationTarget }): Promise<{ location: string }> {
    if (target.kind === 'route') {
      await this.host.openRoute(target.path, target.hash)
    } else {
      await this.host.openPanel(target.section)
    }
    return { location: this.host.getLocation() }
  }
}
