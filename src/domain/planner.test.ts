import { describe, expect, it } from 'vitest'
import { travelCatalog } from '@/demo/travel-catalog'
import { createTravelSeed } from '@/demo/travel-seed'
import { createPrivacyPlan, DomainError } from './index'

describe('createPrivacyPlan', () => {
  it('minimises optional processing while preserving selected capabilities', () => {
    const plan = createPrivacyPlan(travelCatalog, createTravelSeed(), {
      keepCapabilities: [
        'book_and_manage_trips',
        'protect_account',
        'receive_trip_updates',
        'nearby_suggestions',
      ],
      avoidUses: ['preference_personalisation', 'partner_marketing'],
    })

    expect(plan.target.recommendations).toBe(false)
    expect(plan.target.location_suggestions).toBe(true)
    expect(plan.target.partner_advertising).toBe(false)
    expect(plan.changes.map(({ processingId }) => processingId)).toEqual([
      'recommendations',
      'partner_advertising',
    ])
    expect(plan.conflicts).toEqual([])
  })

  it('keeps a capability and reports a conflicting avoided use', () => {
    const plan = createPrivacyPlan(travelCatalog, createTravelSeed(), {
      keepCapabilities: ['nearby_suggestions'],
      avoidUses: ['precise_location'],
    })

    expect(plan.target.location_suggestions).toBe(true)
    expect(plan.conflicts).toEqual([
      expect.objectContaining({
        processingId: 'location_suggestions',
        capabilityId: 'nearby_suggestions',
        useId: 'precise_location',
      }),
    ])
  })

  it('never disables locked processing and reports it as blocked', () => {
    const plan = createPrivacyPlan(travelCatalog, createTravelSeed(), {
      keepCapabilities: [],
      avoidUses: ['booking_operations', 'fraud_prevention'],
    })

    expect(plan.target.trip_fulfilment).toBe(true)
    expect(plan.target.account_security).toBe(true)
    expect(plan.blockedItems.map(({ processingId }) => processingId)).toEqual([
      'trip_fulfilment',
      'account_security',
    ])
  })

  it('can restore an optional processing for a requested capability', () => {
    const state = createTravelSeed()
    state.processing.recommendations = false

    const plan = createPrivacyPlan(travelCatalog, state, {
      keepCapabilities: ['personalised_recommendations'],
      avoidUses: [],
    })

    expect(plan.target.recommendations).toBe(true)
    expect(plan.changes).toContainEqual(expect.objectContaining({
      processingId: 'recommendations',
      before: false,
      after: true,
    }))
  })

  it('produces a stable no-op plan and rejects duplicate input', () => {
    const state = createTravelSeed()
    const input = {
      keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
      avoidUses: [] as const,
    }
    const first = createPrivacyPlan(travelCatalog, state, input)
    const second = createPrivacyPlan(travelCatalog, state, input)
    const reordered = createPrivacyPlan(travelCatalog, state, {
      keepCapabilities: [...input.keepCapabilities].reverse(),
      avoidUses: [],
    })

    expect(first.isNoOp).toBe(true)
    expect(first.id).toBe(second.id)
    expect(first.id).toBe(reordered.id)
    expect(() => createPrivacyPlan(travelCatalog, state, {
      keepCapabilities: ['nearby_suggestions', 'nearby_suggestions'],
      avoidUses: [],
    })).toThrowError(DomainError)
  })
})
