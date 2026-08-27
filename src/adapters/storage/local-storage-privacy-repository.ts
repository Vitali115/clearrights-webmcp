import {
  PROCESSING_IDS,
  type UserPrivacyState,
} from '@/domain'
import {
  PRIVACY_RECEIPT_HISTORY_LIMIT,
  RepositoryConflictError,
  type PrivacyRecord,
  type PrivacyRepository,
} from '@/application'
import { z } from 'zod'

export const PRIVACY_STORAGE_KEY = 'clearrights.demo.v2'
export const LEGACY_PRIVACY_STORAGE_KEY = 'clearrights.demo.v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const processingStateSchema = z.object(Object.fromEntries(
  PROCESSING_IDS.map((id) => [id, z.boolean()]),
) as Record<(typeof PROCESSING_IDS)[number], z.ZodBoolean>).strict().superRefine((state, context) => {
  for (const id of ['trip_fulfilment', 'account_security', 'transactional_updates'] as const) {
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
  processingId: z.enum(PROCESSING_IDS),
  label: z.string(),
  before: z.boolean(),
  after: z.boolean(),
  reason: z.string(),
}).strict()

const receiptSchema = z.object({
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

const legacyRecordSchema = z.object({
  schemaVersion: z.literal(1),
  state: z.object({
    revision: z.number().int().positive(),
    processing: processingStateSchema,
  }).strict(),
  latestReceipt: receiptSchema.nullable(),
}).strict()

const recordSchema = z.object({
  schemaVersion: z.literal(2),
  state: z.object({
    revision: z.number().int().positive(),
    processing: processingStateSchema,
  }).strict(),
  receipts: z.array(receiptSchema).max(PRIVACY_RECEIPT_HISTORY_LIMIT),
}).strict()

export class LocalStoragePrivacyRepository implements PrivacyRepository {
  private readonly storage: StorageLike
  private readonly createSeed: () => UserPrivacyState

  constructor(
    storage: StorageLike,
    createSeed: () => UserPrivacyState,
  ) {
    this.storage = storage
    this.createSeed = createSeed
  }

  async load(): Promise<PrivacyRecord> {
    const stored = this.storage.getItem(PRIVACY_STORAGE_KEY)
    if (stored) {
      try {
        return recordSchema.parse(JSON.parse(stored))
      } catch {
        return this.writeSeed()
      }
    }
    const legacy = this.storage.getItem(LEGACY_PRIVACY_STORAGE_KEY)
    if (legacy) {
      try {
        const parsed = legacyRecordSchema.parse(JSON.parse(legacy))
        const migrated = recordSchema.parse({
          schemaVersion: 2,
          state: parsed.state,
          receipts: parsed.latestReceipt ? [parsed.latestReceipt] : [],
        })
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
      schemaVersion: 2,
      state: {
        ...seed,
        revision: expectedRevision + 1,
      },
      receipts: [],
    }
    const validated = recordSchema.parse(resetRecord)
    this.storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(validated))
    return validated
  }

  private writeSeed(): PrivacyRecord {
    const record: PrivacyRecord = {
      schemaVersion: 2,
      state: this.createSeed(),
      receipts: [],
    }
    const validated = recordSchema.parse(record)
    this.storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(validated))
    return validated
  }
}
