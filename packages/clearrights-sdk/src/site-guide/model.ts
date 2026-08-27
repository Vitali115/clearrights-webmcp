export type SiteGuidePanelSection = 'privacy' | 'accessibility' | 'activity'

export type SiteDestinationTarget =
  | { kind: 'route'; path: string; hash?: string }
  | {
      kind: 'panel'
      panel: 'personal_controls'
      section: SiteGuidePanelSection
    }

export interface SiteDestinationDefinition {
  id: string
  label: string
  summary: string
  category: string
  keywords: readonly string[]
  target: SiteDestinationTarget
}

export type SiteNavigationOrigin = 'human' | 'agent'

export interface SiteNavigationResult {
  destinationId: string
  label: string
  target: SiteDestinationTarget
  origin: SiteNavigationOrigin
  location: string
}

export class SiteGuideError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'SiteGuideError'
    this.code = code
  }
}
