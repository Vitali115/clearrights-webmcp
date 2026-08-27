import { describe, expect, it } from 'vitest'
import {
  AccessibilityRepositoryConflictError,
  createAccessibilityRuntime,
  createDefaultAccessibilityState,
  type AccessibilityEnforcementAdapter,
  type AccessibilityRecord,
  type AccessibilityRepository,
  type AccessibilityState,
} from '@clearrights/sdk/accessibility'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'

class MemoryRepository implements AccessibilityRepository {
  record: AccessibilityRecord = {
    schemaVersion: 1,
    revision: 1,
    current: createDefaultAccessibilityState(),
    previous: null,
  }
  async load() { return clone(this.record) }
  async commit(expectedRevision: number, record: AccessibilityRecord) {
    if (this.record.revision !== expectedRevision) throw new AccessibilityRepositoryConflictError()
    this.record = clone(record)
  }
}

class MemoryEnforcement implements AccessibilityEnforcementAdapter {
  readonly id = 'test-accessibility'
  readonly scope = 'local_demo' as const
  state = createDefaultAccessibilityState()
  mismatchOnce = false
  async apply({ target }: { operationId: string; target: AccessibilityState }) { this.state = clone(target) }
  async readCurrentState() {
    if (this.mismatchOnce) {
      this.mismatchOnce = false
      return { ...this.state, contrast: this.state.contrast === 'higher' ? 'system' as const : 'higher' as const }
    }
    return clone(this.state)
  }
}

function dependencies() {
  let id = 0
  return {
    repository: new MemoryRepository(),
    enforcement: new MemoryEnforcement(),
    idGenerator: { next: () => `accessibility-${++id}` },
  }
}

describe('Accessibility runtime', () => {
  it('applies a partial preference, verifies readback, persists and publishes', async () => {
    const deps = dependencies()
    const runtime = await createAccessibilityRuntime({ catalog: waypointAccessibilityCatalog, ...deps })
    const snapshots: AccessibilityState[] = []
    runtime.subscribe((snapshot) => snapshots.push(snapshot.current))

    const result = await runtime.setPreferences({ textScale: 'large', motion: 'reduced' }, 'agent')
    expect(result).toEqual(expect.objectContaining({
      changed: true,
      origin: 'agent',
      adapterId: 'test-accessibility',
      undoAvailable: true,
      after: expect.objectContaining({ textScale: 'large', motion: 'reduced' }),
      readback: expect.objectContaining({ textScale: 'large', motion: 'reduced' }),
    }))
    expect(deps.repository.record.current.textScale).toBe('large')
    expect(deps.repository.record.previous).toEqual(createDefaultAccessibilityState())
    expect(snapshots).toHaveLength(1)
  })

  it('keeps a single consumable undo and does not replace it for a no-op', async () => {
    const deps = dependencies()
    const runtime = await createAccessibilityRuntime({ catalog: waypointAccessibilityCatalog, ...deps })
    await runtime.setPreferences({ textScale: 'large' }, 'human')
    await runtime.setPreferences({ motion: 'reduced' }, 'human')
    const noOp = await runtime.setPreferences({ motion: 'reduced' }, 'agent')

    expect(noOp.changed).toBe(false)
    expect(noOp.undoAvailable).toBe(true)
    const undone = await runtime.undo('human')
    expect(undone.changed).toBe(true)
    expect(undone.after).toEqual(expect.objectContaining({ textScale: 'large', motion: 'system' }))
    expect(runtime.getSnapshot().undoAvailable).toBe(false)
    expect((await runtime.undo('human')).changed).toBe(false)
  })

  it('rejects empty or unavailable partial preferences', async () => {
    const deps = dependencies()
    const runtime = await createAccessibilityRuntime({ catalog: waypointAccessibilityCatalog, ...deps })
    await expect(runtime.setPreferences({}, 'human')).rejects.toMatchObject({ code: 'empty_change' })
    await expect(runtime.setPreferences({ textScale: 'system', motion: 'reduced', unknown: true } as never, 'human'))
      .rejects.toMatchObject({ code: 'invalid_preference' })
  })

  it('rolls the adapter back and does not persist after a readback mismatch', async () => {
    const deps = dependencies()
    const runtime = await createAccessibilityRuntime({ catalog: waypointAccessibilityCatalog, ...deps })
    deps.enforcement.mismatchOnce = true

    await expect(runtime.setPreferences({ contrast: 'higher' }, 'agent')).rejects.toMatchObject({
      code: 'enforcement_verification_failed',
    })
    expect(deps.enforcement.state).toEqual(createDefaultAccessibilityState())
    expect(deps.repository.record.current).toEqual(createDefaultAccessibilityState())
  })

  it('fails closed on startup drift and resets preferences and undo', async () => {
    const drifted = dependencies()
    drifted.enforcement.state.textScale = 'large'
    await expect(createAccessibilityRuntime({ catalog: waypointAccessibilityCatalog, ...drifted }))
      .rejects.toMatchObject({ code: 'enforcement_drift' })

    const deps = dependencies()
    const runtime = await createAccessibilityRuntime({ catalog: waypointAccessibilityCatalog, ...deps })
    await runtime.setPreferences({ readingLayout: 'focused' }, 'human')
    const reset = await runtime.reset()
    expect(reset.after).toEqual(createDefaultAccessibilityState())
    expect(runtime.getSnapshot().undoAvailable).toBe(false)
  })
})

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
