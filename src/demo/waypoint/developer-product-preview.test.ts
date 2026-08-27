import { describe, expect, it } from 'vitest'
import type { AccessibilitySnapshot, ProcessingState } from '@/domain'
import {
  createWaypointPrivacySandboxState,
  selectWaypointDeveloperPreview,
} from './developer-product-preview'

const appliedState: ProcessingState = {
  trip_fulfilment: true,
  account_security: true,
  transactional_updates: true,
  recommendations: false,
  location_suggestions: false,
  partner_advertising: false,
}

const accessibility: AccessibilitySnapshot = {
  catalogVersion: 'test',
  revision: 0,
  current: {
    textScale: 'system',
    colorScheme: 'system',
    contrast: 'system',
    motion: 'system',
    readingLayout: 'standard',
  },
  previous: null,
  undoAvailable: false,
  adapterId: 'waypoint-dom',
  scope: 'local_demo',
}

describe('Waypoint developer product preview', () => {
  it('projects a pending plan without treating it as applied or verified', () => {
    const preview = selectWaypointDeveloperPreview({
      mode: 'pending',
      appliedState,
      appliedRevision: 3,
      appliedReceipt: null,
      pending: {
        planId: 'plan-3-preview',
        target: { ...appliedState, recommendations: true },
      },
      sandbox: createWaypointPrivacySandboxState(appliedState),
      accessibility,
    })

    expect(preview.experience.discovery).toBe('personalised')
    expect(preview.evidence).toEqual({
      kind: 'pending_plan',
      planId: 'plan-3-preview',
      verified: false,
    })
    expect(preview.experience.effects.find(({ settingId }) => settingId === 'recommendations')?.verification.verified).toBe(false)
  })

  it('projects sandbox overrides without changing required processing', () => {
    const preview = selectWaypointDeveloperPreview({
      mode: 'sandbox',
      appliedState,
      appliedRevision: 3,
      appliedReceipt: null,
      pending: null,
      sandbox: {
        recommendations: true,
        location_suggestions: true,
        partner_advertising: true,
      },
      accessibility,
    })

    expect(preview.experience.discovery).toBe('personalised')
    expect(preview.experience.nearbyGuide).toBe('visible')
    expect(preview.experience.partnerOffer).toBe('visible')
    expect(preview.experience.essentials).toEqual({
      tripSummary: 'required',
      protectionStatus: 'required',
      tripUpdates: 'required',
    })
    expect(preview.evidence).toEqual({ kind: 'sandbox', verified: false })
  })

  it('falls back to the applied projection when no pending plan exists', () => {
    const preview = selectWaypointDeveloperPreview({
      mode: 'pending',
      appliedState,
      appliedRevision: 3,
      appliedReceipt: null,
      pending: null,
      sandbox: createWaypointPrivacySandboxState(appliedState),
      accessibility,
    })

    expect(preview.mode).toBe('applied')
    expect(preview.experience.discovery).toBe('generic')
  })
})
