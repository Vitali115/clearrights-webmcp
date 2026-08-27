import type { PrivacyReceipt, UserPrivacyState } from '@/domain'
import {
  PRIVACY_RECEIPT_HISTORY_LIMIT,
  RepositoryConflictError,
  type PrivacyRecord,
  type PrivacyRepository,
} from '@/application'
import { travelCatalog } from '@/demo/travel-catalog'
import { z } from 'zod'

export const PRIVACY_STORAGE_KEY = 'clearrights.demo.v3'
export const LEGACY_V2_PRIVACY_STORAGE_KEY = 'clearrights.demo.v2'
export const LEGACY_PRIVACY_STORAGE_KEY = 'clearrights.demo.v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const processingIdSchema = z.enum(
  travelCatalog.processing.map(({ id }) => id) as [string, ...string[]],
)

const processingStateSchema = z.object(Object.fromEntries(
  travelCatalog.processing.map(({ id }) => [id, z.boolean()]),
)).strict().superRefine((state, context) => {
  for (const id of travelCatalog.processing.filter(({ locked }) => locked).map(({ id }) => id)) {
    if (!state[id]) {
      context.addIssue({
        code: 'custom',
        path: [id],
        message: 'Required processing must remain enabled.',
      })
    }
  }
})

const changeSchema = z.object({
  processingId: processingIdSchema,
  label: z.string(),
  before: z.boolean(),
  after: z.boolean(),
  reason: z.string(),
}).strict()

const legacyReceiptSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  catalogVersion: z.string().min(1),
  issuedAt: z.string().min(1),
  reviewedAt: z.string().min(1),
  beforeRevision: z.number().int().positive(),
  afterRevision: z.number().int().positive(),
  changes: z.array(changeSchema),
  finalState: processingStateSchema,
  verified: z.literal(true),
  verification: z.object({
    observedRevision: z.number().int().positive(),
    method: z.literal('persisted_state_readback'),
  }).strict(),
}).strict()

const receiptSchema = legacyReceiptSchema.extend({
  kind: z.enum(['initial_choice', 'settings_change']),
  noticeVersion: z.string().min(1),
  approvalMethod: z.enum(['banner_button', 'review_hold']),
  preparationOrigin: z.enum(['page_ui', 'webmcp_tool']),
  choiceMethod: z.enum(['accept_all', 'essential_only', 'managed_settings']).nullable(),
  verification: z.object({
    observedRevision: z.number().int().positive(),
    method: z.literal('persisted_state_readback'),
    adapterId: z.string().min(1),
    scope: z.enum(['local_demo', 'external']),
  }).strict(),
}).strict()

const stateSchema = z.object({
  revision: z.number().int().positive(),
  processing: processingStateSchema,
}).strict()

const legacyRecordSchema = z.object({
  schemaVersion: z.literal(1),
  state: stateSchema,
  latestReceipt: legacyReceiptSchema.nullable(),
}).strict()

const v2RecordSchema = z.object({
  schemaVersion: z.literal(2),
  state: stateSchema,
  receipts: z.array(legacyReceiptSchema).max(PRIVACY_RECEIPT_HISTORY_LIMIT),
}).strict()

const recordSchema = z.object({
  schemaVersion: z.literal(3),
  state: stateSchema,
  notice: z.object({
    version: z.string().min(1),
    status: z.enum(['pending', 'recorded']),
    recordedAt: z.string().min(1).nullable(),
    method: z.enum(['accept_all', 'essential_only', 'managed_settings']).nullable(),
  }).strict().superRefine((notice, context) => {
    const complete = notice.recordedAt !== null && notice.method !== null
    if ((notice.status === 'recorded') !== complete) {
      context.addIssue({
        code: 'custom',
        message: 'A recorded notice requires both timestamp and method.',
      })
    }
  }),
  receipts: z.array(receiptSchema).max(PRIVACY_RECEIPT_HISTORY_LIMIT),
}).strict()

export class LocalStoragePrivacyRepository implements PrivacyRepository {
  private readonly storage: StorageLike
  private readonly createSeed: () => UserPrivacyState
  private readonly noticeVersion: string

  constructor(
    storage: StorageLike,
    createSeed: () => UserPrivacyState,
    noticeVersion = travelCatalog.noticeVersion,
  ) {
    this.storage = storage
    this.createSeed = createSeed
    this.noticeVersion = noticeVersion
  }

  async load(): Promise<PrivacyRecord> {
    const stored = this.storage.getItem(PRIVACY_STORAGE_KEY)
    if (stored) {
      try {
        return recordSchema.parse(JSON.parse(stored)) as PrivacyRecord
      } catch {
        return this.writeSeed()
      }
    }

    const v2 = this.storage.getItem(LEGACY_V2_PRIVACY_STORAGE_KEY)
    if (v2) {
      try {
        const parsed = v2RecordSchema.parse(JSON.parse(v2))
        const migrated = this.migrateRecord(parsed.state, parsed.receipts)
        this.storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(migrated))
        this.storage.removeItem(LEGACY_V2_PRIVACY_STORAGE_KEY)
        return migrated
      } catch {
        this.storage.removeItem(LEGACY_V2_PRIVACY_STORAGE_KEY)
        return this.writeSeed()
      }
    }

    const legacy = this.storage.getItem(LEGACY_PRIVACY_STORAGE_KEY)
    if (legacy) {
      try {
        const parsed = legacyRecordSchema.parse(JSON.parse(legacy))
        const migrated = this.migrateRecord(parsed.state, parsed.latestReceipt ? [parsed.latestReceipt] : [])
        this.storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(migrated))
        this.storage.removeItem(LEGACY_PRIVACY_STORAGE_KEY)
        return migrated
      } catch {
        this.storage.removeItem(LEGACY_PRIVACY_STORAGE_KEY)
        return this.writeSeed()
      }
    }

    return this.writeSeed()
  }

  async commit(expectedRevision: number, record: PrivacyRecord): Promise<void> {
    const current = await this.load()
    if (current.state.revision !== expectedRevision) throw new RepositoryConflictError()
    if (record.state.revision !== expectedRevision + 1) {
      throw new RepositoryConflictError('A commit must advance the privacy revision by one.')
    }
    const validated = recordSchema.parse(record)
    this.storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(validated))
  }

  async reset(expectedRevision: number): Promise<PrivacyRecord> {
    const current = await this.load()
    if (current.state.revision !== expectedRevision) throw new RepositoryConflictError()
    const seed = this.createSeed()
    const resetRecord: PrivacyRecord = {
      schemaVersion: 3,
      state: {
        ...seed,
        revision: expectedRevision + 1,
      },
      notice: pendingNotice(this.noticeVersion),
      receipts: [],
    }
    const validated = recordSchema.parse(resetRecord) as PrivacyRecord
    this.storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(validated))
    return validated
  }

  private migrateRecord(
    state: UserPrivacyState,
    receipts: readonly z.infer<typeof legacyReceiptSchema>[],
  ): PrivacyRecord {
    return recordSchema.parse({
      schemaVersion: 3,
      state,
      notice: pendingNotice(this.noticeVersion),
      receipts: receipts.map((receipt) => migrateReceipt(receipt, this.noticeVersion)),
    }) as PrivacyRecord
  }

  private writeSeed(): PrivacyRecord {
    const record: PrivacyRecord = {
      schemaVersion: 3,
      state: this.createSeed(),
      notice: pendingNotice(this.noticeVersion),
      receipts: [],
    }
    const validated = recordSchema.parse(record) as PrivacyRecord
    this.storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(validated))
    return validated
  }
}

function pendingNotice(version: string) {
  return {
    version,
    status: 'pending' as const,
    recordedAt: null,
    method: null,
  }
}

function migrateReceipt(
  receipt: z.infer<typeof legacyReceiptSchema>,
  noticeVersion: string,
): PrivacyReceipt {
  return {
    ...receipt,
    kind: 'settings_change',
    noticeVersion,
    approvalMethod: 'review_hold',
    preparationOrigin: 'page_ui',
    choiceMethod: null,
    verification: {
      ...receipt.verification,
      adapterId: 'legacy-local-storage',
      scope: 'local_demo',
    },
  }
}
