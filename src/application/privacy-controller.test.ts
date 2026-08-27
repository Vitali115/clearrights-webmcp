import { describe, expect, it } from 'vitest'
import { LocalStoragePrivacyRepository } from '@/adapters/storage/local-storage-privacy-repository'
import { travelCatalog } from '@/demo/travel-catalog'
import { createTravelSeed } from '@/demo/travel-seed'
import { ApplicationError, createPrivacyController } from './index'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  removeItem(key: string) {
    this.values.delete(key)
  }
}

function dependencies(storage = new MemoryStorage()) {
  let time = 0
  let id = 0
  return {
    storage,
    repository: new LocalStoragePrivacyRepository(storage, createTravelSeed),
    clock: { now: () => `2026-08-27T10:00:0${time++}.000Z` },
    idGenerator: { next: () => `receipt-${++id}` },
  }
}

describe('PrivacyController', () => {
  it('moves through staged, reviewed and applied with a verified receipt', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({ catalog: travelCatalog, ...deps })
    const plan = controller.stage({
      keepCapabilities: ['book_and_manage_trips', 'protect_account', 'receive_trip_updates'],
      avoidUses: ['preference_personalisation', 'precise_location', 'partner_marketing'],
    })

    expect(controller.getSnapshot().workflow).toBe('staged')
    controller.setReviewed(true)
    expect(controller.getSnapshot().workflow).toBe('reviewed')

    const receipt = await controller.apply(plan.id)
    expect(controller.getSnapshot().workflow).toBe('applied')
    expect(receipt.verified).toBe(true)
    expect(receipt.verification.method).toBe('persisted_state_readback')
    expect(receipt.changes).toHaveLength(3)

    const reloaded = await createPrivacyController({ catalog: travelCatalog, ...deps })
    expect(reloaded.getSnapshot().workflow).toBe('idle')
    expect(reloaded.getReceipt()?.id).toBe(receipt.id)
    expect(reloaded.getReceiptHistory()).toHaveLength(1)
    expect(reloaded.getSnapshot().record.state.processing.recommendations).toBe(false)
  })

  it('revokes review when a plan is replaced', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({ catalog: travelCatalog, ...deps })
    controller.stage({ keepCapabilities: ['nearby_suggestions'], avoidUses: [] })
    controller.setReviewed(true)
    controller.stage({ keepCapabilities: ['partner_offers'], avoidUses: [] })

    expect(controller.getSnapshot()).toEqual(expect.objectContaining({
      workflow: 'staged',
      reviewedAt: null,
    }))
  })

  it('rejects apply without review and after a stale revision', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({ catalog: travelCatalog, ...deps })
    const plan = controller.stage({ keepCapabilities: ['nearby_suggestions'], avoidUses: [] })

    await expect(controller.apply(plan.id)).rejects.toMatchObject({ code: 'review_required' })
    controller.setReviewed(true)

    const current = await deps.repository.load()
    await deps.repository.commit(current.state.revision, {
      ...current,
      state: { ...current.state, revision: current.state.revision + 1 },
    })

    await expect(controller.apply(plan.id)).rejects.toMatchObject({ code: 'stale_plan' })
  })

  it('does not review, apply, or create a receipt for a no-op plan', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({ catalog: travelCatalog, ...deps })
    const plan = controller.stage({
      keepCapabilities: [
        'book_and_manage_trips',
        'protect_account',
        'receive_trip_updates',
        'personalised_recommendations',
        'nearby_suggestions',
        'partner_offers',
      ],
      avoidUses: [],
    })

    expect(plan.isNoOp).toBe(true)
    expect(() => controller.setReviewed(true)).toThrowError(expect.objectContaining({ code: 'no_changes' }))
    await expect(controller.apply(plan.id)).rejects.toMatchObject({ code: 'review_required' })
    expect(controller.getSnapshot().record.state.revision).toBe(1)
    expect(controller.getReceipt()).toBeNull()
    expect(controller.getReceiptHistory()).toEqual([])
  })

  it('keeps the ten most recent verified receipts in newest-first order', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({ catalog: travelCatalog, ...deps })

    for (let index = 0; index < 12; index += 1) {
      const disableOptional = index % 2 === 0
      const plan = controller.stage({
        keepCapabilities: disableOptional
          ? ['book_and_manage_trips', 'protect_account', 'receive_trip_updates']
          : [
              'book_and_manage_trips',
              'protect_account',
              'receive_trip_updates',
              'personalised_recommendations',
              'nearby_suggestions',
              'partner_offers',
            ],
        avoidUses: disableOptional
          ? ['preference_personalisation', 'precise_location', 'partner_marketing']
          : [],
      })
      controller.setReviewed(true)
      await controller.apply(plan.id)
    }

    expect(controller.getReceiptHistory()).toHaveLength(10)
    expect(controller.getReceiptHistory()[0]?.id).toBe('receipt-12')
    expect(controller.getReceiptHistory()[9]?.id).toBe('receipt-3')
  })

  it('requires confirmation and resets demo state and receipt', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({ catalog: travelCatalog, ...deps })
    const plan = controller.stage({ keepCapabilities: [], avoidUses: [] })
    controller.setReviewed(true)
    await controller.apply(plan.id)

    await expect(controller.resetDemo(false)).rejects.toBeInstanceOf(ApplicationError)
    await controller.resetDemo(true)

    expect(controller.getSnapshot().workflow).toBe('idle')
    expect(controller.getReceipt()).toBeNull()
    expect(controller.getReceiptHistory()).toEqual([])
    expect(Object.values(controller.getSnapshot().record.state.processing).every(Boolean)).toBe(true)
  })
})
