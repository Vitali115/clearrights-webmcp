import type {
  PrivacyEnforcementAdapter,
  PrivacyEnforcementCommand,
  ProcessingState,
  UserPrivacyState,
} from '@/domain'
import { travelCatalog } from '@/demo/travel-catalog'
import { z } from 'zod'

export const DEMO_ENFORCEMENT_STORAGE_KEY = 'clearrights.demo.enforcement.v1'

export interface EnforcementStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const processingStateSchema = z.object(Object.fromEntries(
  travelCatalog.processing.map(({ id }) => [id, z.boolean()]),
)).strict().superRefine((state, context) => {
  for (const { id } of travelCatalog.processing.filter(({ control }) => control.mode === 'required')) {
    if (!state[id]) {
      context.addIssue({ code: 'custom', path: [id], message: 'Required processing must remain enabled.' })
    }
  }
})

const recordSchema = z.object({
  schemaVersion: z.literal(1),
  state: processingStateSchema,
  lastOperationId: z.string().min(1).nullable(),
}).strict()

export class LocalDemoEnforcementAdapter implements PrivacyEnforcementAdapter {
  readonly id = 'waypoint-local-demo'
  readonly scope = 'local_demo' as const
  private readonly storage: EnforcementStorageLike
  private readonly createSeed: () => UserPrivacyState

  constructor(
    storage: EnforcementStorageLike,
    createSeed: () => UserPrivacyState,
  ) {
    this.storage = storage
    this.createSeed = createSeed
  }

  async apply(command: PrivacyEnforcementCommand): Promise<void> {
    const current = this.loadRecord()
    if (current.lastOperationId === command.operationId) {
      if (!sameState(current.state, command.target)) {
        throw new Error('An enforcement operation ID cannot be reused with a different target.')
      }
      return
    }

    const next = recordSchema.parse({
      schemaVersion: 1,
      state: command.target,
      lastOperationId: command.operationId,
    })
    this.storage.setItem(DEMO_ENFORCEMENT_STORAGE_KEY, JSON.stringify(next))
  }

  async readCurrentState(): Promise<ProcessingState> {
    return clone(this.loadRecord().state)
  }

  async synchronize(state: ProcessingState, revision: number): Promise<void> {
    const synchronized = recordSchema.parse({
      schemaVersion: 1,
      state,
      lastOperationId: `bootstrap-sync-${revision}`,
    })
    this.storage.setItem(DEMO_ENFORCEMENT_STORAGE_KEY, JSON.stringify(synchronized))
  }

  private loadRecord() {
    const stored = this.storage.getItem(DEMO_ENFORCEMENT_STORAGE_KEY)
    if (stored) {
      try {
        return recordSchema.parse(JSON.parse(stored))
      } catch {
        // The demo adapter repairs its isolated browser state from the repeatable seed.
      }
    }
    const seeded = recordSchema.parse({
      schemaVersion: 1,
      state: this.createSeed().processing,
      lastOperationId: null,
    })
    this.storage.setItem(DEMO_ENFORCEMENT_STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

function sameState(left: ProcessingState, right: ProcessingState) {
  return travelCatalog.processing.every(({ id }) => left[id] === right[id])
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
