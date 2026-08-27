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

  it('migrates four-field records without losing current or Undo state', async () => {
    const storage = new MemoryStorage()
    storage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      revision: 7,
      current: {
        textScale: 'large',
        contrast: 'higher',
        motion: 'reduced',
        readingLayout: 'focused',
      },
      previous: {
        textScale: 'system',
        contrast: 'system',
        motion: 'system',
        readingLayout: 'standard',
      },
    }))
    const repository = new LocalStorageAccessibilityRepository(storage, waypointAccessibilityCatalog)

    expect(await repository.load()).toEqual({
      schemaVersion: 1,
      revision: 7,
      current: {
        textScale: 'large',
        colorScheme: 'system',
        contrast: 'higher',
        motion: 'reduced',
        readingLayout: 'focused',
      },
      previous: createDefaultAccessibilityState(),
    })
  })

  it('writes and reads all five DOM data attributes and resolves an explicit dark theme', async () => {
    const root = document.createElement('html')
    const adapter = new WaypointDomAccessibilityAdapter(root)
    const target = {
      textScale: 'extra_large' as const,
      colorScheme: 'dark' as const,
      contrast: 'higher' as const,
      motion: 'reduced' as const,
      readingLayout: 'focused' as const,
    }
    await adapter.apply({ operationId: 'operation-1', target })

    expect(root.dataset).toEqual(expect.objectContaining({
      textScale: 'extra_large',
      colorScheme: 'dark',
      contrast: 'higher',
      motion: 'reduced',
      readingLayout: 'focused',
    }))
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.style.colorScheme).toBe('dark')
    expect(await adapter.readCurrentState()).toEqual(target)
  })

  it('keeps the system color scheme resolved when the operating-system preference changes', async () => {
    const root = document.createElement('html')
    let listener: ((event: MediaQueryListEvent) => void) | undefined
    const query = {
      matches: true,
      addEventListener: (_type: string, next: (event: MediaQueryListEvent) => void) => { listener = next },
    } as unknown as MediaQueryList
    const adapter = new WaypointDomAccessibilityAdapter(root, () => query)

    await adapter.apply({ operationId: 'system-theme', target: createDefaultAccessibilityState() })
    expect(root.classList.contains('dark')).toBe(true)

    Object.defineProperty(query, 'matches', { value: false, configurable: true })
    listener?.({ matches: false } as MediaQueryListEvent)
    expect(root.classList.contains('dark')).toBe(false)
  })

  it('reads system media preferences without storing or interpreting them', () => {
    const preferences = readSystemAccessibilityPreferences({
      matchMedia: (query: string) => ({ matches: !['(prefers-contrast: more)', '(prefers-color-scheme: dark)'].includes(query) }) as MediaQueryList,
    })
    expect(preferences).toEqual({
      prefersReducedMotion: true,
      prefersHigherContrast: false,
      prefersDarkColorScheme: false,
      forcedColorsActive: true,
    })
  })
})
