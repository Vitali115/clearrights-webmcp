import { describe, expect, it } from 'vitest'
import type { AccessibilitySnapshot, ProcessingState } from '@/domain'
import {
  selectWaypointExperience,
  waypointProductEffectRegistry,
} from './product-effects'

const accessibility: AccessibilitySnapshot = {
  catalogVersion: 'test',
  revision: 0,
  current: {
    textScale: 'system',
    contrast: 'system',
    motion: 'system',
    readingLayout: 'standard',
  },
  previous: null,
  undoAvailable: false,
  adapterId: 'waypoint-dom',
  scope: 'local_demo',
}

function privacyState(bits: number): ProcessingState {
  return {
    trip_fulfilment: true,
    account_security: true,
    transactional_updates: true,
    recommendations: Boolean(bits & 1),
    location_suggestions: Boolean(bits & 2),
    partner_advertising: Boolean(bits & 4),
  }
}

describe('Waypoint product effect registry', () => {
  it('declares unique effect and surface IDs for every mapped product surface', () => {
    expect(waypointProductEffectRegistry).toHaveLength(10)
    expect(new Set(waypointProductEffectRegistry.map(({ id }) => id)).size).toBe(10)
    expect(new Set(waypointProductEffectRegistry.map(({ surfaceId }) => surfaceId)).size).toBe(10)
  })

  it.each(Array.from({ length: 8 }, (_, bits) => bits))(
    'selects the three optional privacy effects for combination %i',
    (bits) => {
      const experience = selectWaypointExperience({ privacyState: privacyState(bits), accessibility })

      expect(experience.discovery).toBe(bits & 1 ? 'personalised' : 'generic')
      expect(experience.nearbyGuide).toBe(bits & 2 ? 'visible' : 'hidden')
      expect(experience.partnerOffer).toBe(bits & 4 ? 'visible' : 'hidden')
      expect(experience.effects.filter(({ result }) => result === 'required')).toHaveLength(3)
      expect(experience.essentials).toEqual({
        tripSummary: 'required',
        protectionStatus: 'required',
        tripUpdates: 'required',
      })
    },
  )

  it('projects accessibility preferences without changing privacy effects', () => {
    const experience = selectWaypointExperience({
      privacyState: privacyState(0),
      accessibility: {
        ...accessibility,
        current: {
          textScale: 'extra_large',
          contrast: 'higher',
          motion: 'reduced',
          readingLayout: 'focused',
        },
      },
    })

    expect(experience.accessibility).toEqual({
      textScale: 'extra_large',
      contrast: 'higher',
      motion: 'reduced',
      readingLayout: 'focused',
    })
    expect(experience.hiddenSurfaceIds).toEqual(expect.arrayContaining([
      'nearby-guide',
      'partner-offer',
      'secondary-content',
    ]))
  })
})
