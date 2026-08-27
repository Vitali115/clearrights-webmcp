import {
  RepositoryConflictError,
  type PrivacyEnforcementAdapter,
  type PrivacyRecord,
  type PrivacyRepository,
  type ProcessingState,
} from '@clearrights/sdk/privacy'
import {
  AccessibilityRepositoryConflictError,
  type AccessibilityEnforcementAdapter,
  type AccessibilityRecord,
  type AccessibilityRepository,
  type AccessibilityState,
} from '@clearrights/sdk/accessibility'
import type { SiteNavigationAdapter } from '@clearrights/sdk/site-guide'

export class MemoryPrivacyRepository implements PrivacyRepository {
  private record: PrivacyRecord
  private readonly seed: PrivacyRecord

  constructor(record: PrivacyRecord, seed: PrivacyRecord = record) {
    this.record = clone(record)
    this.seed = clone(seed)
  }

  async load() {
    return clone(this.record)
  }

  async commit(expectedRevision: number, record: PrivacyRecord) {
    if (this.record.state.revision !== expectedRevision) throw new RepositoryConflictError()
    this.record = clone(record)
  }

  async reset(expectedRevision: number) {
    if (this.record.state.revision !== expectedRevision) throw new RepositoryConflictError()
    this.record = clone(this.seed)
    return this.load()
  }
}

export class MemoryPrivacyAdapter implements PrivacyEnforcementAdapter {
  readonly id = 'minimal-memory-privacy'
  readonly scope = 'local_demo' as const
  private state: ProcessingState

  constructor(state: ProcessingState) {
    this.state = clone(state)
  }

  async apply({ target }: { target: ProcessingState }) {
    this.state = clone(target)
  }

  async readCurrentState() {
    return clone(this.state)
  }
}

export class MemoryAccessibilityRepository implements AccessibilityRepository {
  private record: AccessibilityRecord

  constructor(record: AccessibilityRecord) {
    this.record = clone(record)
  }

  async load() {
    return clone(this.record)
  }

  async commit(expectedRevision: number, record: AccessibilityRecord) {
    if (this.record.revision !== expectedRevision) throw new AccessibilityRepositoryConflictError()
    this.record = clone(record)
  }
}

export class MemoryAccessibilityAdapter implements AccessibilityEnforcementAdapter {
  readonly id = 'minimal-memory-accessibility'
  readonly scope = 'local_demo' as const
  private state: AccessibilityState

  constructor(state: AccessibilityState) {
    this.state = clone(state)
  }

  async apply({ target }: { target: AccessibilityState }) {
    this.state = clone(target)
  }

  async readCurrentState() {
    return clone(this.state)
  }
}

export class MemoryNavigationAdapter implements SiteNavigationAdapter {
  readonly id = 'minimal-memory-navigation'

  async navigate(command: Parameters<SiteNavigationAdapter['navigate']>[0]) {
    const location = command.target.kind === 'route'
      ? `${command.target.path}${command.target.hash ?? ''}`
      : `panel:${command.target.panel}/${command.target.section}`
    return { location }
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
