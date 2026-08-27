import type { PrivacyReceipt, UserPrivacyState } from '@/domain'

export const PRIVACY_RECEIPT_HISTORY_LIMIT = 10

export interface PrivacyRecord {
  schemaVersion: 2
  state: UserPrivacyState
  receipts: PrivacyReceipt[]
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
