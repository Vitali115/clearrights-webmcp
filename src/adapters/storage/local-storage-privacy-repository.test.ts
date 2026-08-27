import { describe, expect, it } from 'vitest'
import { createTravelSeed } from '@/demo/travel-seed'
import {
  LEGACY_PRIVACY_STORAGE_KEY,
  LEGACY_V2_PRIVACY_STORAGE_KEY,
  LocalStoragePrivacyRepository,
  PRIVACY_STORAGE_KEY,
} from './local-storage-privacy-repository'

class MemoryStorage {
  values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

function createLegacyReceipt() {
  return {
    id: 'receipt-legacy',
    planId: 'plan-legacy',
    catalogVersion: 'waypoint-travel-2026.1',
    issuedAt: '2026-08-27T10:00:00.000Z',
    reviewedAt: '2026-08-27T09:59:00.000Z',
    beforeRevision: 1,
    afterRevision: 2,
    changes: [],
    finalState: createTravelSeed().processing,
    verified: true,
    verification: {
      observedRevision: 2,
      method: 'persisted_state_readback' as const,
    },
  }
}

describe('LocalStoragePrivacyRepository', () => {
  it('creates a repeatable seed when storage is missing or invalid', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)

    const first = await repository.load()
    storage.setItem(PRIVACY_STORAGE_KEY, '{invalid')
    const repaired = await repository.load()

    expect(first).toEqual(repaired)
    expect(repaired.schemaVersion).toBe(3)
    expect(repaired.notice.status).toBe('pending')
    expect(Object.values(repaired.state.processing).every(Boolean)).toBe(true)
  })

  it('repairs a stored record that disables required processing', async () => {
    const storage = new MemoryStorage()
    storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify({
      schemaVersion: 3,
      state: {
        revision: 9,
        processing: { ...createTravelSeed().processing, trip_fulfilment: false },
      },
      notice: {
        version: 'waypoint-privacy-choices-2026.2',
        status: 'pending',
        recordedAt: null,
        method: null,
      },
      receipts: [],
    }))
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)

    const repaired = await repository.load()

    expect(repaired.state.revision).toBe(1)
    expect(repaired.state.processing.trip_fulfilment).toBe(true)
  })

  it('migrates a v1 record and its latest receipt, then removes the legacy key', async () => {
    const storage = new MemoryStorage()
    storage.setItem(LEGACY_PRIVACY_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      state: {
        revision: 2,
        processing: createTravelSeed().processing,
      },
      latestReceipt: createLegacyReceipt(),
    }))
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)

    const migrated = await repository.load()

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.state.revision).toBe(2)
    expect(migrated.receipts.map(({ id }) => id)).toEqual(['receipt-legacy'])
    expect(migrated.receipts[0]).toEqual(expect.objectContaining({
      kind: 'settings_change',
      approvalMethod: 'review_hold',
      preparationOrigin: 'page_ui',
    }))
    expect(migrated.notice.status).toBe('pending')
    expect(storage.getItem(LEGACY_PRIVACY_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(PRIVACY_STORAGE_KEY)).not.toBeNull()
  })

  it('migrates v2 history and removes the v2 key', async () => {
    const storage = new MemoryStorage()
    storage.setItem(LEGACY_V2_PRIVACY_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      state: createTravelSeed(),
      receipts: [createLegacyReceipt()],
    }))
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)

    const migrated = await repository.load()

    expect(migrated.schemaVersion).toBe(3)
    expect(migrated.receipts).toHaveLength(1)
    expect(storage.getItem(LEGACY_V2_PRIVACY_STORAGE_KEY)).toBeNull()
  })

  it('removes a corrupt legacy record and creates a clean v3 seed', async () => {
    const storage = new MemoryStorage()
    storage.setItem(LEGACY_PRIVACY_STORAGE_KEY, '{invalid')
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)

    const repaired = await repository.load()

    expect(repaired).toEqual({
      schemaVersion: 3,
      state: createTravelSeed(),
      notice: {
        version: 'waypoint-privacy-choices-2026.2',
        status: 'pending',
        recordedAt: null,
        method: null,
      },
      receipts: [],
    })
    expect(storage.getItem(LEGACY_PRIVACY_STORAGE_KEY)).toBeNull()
  })

  it('resets preferences and advances the revision', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)
    const current = await repository.load()
    const reset = await repository.reset(current.state.revision)

    expect(reset.state.revision).toBe(2)
    expect(reset.receipts).toEqual([])
    expect(reset.notice.status).toBe('pending')
    expect(Object.values(reset.state.processing).every(Boolean)).toBe(true)
  })
})
