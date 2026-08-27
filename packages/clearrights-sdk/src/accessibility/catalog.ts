import {
  AccessibilityError,
  type AccessibilityPrimitiveDefinition,
  type AccessibilityPrimitiveId,
  type AccessibilityState,
} from './model'

export interface AccessibilityCatalog {
  version: string
  primitives: readonly AccessibilityPrimitiveDefinition[]
  getPrimitive(id: AccessibilityPrimitiveId): AccessibilityPrimitiveDefinition
  supports<K extends AccessibilityPrimitiveId>(id: K, value: AccessibilityState[K]): boolean
}

export interface AccessibilityCatalogInput {
  version: string
  primitives: readonly AccessibilityPrimitiveDefinition[]
}

const primitiveOrder = ['textScale', 'colorScheme', 'contrast', 'motion', 'readingLayout'] as const
const allowedValues = {
  textScale: ['system', 'large', 'extra_large'],
  colorScheme: ['system', 'light', 'dark'],
  contrast: ['system', 'higher'],
  motion: ['system', 'reduced'],
  readingLayout: ['standard', 'focused'],
} as const
const defaultValues: AccessibilityState = {
  textScale: 'system',
  colorScheme: 'system',
  contrast: 'system',
  motion: 'system',
  readingLayout: 'standard',
}

export function defineAccessibilityCatalog(input: AccessibilityCatalogInput): AccessibilityCatalog {
  assertText(input.version, 'Catalog version', 128)
  const ids = input.primitives.map(({ id }) => id)
  if (ids.length !== primitiveOrder.length || primitiveOrder.some((id) => ids.filter((value) => value === id).length !== 1)) {
    throw new AccessibilityError('invalid_catalog', 'The catalog must define each accessibility primitive exactly once.')
  }

  const byId = new Map<AccessibilityPrimitiveId, AccessibilityPrimitiveDefinition>()
  for (const primitive of input.primitives) {
    assertText(primitive.label, `${primitive.id} label`, 120)
    assertText(primitive.summary, `${primitive.id} summary`, 240)
    assertText(primitive.details, `${primitive.id} details`, 2_000)
    if (primitive.options.length === 0) {
      throw new AccessibilityError('invalid_catalog', `${primitive.id} must expose at least one option.`)
    }
    const values = primitive.options.map(({ value }) => value)
    if (new Set(values).size !== values.length) {
      throw new AccessibilityError('invalid_catalog', `${primitive.id} option values must be unique.`)
    }
    if (!values.includes(defaultValues[primitive.id])) {
      throw new AccessibilityError('invalid_catalog', `${primitive.id} must include its default option.`)
    }
    for (const option of primitive.options) {
      if (!(allowedValues[primitive.id] as readonly string[]).includes(option.value)) {
        throw new AccessibilityError('invalid_catalog', `${option.value} is not valid for ${primitive.id}.`)
      }
      assertText(option.label, `${primitive.id} option label`, 120)
      assertText(option.summary, `${primitive.id} option summary`, 240)
    }
    byId.set(primitive.id, freeze(primitive))
  }

  const primitives = primitiveOrder.map((id) => byId.get(id)!)
  const catalog: AccessibilityCatalog = {
    version: input.version,
    primitives,
    getPrimitive(id) {
      const primitive = byId.get(id)
      if (!primitive) throw new AccessibilityError('unknown_primitive', `Unknown accessibility primitive: ${id}.`)
      return primitive
    },
    supports(id, value) {
      return byId.get(id)?.options.some((option) => option.value === value) ?? false
    },
  }
  return Object.freeze(catalog)
}

export function createDefaultAccessibilityState(): AccessibilityState {
  return { ...defaultValues }
}

function assertText(value: string, label: string, max: number) {
  if (!value.trim()) throw new AccessibilityError('invalid_catalog', `${label} must not be empty.`)
  if (value.length > max) throw new AccessibilityError('invalid_catalog', `${label} exceeds ${max} characters.`)
}

function freeze<T>(value: T): T {
  return Object.freeze(JSON.parse(JSON.stringify(value))) as T
}
