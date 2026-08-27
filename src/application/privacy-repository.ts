import type { PrivacyReceipt, UserPrivacyState } from '@/domain'

export interface PrivacyRecord {
  schemaVersion: 1
  state: UserPrivacyState
  latestReceipt: PrivacyReceipt | null
}

export interface PrivacyRepository {
  load(): Promise<PrivacyRecord>
  commit(expectedRevision: number, record: PrivacyRecord): Promise<void>
  reset(expectedRevision: number): Promise<PrivacyRecord>
}

export class RepositoryConflictError extends Error {
  readonly code = 'repository_conflict'

  constructor(message = 'Privacy state changed after the plan was staged.') {
    super(message)
    this.name = 'RepositoryConflictError'
  }
}
