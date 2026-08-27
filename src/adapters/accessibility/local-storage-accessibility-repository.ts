import {
  AccessibilityRepositoryConflictError,
  createDefaultAccessibilityState,
  type AccessibilityCatalog,
  type AccessibilityRecord,
  type AccessibilityRepository,
} from '@clearrights/sdk/accessibility'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'
import { z } from 'zod'

export const ACCESSIBILITY_STORAGE_KEY = 'waypoint.accessibility.v1'

export interface AccessibilityStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export class LocalStorageAccessibilityRepository implements AccessibilityRepository {
  private readonly schema: ReturnType<typeof createRecordSchema>
  private readonly storage: AccessibilityStorageLike

  constructor(
    storage: AccessibilityStorageLike,
    catalog: AccessibilityCatalog = waypointAccessibilityCatalog,
  ) {
    this.storage = storage
    this.schema = createRecordSchema(catalog)
  }

  async load(): Promise<AccessibilityRecord> {
    const stored = this.storage.getItem(ACCESSIBILITY_STORAGE_KEY)
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored)
        const current = this.schema.safeParse(parsed)
        if (current.success) return current.data as AccessibilityRecord
        const legacy = createLegacyRecordSchema(this.schema).safeParse(parsed)
        if (legacy.success) {
          return this.persistAndRead({
            ...legacy.data,
            current: { ...legacy.data.current, colorScheme: 'system' },
            previous: legacy.data.previous ? { ...legacy.data.previous, colorScheme: 'system' } : null,
          } as AccessibilityRecord)
        }
      } catch {
        // Repair this isolated preference record from non-sensitive defaults.
      }
    }
    return this.persistAndRead({
      schemaVersion: 1,
      revision: 1,
      current: createDefaultAccessibilityState(),
      previous: null,
    })
  }

  async commit(expectedRevision: number, record: AccessibilityRecord): Promise<void> {
    const current = await this.load()
    if (current.revision !== expectedRevision || record.revision !== expectedRevision + 1) {
      throw new AccessibilityRepositoryConflictError()
    }
    this.persistAndRead(record)
  }

  private persistAndRead(record: AccessibilityRecord): AccessibilityRecord {
    const validated = this.schema.parse(record)
    this.storage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(validated))
    const written = this.storage.getItem(ACCESSIBILITY_STORAGE_KEY)
    if (!written) throw new Error('Accessibility preference write could not be read back.')
    return this.schema.parse(JSON.parse(written)) as AccessibilityRecord
  }
}

function createRecordSchema(catalog: AccessibilityCatalog) {
  const option = (id: 'textScale' | 'colorScheme' | 'contrast' | 'motion' | 'readingLayout') => {
    const values = catalog.getPrimitive(id).options.map(({ value }) => value)
    return z.enum(values as [string, ...string[]])
  }
  const state = z.object({
    textScale: option('textScale'),
    colorScheme: option('colorScheme'),
    contrast: option('contrast'),
    motion: option('motion'),
    readingLayout: option('readingLayout'),
  }).strict()
  return z.object({
    schemaVersion: z.literal(1),
    revision: z.number().int().positive(),
    current: state,
    previous: state.nullable(),
  }).strict()
}

function createLegacyRecordSchema(currentSchema: ReturnType<typeof createRecordSchema>) {
  const currentState = currentSchema.shape.current
  const legacyState = currentState.omit({ colorScheme: true })
  return z.object({
    schemaVersion: z.literal(1),
    revision: z.number().int().positive(),
    current: legacyState,
    previous: legacyState.nullable(),
  }).strict()
}
