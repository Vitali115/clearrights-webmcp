import type {
  PrivacyEnforcementAdapter,
  PrivacyEnforcementCommand,
  ProcessingCatalog,
  ProcessingState,
  UserPrivacyState,
} from '@/domain'
import { travelCatalog } from '@/demo/travel-catalog'
import { z } from 'zod'

export const DEMO_ENFORCEMENT_STORAGE_KEY = 'waypoint.privacy.enforcement.v2'
export const LEGACY_DEMO_ENFORCEMENT_STORAGE_KEY = 'clearrights.demo.enforcement.v1'

export interface EnforcementStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export class LocalDemoEnforcementAdapter implements PrivacyEnforcementAdapter {
  readonly id = 'waypoint-local-demo'
  readonly scope = 'local_demo' as const
  private readonly storage: EnforcementStorageLike
  private readonly createSeed: () => UserPrivacyState
  private readonly catalog: ProcessingCatalog
  private readonly schema: ReturnType<typeof createRecordSchema>

  constructor(
    storage: EnforcementStorageLike,
    createSeed: () => UserPrivacyState,
    catalog: ProcessingCatalog = travelCatalog,
  ) {
    this.storage = storage
    this.createSeed = createSeed
    this.catalog = catalog
    this.schema = createRecordSchema(catalog)
  }

  async apply(command: PrivacyEnforcementCommand): Promise<void> {
    const current = this.loadRecord()
    if (current.lastOperationId === command.operationId) {
      if (!this.sameState(current.state, command.target)) {
        throw new Error('An enforcement operation ID cannot be reused with a different target.')
      }
      return
    }
    this.persistAndRead({
      schemaVersion: 2,
      state: command.target,
      lastOperationId: command.operationId,
    })
  }

  async readCurrentState(): Promise<ProcessingState> {
    return clone(this.loadRecord().state)
  }

  async synchronize(state: ProcessingState, revision: number): Promise<void> {
    this.persistAndRead({
      schemaVersion: 2,
      state,
      lastOperationId: `bootstrap-sync-${revision}`,
    })
  }

  private loadRecord() {
    const current = this.storage.getItem(DEMO_ENFORCEMENT_STORAGE_KEY)
    if (current) {
      try {
        return this.schema.parse(JSON.parse(current))
      } catch {
        return this.writeSeed()
      }
    }

    const legacy = this.storage.getItem(LEGACY_DEMO_ENFORCEMENT_STORAGE_KEY)
    if (legacy) {
      try {
        const parsed = this.schema.parse({ ...JSON.parse(legacy), schemaVersion: 2 })
        const verified = this.persistAndRead(parsed)
        this.storage.removeItem?.(LEGACY_DEMO_ENFORCEMENT_STORAGE_KEY)
        return verified
      } catch {
        const seeded = this.writeSeed()
        this.storage.removeItem?.(LEGACY_DEMO_ENFORCEMENT_STORAGE_KEY)
        return seeded
      }
    }
    return this.writeSeed()
  }

  private writeSeed() {
    return this.persistAndRead({
      schemaVersion: 2,
      state: this.createSeed().processing,
      lastOperationId: null,
    })
  }

  private persistAndRead(record: unknown) {
    const validated = this.schema.parse(record)
    this.storage.setItem(DEMO_ENFORCEMENT_STORAGE_KEY, JSON.stringify(validated))
    const written = this.storage.getItem(DEMO_ENFORCEMENT_STORAGE_KEY)
    if (!written) throw new Error('Privacy enforcement write could not be read back.')
    return this.schema.parse(JSON.parse(written))
  }

  private sameState(left: ProcessingState, right: ProcessingState) {
    return this.catalog.processing.every(({ id }) => left[id] === right[id])
  }
}

function createRecordSchema(catalog: ProcessingCatalog) {
  const state = z.object(Object.fromEntries(
    catalog.processing.map(({ id }) => [id, z.boolean()]),
  )).strict().superRefine((value, context) => {
    for (const { id } of catalog.processing.filter(({ control }) => control.mode === 'required')) {
      if (!value[id]) context.addIssue({ code: 'custom', path: [id], message: 'Required processing must remain enabled.' })
    }
  })
  return z.object({
    schemaVersion: z.literal(2),
    state,
    lastOperationId: z.string().min(1).nullable(),
  }).strict()
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
