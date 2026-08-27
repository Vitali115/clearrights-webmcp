import { describe, expect, it } from 'vitest'
import { createPrivacyController, createDirectChoiceInput, type PrivacyControllerSnapshot } from '@/application'
import { LocalDemoEnforcementAdapter } from '@/adapters/enforcement/local-demo-enforcement-adapter'
import { LocalStoragePrivacyRepository } from '@/adapters/storage/local-storage-privacy-repository'
import { travelCatalog } from '@/demo/travel-catalog'
import { createTravelSeed } from '@/demo/travel-seed'
import { selectPrivacyTrustTrace } from './privacy-trust-trace'

class MemoryStorage {
  private readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

async function createController() {
  const storage = new MemoryStorage()
  let tick = 0
  return createPrivacyController({
    catalog: travelCatalog,
    repository: new LocalStoragePrivacyRepository(storage, createTravelSeed),
    enforcement: new LocalDemoEnforcementAdapter(storage, createTravelSeed),
    clock: { now: () => `2026-08-27T16:00:0${tick++}.000Z` },
    idGenerator: { next: () => 'receipt-trust-trace' },
  })
}

const select = (snapshot: PrivacyControllerSnapshot) => selectPrivacyTrustTrace({
  snapshot,
  catalogVersion: travelCatalog.version,
  noticeVersion: travelCatalog.noticeVersion,
})

describe('Waypoint privacy trust trace', () => {
  it('derives agent preparation, human review, apply, and readback from the real workflow', async () => {
    const controller = await createController()
    expect(select(controller.getSnapshot())).toEqual(expect.objectContaining({
      prepared: expect.objectContaining({ status: 'pending' }),
      applied: expect.objectContaining({ status: 'pending' }),
      verified: expect.objectContaining({ status: 'pending' }),
    }))

    const plan = controller.stage({
      keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
      avoidUses: [],
    }, 'webmcp_tool')
    expect(select(controller.getSnapshot()).prepared).toEqual({
      status: 'agent_prepared',
      planId: plan.id,
      origin: 'webmcp_tool',
    })

    controller.setReviewed(true)
    expect(select(controller.getSnapshot()).reviewed).toEqual(expect.objectContaining({
      status: 'human_reviewed',
      method: 'review_hold',
    }))

    const receipt = await controller.apply(plan.id)
    const trace = select(controller.getSnapshot())
    expect(trace.applied).toEqual({
      status: 'applied',
      receiptId: receipt.id,
      revision: receipt.afterRevision,
      adapterId: 'waypoint-local-demo',
    })
    expect(trace.verified).toEqual({
      status: 'readback_matched',
      method: 'adapter_readback',
      scope: 'local_demo',
    })
  })

  it('labels an explicit banner action as a direct human choice', async () => {
    const controller = await createController()
    await controller.applyDirectChoice({
      input: createDirectChoiceInput(travelCatalog, 'reject_optional'),
      method: 'reject_optional',
      entrySurface: 'initial_banner',
      preparationOrigin: 'page_ui',
    })

    const trace = select(controller.getSnapshot())
    expect(trace.prepared.status).toBe('human_direct')
    expect(trace.reviewed).toEqual(expect.objectContaining({
      status: 'not_required',
      method: 'explicit_action',
    }))
  })
})
