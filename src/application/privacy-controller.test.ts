import { describe, expect, it } from 'vitest'
import { LocalStoragePrivacyRepository } from '@/adapters/storage/local-storage-privacy-repository'
import { LocalDemoEnforcementAdapter } from '@/adapters/enforcement/local-demo-enforcement-adapter'
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
    enforcement: new LocalDemoEnforcementAdapter(storage, createTravelSeed),
    clock: { now: () => `2026-08-27T10:00:0${time++}.000Z` },
    idGenerator: { next: () => `receipt-${++id}` },
  }
}

describe('PrivacyController', () => {
  it('fails closed when adapter state drifts from the stored decision at startup', async () => {
    const deps = dependencies()
    const drifted = {
      ...createTravelSeed().processing,
      recommendations: true,
    }

    await expect(createPrivacyController({
      catalog: travelCatalog,
      repository: deps.repository,
      enforcement: {
        id: 'drifted-demo',
        scope: 'local_demo',
        apply: async () => undefined,
        readCurrentState: async () => drifted,
      },
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    })).rejects.toMatchObject({ code: 'enforcement_drift' })
  })

  it('moves through staged, reviewed and applied with a verified receipt', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({ catalog: travelCatalog, ...deps })
    const plan = controller.stage({
      keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
      avoidUses: [],
    })

    expect(controller.getSnapshot().workflow).toBe('staged')
    controller.setReviewed(true)
    expect(controller.getSnapshot().workflow).toBe('reviewed')

    const receipt = await controller.apply(plan.id)
    expect(controller.getSnapshot().workflow).toBe('applied')
    expect(receipt.verified).toBe(true)
    expect(receipt.verification).toEqual(expect.objectContaining({
      method: 'adapter_readback',
      adapterId: 'waypoint-local-demo',
      scope: 'local_demo',
    }))
    expect(receipt.changes).toHaveLength(3)

    const reloaded = await createPrivacyController({ catalog: travelCatalog, ...deps })
    expect(reloaded.getSnapshot().workflow).toBe('idle')
    expect(reloaded.getReceipt()?.id).toBe(receipt.id)
    expect(reloaded.getReceiptHistory()).toHaveLength(1)
    expect(reloaded.getSnapshot().record.state.processing.recommendations).toBe(true)
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

  it('does not create a receipt when enforcement readback differs from the plan', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({
      catalog: travelCatalog,
      repository: deps.repository,
      enforcement: {
        id: 'mismatching-demo',
        scope: 'local_demo',
        apply: async () => undefined,
        readCurrentState: async () => createTravelSeed().processing,
      },
      clock: deps.clock,
      idGenerator: deps.idGenerator,
    })
    const plan = controller.stage({
      keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
      avoidUses: [],
    })
    controller.setReviewed(true)

    await expect(controller.apply(plan.id)).rejects.toMatchObject({
      code: 'enforcement_verification_failed',
    })
    expect(controller.getReceipt()).toBeNull()
    expect((await deps.repository.load()).state.revision).toBe(1)
  })

  it('does not review, apply, or create a receipt for a no-op plan', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({ catalog: travelCatalog, ...deps })
    const plan = controller.stage({
      keepCapabilities: [
        'book_and_manage_trips',
        'protect_account',
        'receive_trip_updates',
      ],
      avoidUses: ['preference_personalisation', 'precise_location', 'partner_marketing'],
    })

    expect(plan.isNoOp).toBe(true)
    expect(() => controller.setReviewed(true)).toThrowError(expect.objectContaining({ code: 'no_changes' }))
    await expect(controller.apply(plan.id)).rejects.toMatchObject({ code: 'review_required' })
    expect(controller.getSnapshot().record.state.revision).toBe(1)
    expect(controller.getReceipt()).toBeNull()
    expect(controller.getReceiptHistory()).toEqual([])
  })

  it('records an explicit banner choice even when its preset is a no-op', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({ catalog: travelCatalog, ...deps })

    const receipt = await controller.applyInitialChoice('essential_only')

    expect(receipt).toEqual(expect.objectContaining({
      kind: 'initial_choice',
      approvalMethod: 'banner_button',
      preparationOrigin: 'page_ui',
      choiceMethod: 'essential_only',
      changes: [],
    }))
    expect(controller.getSnapshot().record.notice).toEqual(expect.objectContaining({
      status: 'recorded',
      method: 'essential_only',
    }))
    expect(controller.getSnapshot().record.state.revision).toBe(2)
  })

  it('keeps the ten most recent verified receipts in newest-first order', async () => {
    const deps = dependencies()
    const controller = await createPrivacyController({ catalog: travelCatalog, ...deps })

    for (let index = 0; index < 12; index += 1) {
      const enableOptional = index % 2 === 0
      const plan = controller.stage({
        keepCapabilities: enableOptional
          ? [
              'book_and_manage_trips',
              'protect_account',
              'receive_trip_updates',
              'personalised_recommendations',
              'nearby_suggestions',
              'partner_offers',
            ]
          : ['book_and_manage_trips', 'protect_account', 'receive_trip_updates'],
        avoidUses: enableOptional
          ? []
          : ['preference_personalisation', 'precise_location', 'partner_marketing'],
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
    const plan = controller.stage({
      keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
      avoidUses: [],
    })
    controller.setReviewed(true)
    await controller.apply(plan.id)

    await expect(controller.resetDemo(false)).rejects.toBeInstanceOf(ApplicationError)
    await controller.resetDemo(true)

    expect(controller.getSnapshot().workflow).toBe('idle')
    expect(controller.getReceipt()).toBeNull()
    expect(controller.getReceiptHistory()).toEqual([])
    expect(controller.getSnapshot().record.state.processing.recommendations).toBe(false)
    expect(controller.getSnapshot().record.notice.status).toBe('pending')
  })
})
