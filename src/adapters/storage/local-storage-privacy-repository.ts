import type {
  DirectChoiceMethod,
  PrivacyReceipt,
  ProcessingCatalog,
  ProcessingState,
  UserPrivacyState,
} from '@/domain'
import {
  PRIVACY_RECEIPT_HISTORY_LIMIT,
  RepositoryConflictError,
  type PrivacyRecord,
  type PrivacyRepository,
} from '@/application'
import { travelCatalog } from '@/demo/travel-catalog'
import { z } from 'zod'

export const PRIVACY_STORAGE_KEY = 'waypoint.privacy.v4'
export const LEGACY_V3_PRIVACY_STORAGE_KEY = 'clearrights.demo.v3'
export const LEGACY_V2_PRIVACY_STORAGE_KEY = 'clearrights.demo.v2'
export const LEGACY_PRIVACY_STORAGE_KEY = 'clearrights.demo.v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class LocalStoragePrivacyRepository implements PrivacyRepository {
  private readonly storage: StorageLike
  private readonly createSeed: () => UserPrivacyState
  private readonly catalog: ProcessingCatalog
  private readonly schemas: ReturnType<typeof createSchemas>

  constructor(
    storage: StorageLike,
    createSeed: () => UserPrivacyState,
    catalog: ProcessingCatalog = travelCatalog,
  ) {
    this.storage = storage
    this.createSeed = createSeed
    this.catalog = catalog
    this.schemas = createSchemas(catalog)
  }

  async load(): Promise<PrivacyRecord> {
    const stored = this.storage.getItem(PRIVACY_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = this.schemas.record.parse(JSON.parse(stored)) as PrivacyRecord
        return this.reconcileNotice(parsed)
      } catch {
        const seeded = this.writeSeed()
        this.removeLegacyKeys()
        return seeded
      }
    }

    const migrations: Array<{ key: string; migrate(raw: unknown): PrivacyRecord }> = [
      {
        key: LEGACY_V3_PRIVACY_STORAGE_KEY,
        migrate: (raw) => this.migrateV3(this.schemas.v3Record.parse(raw)),
      },
      {
        key: LEGACY_V2_PRIVACY_STORAGE_KEY,
        migrate: (raw) => {
          const parsed = this.schemas.v2Record.parse(raw)
          return this.migrateLegacy(parsed.state, parsed.receipts)
        },
      },
      {
        key: LEGACY_PRIVACY_STORAGE_KEY,
        migrate: (raw) => {
          const parsed = this.schemas.v1Record.parse(raw)
          return this.migrateLegacy(parsed.state, parsed.latestReceipt ? [parsed.latestReceipt] : [])
        },
      },
    ]

    for (const migration of migrations) {
      const legacy = this.storage.getItem(migration.key)
      if (!legacy) continue
      try {
        const migrated = migration.migrate(JSON.parse(legacy))
        const verified = this.persistAndRead(migrated)
        this.removeLegacyKeys()
        return verified
      } catch {
        const seeded = this.writeSeed()
        this.removeLegacyKeys()
        return seeded
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
    this.persistAndRead(record)
  }

  async reset(expectedRevision: number): Promise<PrivacyRecord> {
    const current = await this.load()
    if (current.state.revision !== expectedRevision) throw new RepositoryConflictError()
    const seed = this.createSeed()
    return this.persistAndRead({
      schemaVersion: 4,
      state: { ...seed, revision: expectedRevision + 1 },
      notice: pendingNotice(this.catalog.noticeVersion),
      receipts: [],
    })
  }

  private migrateV3(record: z.infer<ReturnType<typeof createSchemas>['v3Record']>): PrivacyRecord {
    const noticeMethod = mapLegacyMethod(record.notice.method)
    const recordedVersion = record.notice.status === 'recorded' ? record.notice.version : null
    return this.schemas.record.parse({
      schemaVersion: 4,
      state: record.state,
      notice: recordedVersion && record.notice.recordedAt && noticeMethod
        ? {
            status: recordedVersion === this.catalog.noticeVersion ? 'recorded' : 'outdated',
            currentVersion: this.catalog.noticeVersion,
            recordedVersion,
            recordedAt: record.notice.recordedAt,
            method: noticeMethod,
          }
        : pendingNotice(this.catalog.noticeVersion),
      receipts: record.receipts.map((receipt) => this.migrateReceipt(receipt)),
    }) as PrivacyRecord
  }

  private migrateLegacy(
    state: UserPrivacyState,
    receipts: readonly z.infer<ReturnType<typeof createSchemas>['legacyReceipt']>[],
  ): PrivacyRecord {
    return this.schemas.record.parse({
      schemaVersion: 4,
      state,
      notice: pendingNotice(this.catalog.noticeVersion),
      receipts: receipts.map((receipt) => this.migrateReceipt({
        ...receipt,
        kind: 'settings_change' as const,
        noticeVersion: this.catalog.noticeVersion,
        approvalMethod: 'review_hold' as const,
        preparationOrigin: 'page_ui' as const,
        choiceMethod: null,
        verification: {
          ...receipt.verification,
          adapterId: 'legacy-local-storage',
          scope: 'local_demo' as const,
        },
      })),
    }) as PrivacyRecord
  }

  private migrateReceipt(receipt: z.infer<ReturnType<typeof createSchemas>['v3Receipt']>): PrivacyReceipt {
    const beforeState = clone(receipt.finalState)
    for (const change of receipt.changes) beforeState[change.processingId] = change.before
    return {
      id: receipt.id,
      kind: receipt.kind,
      planId: receipt.planId,
      catalogVersion: receipt.catalogVersion,
      noticeVersion: receipt.noticeVersion,
      issuedAt: receipt.issuedAt,
      reviewedAt: receipt.reviewedAt,
      approvalMethod: receipt.approvalMethod === 'banner_button' ? 'explicit_action' : 'review_hold',
      preparationOrigin: receipt.preparationOrigin,
      entrySurface: receipt.kind === 'initial_choice' ? 'initial_banner' : 'account_settings',
      choiceMethod: mapLegacyMethod(receipt.choiceMethod),
      beforeRevision: receipt.beforeRevision,
      afterRevision: receipt.afterRevision,
      beforeState,
      afterState: clone(receipt.finalState),
      changes: clone(receipt.changes),
      decisions: decisionsFor(this.catalog, receipt.finalState),
      verified: true,
      migrated: true,
      verification: {
        observedRevision: receipt.verification.observedRevision,
        method: receipt.verification.method,
        adapterId: receipt.verification.adapterId,
        scope: receipt.verification.scope,
        readback: clone(receipt.finalState),
      },
    }
  }

  private reconcileNotice(record: PrivacyRecord): PrivacyRecord {
    const notice = record.notice
    const nextStatus = notice.recordedVersion === null
      ? 'pending' as const
      : notice.recordedVersion === this.catalog.noticeVersion ? 'recorded' as const : 'outdated' as const
    if (notice.currentVersion === this.catalog.noticeVersion && notice.status === nextStatus) return record
    return this.persistAndRead({
      ...record,
      notice: { ...notice, status: nextStatus, currentVersion: this.catalog.noticeVersion },
    })
  }

  private writeSeed(): PrivacyRecord {
    return this.persistAndRead({
      schemaVersion: 4,
      state: this.createSeed(),
      notice: pendingNotice(this.catalog.noticeVersion),
      receipts: [],
    })
  }

  private persistAndRead(record: PrivacyRecord): PrivacyRecord {
    const validated = this.schemas.record.parse(record)
    this.storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(validated))
    const written = this.storage.getItem(PRIVACY_STORAGE_KEY)
    if (!written) throw new Error('Privacy record write could not be read back.')
    return this.schemas.record.parse(JSON.parse(written)) as PrivacyRecord
  }

  private removeLegacyKeys() {
    this.storage.removeItem(LEGACY_V3_PRIVACY_STORAGE_KEY)
    this.storage.removeItem(LEGACY_V2_PRIVACY_STORAGE_KEY)
    this.storage.removeItem(LEGACY_PRIVACY_STORAGE_KEY)
  }
}

function createSchemas(catalog: ProcessingCatalog) {
  const processingId = z.enum(catalog.processing.map(({ id }) => id) as [string, ...string[]])
  const processingState = z.object(Object.fromEntries(
    catalog.processing.map(({ id }) => [id, z.boolean()]),
  )).strict().superRefine((state, context) => {
    for (const id of catalog.processing.filter(({ control }) => control.mode === 'required').map(({ id }) => id)) {
      if (!state[id]) context.addIssue({ code: 'custom', path: [id], message: 'Required processing must remain enabled.' })
    }
  })
  const change = z.object({
    processingId,
    label: z.string(),
    before: z.boolean(),
    after: z.boolean(),
    reason: z.string(),
  }).strict()
  const state = z.object({ revision: z.number().int().positive(), processing: processingState }).strict()
  const legacyReceipt = z.object({
    id: z.string().min(1),
    planId: z.string().min(1),
    catalogVersion: z.string().min(1),
    issuedAt: z.string().min(1),
    reviewedAt: z.string().min(1),
    beforeRevision: z.number().int().positive(),
    afterRevision: z.number().int().positive(),
    changes: z.array(change),
    finalState: processingState,
    verified: z.literal(true),
    verification: z.object({
      observedRevision: z.number().int().positive(),
      method: z.literal('persisted_state_readback'),
    }).strict(),
  }).strict()
  const v3Receipt = legacyReceipt.extend({
    kind: z.enum(['initial_choice', 'settings_change']),
    noticeVersion: z.string().min(1),
    approvalMethod: z.enum(['banner_button', 'review_hold']),
    preparationOrigin: z.enum(['page_ui', 'webmcp_tool']),
    choiceMethod: z.enum(['accept_all', 'essential_only', 'managed_settings']).nullable(),
    verification: z.object({
      observedRevision: z.number().int().positive(),
      method: z.enum(['persisted_state_readback', 'adapter_readback']),
      adapterId: z.string().min(1),
      scope: z.enum(['local_demo', 'external']),
    }).strict(),
  }).strict()
  const receiptPolicy = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    legalBasis: z.string().optional(),
    category: z.string().optional(),
    userAction: z.string().optional(),
  }).strict()
  const receipt = z.object({
    id: z.string().min(1),
    kind: z.enum(['initial_choice', 'settings_change']),
    planId: z.string().min(1),
    catalogVersion: z.string().min(1),
    noticeVersion: z.string().min(1),
    issuedAt: z.string().min(1),
    reviewedAt: z.string().min(1),
    approvalMethod: z.enum(['explicit_action', 'review_hold']),
    preparationOrigin: z.enum(['page_ui', 'webmcp_tool']),
    entrySurface: z.enum(['initial_banner', 'footer_link', 'account_settings', 'embedded_panel', 'agent_only']),
    choiceMethod: z.enum(['allow_all', 'reject_optional', 'managed']).nullable(),
    beforeRevision: z.number().int().positive(),
    afterRevision: z.number().int().positive(),
    beforeState: processingState,
    afterState: processingState,
    changes: z.array(change),
    decisions: z.array(z.object({
      processingId,
      label: z.string().min(1),
      enabled: z.boolean(),
      choice: z.enum(['required', 'allowed', 'denied']),
      controlMode: z.enum(['required', 'opt_in', 'opt_out']),
      policyContexts: z.array(receiptPolicy),
    }).strict()).length(catalog.processing.length),
    verified: z.literal(true),
    migrated: z.boolean().optional(),
    verification: z.object({
      observedRevision: z.number().int().positive(),
      method: z.enum(['persisted_state_readback', 'adapter_readback']),
      adapterId: z.string().min(1),
      scope: z.enum(['local_demo', 'external']),
      readback: processingState,
    }).strict(),
  }).strict()
  const notice = z.object({
    status: z.enum(['pending', 'recorded', 'outdated']),
    currentVersion: z.string().min(1),
    recordedVersion: z.string().min(1).nullable(),
    recordedAt: z.string().min(1).nullable(),
    method: z.enum(['allow_all', 'reject_optional', 'managed']).nullable(),
  }).strict().superRefine((value, context) => {
    const hasRecord = value.recordedVersion !== null && value.recordedAt !== null && value.method !== null
    if (value.status === 'pending' && hasRecord) {
      context.addIssue({ code: 'custom', message: 'A pending notice cannot contain a recorded choice.' })
    }
    if (value.status !== 'pending' && !hasRecord) {
      context.addIssue({ code: 'custom', message: 'A recorded or outdated notice requires a complete choice.' })
    }
    if (value.status === 'recorded' && value.currentVersion !== value.recordedVersion) {
      context.addIssue({ code: 'custom', message: 'A recorded notice must match the current version.' })
    }
    if (value.status === 'outdated' && value.currentVersion === value.recordedVersion) {
      context.addIssue({ code: 'custom', message: 'An outdated notice must refer to a previous version.' })
    }
  })
  const record = z.object({
    schemaVersion: z.literal(4),
    state,
    notice,
    receipts: z.array(receipt).max(PRIVACY_RECEIPT_HISTORY_LIMIT),
  }).strict()
  const v3Record = z.object({
    schemaVersion: z.literal(3),
    state,
    notice: z.object({
      version: z.string().min(1),
      status: z.enum(['pending', 'recorded']),
      recordedAt: z.string().min(1).nullable(),
      method: z.enum(['accept_all', 'essential_only', 'managed_settings']).nullable(),
    }).strict(),
    receipts: z.array(v3Receipt).max(PRIVACY_RECEIPT_HISTORY_LIMIT),
  }).strict()
  const v2Record = z.object({ schemaVersion: z.literal(2), state, receipts: z.array(legacyReceipt).max(10) }).strict()
  const v1Record = z.object({ schemaVersion: z.literal(1), state, latestReceipt: legacyReceipt.nullable() }).strict()
  return { record, v3Record, v3Receipt, v2Record, v1Record, legacyReceipt }
}

function decisionsFor(catalog: ProcessingCatalog, state: ProcessingState): PrivacyReceipt['decisions'] {
  return catalog.processing.map((definition) => ({
    processingId: definition.id,
    label: definition.label,
    enabled: state[definition.id],
    choice: definition.control.mode === 'required' ? 'required' : state[definition.id] ? 'allowed' : 'denied',
    controlMode: definition.control.mode,
    policyContexts: definition.policyContexts.map(({ id, label, legalBasis, category, userAction }) => ({
      id,
      label,
      ...(legalBasis ? { legalBasis } : {}),
      ...(category ? { category } : {}),
      ...(userAction ? { userAction } : {}),
    })),
  }))
}

function mapLegacyMethod(method: 'accept_all' | 'essential_only' | 'managed_settings' | null): DirectChoiceMethod | null {
  if (method === 'accept_all') return 'allow_all'
  if (method === 'essential_only') return 'reject_optional'
  if (method === 'managed_settings') return 'managed'
  return null
}

function pendingNotice(version: string) {
  return {
    status: 'pending' as const,
    currentVersion: version,
    recordedVersion: null,
    recordedAt: null,
    method: null,
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
