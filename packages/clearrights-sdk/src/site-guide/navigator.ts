import type { SiteDestinationTarget } from './model'

export interface SiteNavigationAdapter {
  readonly id: string
  navigate(command: {
    destinationId: string
    target: SiteDestinationTarget
  }): Promise<{ location: string }>
}
