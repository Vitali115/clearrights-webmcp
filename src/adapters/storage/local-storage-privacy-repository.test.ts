import { describe, expect, it } from 'vitest'
import { travelCatalog } from '@/demo/travel-catalog'
import { createTravelSeed } from '@/demo/travel-seed'
import {
  LEGACY_PRIVACY_STORAGE_KEY,
  LEGACY_V2_PRIVACY_STORAGE_KEY,
  LEGACY_V3_PRIVACY_STORAGE_KEY,
  LocalStoragePrivacyRepository,
  PRIVACY_STORAGE_KEY,
} from './local-storage-privacy-repository'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
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
    verification: { observedRevision: 2, method: 'persisted_state_readback' as const },
  }
}

function createV3Receipt() {
  return {
    ...createLegacyReceipt(),
    kind: 'initial_choice' as const,
    noticeVersion: 'waypoint-privacy-choices-2026.2',
    approvalMethod: 'banner_button' as const,
    preparationOrigin: 'page_ui' as const,
    choiceMethod: 'essential_only' as const,
    verification: {
      observedRevision: 2,
      method: 'adapter_readback' as const,
      adapterId: 'waypoint-local-demo',
      scope: 'local_demo' as const,
    },
  }
}

describe('LocalStoragePrivacyRepository', () => {
  it('creates a repeatable v4 seed when storage is missing or invalid', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)
    const first = await repository.load()
    storage.setItem(PRIVACY_STORAGE_KEY, '{invalid')
    const repaired = await repository.load()

    expect(first).toEqual(repaired)
    expect(repaired.schemaVersion).toBe(4)
    expect(repaired.notice).toEqual({
      status: 'pending',
      currentVersion: travelCatalog.noticeVersion,
      recordedVersion: null,
      recordedAt: null,
      method: null,
    })
  })

  it('repairs a v4 record that disables required processing', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)
    const seeded = await repository.load()
    storage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify({
      ...seeded,
      state: {
        revision: 9,
        processing: { ...seeded.state.processing, trip_fulfilment: false },
      },
    }))

    const repaired = await repository.load()
    expect(repaired.state.revision).toBe(1)
    expect(repaired.state.processing.trip_fulfilment).toBe(true)
  })

  it('migrates v3 state, notice and receipts to v4 before removing the legacy key', async () => {
    const storage = new MemoryStorage()
    storage.setItem(LEGACY_V3_PRIVACY_STORAGE_KEY, JSON.stringify({
      schemaVersion: 3,
      state: { revision: 2, processing: createTravelSeed().processing },
      notice: {
        version: 'waypoint-privacy-choices-2026.2',
        status: 'recorded',
        recordedAt: '2026-08-27T10:00:00.000Z',
        method: 'essential_only',
      },
      receipts: [createV3Receipt()],
    }))
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)

    const migrated = await repository.load()
    expect(migrated.schemaVersion).toBe(4)
    expect(migrated.state.revision).toBe(2)
    expect(migrated.notice).toEqual(expect.objectContaining({
      status: 'outdated',
      currentVersion: travelCatalog.noticeVersion,
      recordedVersion: 'waypoint-privacy-choices-2026.2',
      method: 'reject_optional',
    }))
    expect(migrated.receipts[0]).toEqual(expect.objectContaining({
      migrated: true,
      approvalMethod: 'explicit_action',
      entrySurface: 'initial_banner',
      choiceMethod: 'reject_optional',
      decisions: expect.arrayContaining([
        expect.objectContaining({ processingId: 'trip_fulfilment', choice: 'required' }),
      ]),
      verification: expect.objectContaining({ readback: createTravelSeed().processing }),
    }))
    expect(storage.getItem(PRIVACY_STORAGE_KEY)).not.toBeNull()
    expect(storage.getItem(LEGACY_V3_PRIVACY_STORAGE_KEY)).toBeNull()
  })

  it('preserves v1 and v2 receipt history during migration', async () => {
    for (const [key, record] of [
      [LEGACY_PRIVACY_STORAGE_KEY, {
        schemaVersion: 1,
        state: { revision: 2, processing: createTravelSeed().processing },
        latestReceipt: createLegacyReceipt(),
      }],
      [LEGACY_V2_PRIVACY_STORAGE_KEY, {
        schemaVersion: 2,
        state: { revision: 2, processing: createTravelSeed().processing },
        receipts: [createLegacyReceipt()],
      }],
    ] as const) {
      const storage = new MemoryStorage()
      storage.setItem(key, JSON.stringify(record))
      const migrated = await new LocalStoragePrivacyRepository(storage, createTravelSeed).load()
      expect(migrated.receipts).toHaveLength(1)
      expect(migrated.receipts[0]?.migrated).toBe(true)
      expect(storage.getItem(key)).toBeNull()
    }
  })

  it('does not remove a legacy key when the v4 write cannot be read back', async () => {
    class FailedPrimaryWriteStorage extends MemoryStorage {
      override setItem(key: string, value: string) {
        if (key !== PRIVACY_STORAGE_KEY) super.setItem(key, value)
      }
    }
    const storage = new FailedPrimaryWriteStorage()
    storage.values.set(LEGACY_V3_PRIVACY_STORAGE_KEY, JSON.stringify({
      schemaVersion: 3,
      state: { revision: 2, processing: createTravelSeed().processing },
      notice: { version: travelCatalog.noticeVersion, status: 'pending', recordedAt: null, method: null },
      receipts: [],
    }))

    await expect(new LocalStoragePrivacyRepository(storage, createTravelSeed).load()).rejects.toThrow()
    expect(storage.getItem(LEGACY_V3_PRIVACY_STORAGE_KEY)).not.toBeNull()
  })

  it('replaces a corrupt legacy record only after a valid v4 seed is readable', async () => {
    const storage = new MemoryStorage()
    storage.setItem(LEGACY_PRIVACY_STORAGE_KEY, '{invalid')
    const repaired = await new LocalStoragePrivacyRepository(storage, createTravelSeed).load()

    expect(repaired.schemaVersion).toBe(4)
    expect(storage.getItem(PRIVACY_STORAGE_KEY)).not.toBeNull()
    expect(storage.getItem(LEGACY_PRIVACY_STORAGE_KEY)).toBeNull()
  })

  it('resets preferences, notice and history while advancing the revision', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)
    const current = await repository.load()
    const reset = await repository.reset(current.state.revision)

    expect(reset.state.revision).toBe(2)
    expect(reset.receipts).toEqual([])
    expect(reset.notice.status).toBe('pending')
    expect(reset.state.processing.recommendations).toBe(false)
    expect(reset.state.processing.location_suggestions).toBe(false)
    expect(reset.state.processing.partner_advertising).toBe(false)
  })
})
