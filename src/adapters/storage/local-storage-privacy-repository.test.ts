import { describe, expect, it } from 'vitest'
import { createTravelSeed } from '@/demo/travel-seed'
import { LocalStoragePrivacyRepository, PRIVACY_STORAGE_KEY } from './local-storage-privacy-repository'

class MemoryStorage {
  values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
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
    expect(Object.values(repaired.state.processing).every(Boolean)).toBe(true)
  })

  it('resets preferences and advances the revision', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)
    const current = await repository.load()
    const reset = await repository.reset(current.state.revision)

    expect(reset.state.revision).toBe(2)
    expect(reset.latestReceipt).toBeNull()
    expect(Object.values(reset.state.processing).every(Boolean)).toBe(true)
  })
})
