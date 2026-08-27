import { describe, expect, it } from 'vitest'
import { createTravelSeed } from '@/demo/travel-seed'
import {
  DEMO_ENFORCEMENT_STORAGE_KEY,
  LEGACY_DEMO_ENFORCEMENT_STORAGE_KEY,
  LocalDemoEnforcementAdapter,
} from './local-demo-enforcement-adapter'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('LocalDemoEnforcementAdapter', () => {
  it('keeps enforced state separate and supports idempotent operation replay', async () => {
    const storage = new MemoryStorage()
    const adapter = new LocalDemoEnforcementAdapter(storage, createTravelSeed)
    const target = { ...createTravelSeed().processing, recommendations: false }
    const command = {
      operationId: 'operation-1',
      planId: 'plan-1',
      expectedRevision: 1,
      target,
      changes: [],
    }

    await adapter.apply(command)
    await adapter.apply(command)

    expect((await adapter.readCurrentState()).recommendations).toBe(false)
    expect(storage.getItem(DEMO_ENFORCEMENT_STORAGE_KEY)).toContain('operation-1')
  })

  it('repairs corrupt isolated adapter state from the repeatable seed', async () => {
    const storage = new MemoryStorage()
    storage.setItem(DEMO_ENFORCEMENT_STORAGE_KEY, '{invalid')
    const adapter = new LocalDemoEnforcementAdapter(storage, createTravelSeed)

    expect(await adapter.readCurrentState()).toEqual(createTravelSeed().processing)
  })

  it('can explicitly synchronize the local demo during bootstrap migration', async () => {
    const storage = new MemoryStorage()
    const adapter = new LocalDemoEnforcementAdapter(storage, createTravelSeed)
    const migrated = { ...createTravelSeed().processing, recommendations: true }

    await adapter.synchronize(migrated, 7)

    expect(await adapter.readCurrentState()).toEqual(migrated)
    expect(storage.getItem(DEMO_ENFORCEMENT_STORAGE_KEY)).toContain('bootstrap-sync-7')
  })

  it('migrates the legacy enforcement record and removes it after readback', async () => {
    const storage = new MemoryStorage()
    const migrated = { ...createTravelSeed().processing, recommendations: true }
    storage.setItem(LEGACY_DEMO_ENFORCEMENT_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      state: migrated,
      lastOperationId: 'legacy-operation',
    }))

    const adapter = new LocalDemoEnforcementAdapter(storage, createTravelSeed)
    expect(await adapter.readCurrentState()).toEqual(migrated)
    expect(storage.getItem(DEMO_ENFORCEMENT_STORAGE_KEY)).toContain('"schemaVersion":2')
    expect(storage.getItem(LEGACY_DEMO_ENFORCEMENT_STORAGE_KEY)).toBeNull()
  })
})
