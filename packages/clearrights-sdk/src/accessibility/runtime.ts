import { createDefaultAccessibilityState, type AccessibilityCatalog } from './catalog'
import type { AccessibilityEnforcementAdapter } from './enforcement'
import {
  AccessibilityError,
  type AccessibilityChangeResult,
  type AccessibilityOrigin,
  type AccessibilityPrimitiveId,
  type AccessibilityState,
} from './model'
import type { AccessibilityRecord, AccessibilityRepository } from './repository'

export interface AccessibilityIdGenerator {
  next(): string
}

export interface AccessibilitySnapshot {
  catalogVersion: string
  revision: number
  current: AccessibilityState
  previous: AccessibilityState | null
  undoAvailable: boolean
  adapterId: string
  scope: AccessibilityEnforcementAdapter['scope']
}

export interface AccessibilityRuntime {
  getSnapshot(): AccessibilitySnapshot
  subscribe(listener: (snapshot: AccessibilitySnapshot) => void): () => void
  setPreferences(partial: Partial<AccessibilityState>, origin: AccessibilityOrigin): Promise<AccessibilityChangeResult>
  undo(origin: AccessibilityOrigin): Promise<AccessibilityChangeResult>
  reset(): Promise<AccessibilityChangeResult>
}

export async function createAccessibilityRuntime({
  catalog,
  repository,
  enforcement,
  idGenerator,
}: {
  catalog: AccessibilityCatalog
  repository: AccessibilityRepository
  enforcement: AccessibilityEnforcementAdapter
  idGenerator: AccessibilityIdGenerator
}): Promise<AccessibilityRuntime> {
  let record = await repository.load()
  const enforced = await enforcement.readCurrentState()
  if (!sameState(enforced, record.current)) {
    throw new AccessibilityError('enforcement_drift', `The ${enforcement.id} adapter does not match stored accessibility preferences.`)
  }
  const listeners = new Set<(snapshot: AccessibilitySnapshot) => void>()

  const snapshot = (): AccessibilitySnapshot => clone({
    catalogVersion: catalog.version,
    revision: record.revision,
    current: record.current,
    previous: record.previous,
    undoAvailable: record.previous !== null,
    adapterId: enforcement.id,
    scope: enforcement.scope,
  })
  const publish = (next: AccessibilityRecord) => {
    record = clone(next)
    const nextSnapshot = snapshot()
    for (const listener of listeners) listener(nextSnapshot)
  }

  const apply = async (
    target: AccessibilityState,
    origin: AccessibilityOrigin,
    previous: AccessibilityState | null,
  ): Promise<AccessibilityChangeResult> => {
    const before = clone(record.current)
    if (sameState(before, target)) {
      const readback = await enforcement.readCurrentState()
      if (!sameState(readback, target)) {
        throw new AccessibilityError('enforcement_verification_failed', `The ${enforcement.id} adapter readback does not match stored preferences.`)
      }
      return result(before, target, readback, false, origin, record.previous !== null, enforcement)
    }

    const operationId = idGenerator.next()
    try {
      await enforcement.apply({ operationId, target: clone(target) })
      const readback = await enforcement.readCurrentState()
      if (!sameState(readback, target)) {
        throw new AccessibilityError('enforcement_verification_failed', `The ${enforcement.id} adapter readback did not match the requested preferences.`)
      }
      const next: AccessibilityRecord = {
        schemaVersion: 1,
        revision: record.revision + 1,
        current: clone(target),
        previous: clone(previous),
      }
      await repository.commit(record.revision, next)
      publish(await repository.load())
      return result(before, target, readback, true, origin, next.previous !== null, enforcement)
    } catch (error) {
      await rollback(enforcement, idGenerator, before)
      throw error
    }
  }

  return {
    getSnapshot: snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async setPreferences(partial, origin) {
      validatePartial(catalog, partial)
      const target = { ...record.current, ...partial }
      return apply(target, origin, record.current)
    },
    async undo(origin) {
      if (!record.previous) {
        const current = clone(record.current)
        return result(current, current, current, false, origin, false, enforcement)
      }
      return apply(clone(record.previous), origin, null)
    },
    async reset() {
      const target = createDefaultAccessibilityState()
      if (sameState(record.current, target) && record.previous === null) {
        return result(target, target, target, false, 'system', false, enforcement)
      }
      if (sameState(record.current, target)) {
        const next: AccessibilityRecord = {
          schemaVersion: 1,
          revision: record.revision + 1,
          current: target,
          previous: null,
        }
        await repository.commit(record.revision, next)
        publish(await repository.load())
        return result(target, target, target, false, 'system', false, enforcement)
      }
      return apply(target, 'system', null)
    },
  }
}

function validatePartial(catalog: AccessibilityCatalog, partial: Partial<AccessibilityState>) {
  const entries = Object.entries(partial) as Array<[AccessibilityPrimitiveId, AccessibilityState[AccessibilityPrimitiveId]]>
  if (entries.length === 0) throw new AccessibilityError('empty_change', 'At least one accessibility preference is required.')
  for (const [id, value] of entries) {
    if (!['textScale', 'contrast', 'motion', 'readingLayout'].includes(id) || !catalog.supports(id, value)) {
      throw new AccessibilityError('invalid_preference', `${String(value)} is not an available option for ${id}.`)
    }
  }
}

async function rollback(
  enforcement: AccessibilityEnforcementAdapter,
  idGenerator: AccessibilityIdGenerator,
  target: AccessibilityState,
) {
  try {
    await enforcement.apply({ operationId: `${idGenerator.next()}-rollback`, target: clone(target) })
    const readback = await enforcement.readCurrentState()
    if (!sameState(readback, target)) throw new Error('Rollback readback mismatch.')
  } catch {
    throw new AccessibilityError('rollback_failed', `The ${enforcement.id} adapter failed to restore the previous accessibility preferences.`)
  }
}

function result(
  before: AccessibilityState,
  after: AccessibilityState,
  readback: AccessibilityState,
  changed: boolean,
  origin: AccessibilityOrigin,
  undoAvailable: boolean,
  enforcement: AccessibilityEnforcementAdapter,
): AccessibilityChangeResult {
  return clone({ before, after, readback, changed, origin, undoAvailable, adapterId: enforcement.id, scope: enforcement.scope })
}

function sameState(left: AccessibilityState, right: AccessibilityState) {
  return left.textScale === right.textScale
    && left.contrast === right.contrast
    && left.motion === right.motion
    && left.readingLayout === right.readingLayout
}

function clone<T>(value: T): T {
  if (value === null) return value
  return JSON.parse(JSON.stringify(value)) as T
}
