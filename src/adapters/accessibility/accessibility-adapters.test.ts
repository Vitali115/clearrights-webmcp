import { describe, expect, it } from 'vitest'
import { createDefaultAccessibilityState } from '@clearrights/sdk/accessibility'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'
import {
  ACCESSIBILITY_STORAGE_KEY,
  LocalStorageAccessibilityRepository,
} from './local-storage-accessibility-repository'
import {
  readSystemAccessibilityPreferences,
  WaypointDomAccessibilityAdapter,
} from './waypoint-dom-accessibility-adapter'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('Waypoint accessibility adapters', () => {
  it('persists current and one previous state and repairs invalid records', async () => {
    const storage = new MemoryStorage()
    const repository = new LocalStorageAccessibilityRepository(storage, waypointAccessibilityCatalog)
    const initial = await repository.load()
    const current = { ...initial.current, textScale: 'large' as const }
    await repository.commit(initial.revision, {
      schemaVersion: 1,
      revision: initial.revision + 1,
      current,
      previous: initial.current,
    })
    expect((await repository.load()).previous).toEqual(createDefaultAccessibilityState())

    storage.setItem(ACCESSIBILITY_STORAGE_KEY, '{invalid')
    expect(await repository.load()).toEqual({
      schemaVersion: 1,
      revision: 1,
      current: createDefaultAccessibilityState(),
      previous: null,
    })
  })

  it('writes and reads all four DOM data attributes', async () => {
    const root = document.createElement('html')
    const adapter = new WaypointDomAccessibilityAdapter(root)
    const target = {
      textScale: 'extra_large' as const,
      contrast: 'higher' as const,
      motion: 'reduced' as const,
      readingLayout: 'focused' as const,
    }
    await adapter.apply({ operationId: 'operation-1', target })

    expect(root.dataset).toEqual(expect.objectContaining({
      textScale: 'extra_large',
      contrast: 'higher',
      motion: 'reduced',
      readingLayout: 'focused',
    }))
    expect(await adapter.readCurrentState()).toEqual(target)
  })

  it('reads system media preferences without storing or interpreting them', () => {
    const preferences = readSystemAccessibilityPreferences({
      matchMedia: (query: string) => ({ matches: query !== '(prefers-contrast: more)' }) as MediaQueryList,
    })
    expect(preferences).toEqual({
      prefersReducedMotion: true,
      prefersHigherContrast: false,
      forcedColorsActive: true,
    })
  })
})
