import type { AccessibilityState } from './model'

export interface AccessibilityRecord {
  schemaVersion: 1
  revision: number
  current: AccessibilityState
  previous: AccessibilityState | null
}

export interface AccessibilityRepository {
  load(): Promise<AccessibilityRecord>
  commit(expectedRevision: number, record: AccessibilityRecord): Promise<void>
}

export class AccessibilityRepositoryConflictError extends Error {
  readonly code = 'accessibility_repository_conflict'

  constructor() {
    super('Accessibility preferences changed before the operation could be committed.')
    this.name = 'AccessibilityRepositoryConflictError'
  }
}
