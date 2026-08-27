import { describe, expect, it } from 'vitest'
import { defineAccessibilityCatalog } from '@clearrights/sdk/accessibility'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'

describe('accessibility catalog', () => {
  it('defines the five primitives and configurable available options', () => {
    expect(waypointAccessibilityCatalog.primitives.map(({ id }) => id)).toEqual([
      'textScale',
      'colorScheme',
      'contrast',
      'motion',
      'readingLayout',
    ])
    expect(waypointAccessibilityCatalog.supports('textScale', 'extra_large')).toBe(true)
    expect(waypointAccessibilityCatalog.supports('colorScheme', 'light')).toBe(true)
    expect(waypointAccessibilityCatalog.supports('colorScheme', 'dark')).toBe(true)
    expect(waypointAccessibilityCatalog.supports('motion', 'reduced')).toBe(true)
  })

  it('rejects missing primitives, duplicate options and values from another primitive', () => {
    const primitives = waypointAccessibilityCatalog.primitives
    expect(() => defineAccessibilityCatalog({ version: 'invalid', primitives: primitives.slice(1) })).toThrowError(
      expect.objectContaining({ code: 'invalid_catalog' }),
    )
    expect(() => defineAccessibilityCatalog({
      version: 'invalid',
      primitives: primitives.map((primitive) => primitive.id === 'motion'
        ? { ...primitive, options: [...primitive.options, primitive.options[0]!] }
        : primitive),
    })).toThrowError(expect.objectContaining({ code: 'invalid_catalog' }))
    expect(() => defineAccessibilityCatalog({
      version: 'invalid',
      primitives: primitives.map((primitive) => primitive.id === 'contrast'
        ? { ...primitive, options: [...primitive.options, { value: 'large' as const, label: 'Invalid', summary: 'Invalid.' }] }
        : primitive),
    })).toThrowError(expect.objectContaining({ code: 'invalid_catalog' }))
  })
})
