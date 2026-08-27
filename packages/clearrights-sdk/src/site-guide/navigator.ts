import type { SiteDestinationTarget, SiteNavigationOrigin } from './model'

export interface SiteNavigationAdapter {
  readonly id: string
  navigate(command: {
    destinationId: string
    label: string
    target: SiteDestinationTarget
    origin: SiteNavigationOrigin
  }): Promise<{ location: string }>
}
