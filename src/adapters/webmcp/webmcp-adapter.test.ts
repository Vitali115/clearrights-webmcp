import { describe, expect, it } from 'vitest'
import {
  createPrivacyController,
  createPrivacyViewCoordinator,
  type PrivacyController,
} from '@/application'
import { LocalStoragePrivacyRepository } from '@/adapters/storage/local-storage-privacy-repository'
import { travelCatalog } from '@/demo/travel-catalog'
import { createTravelSeed } from '@/demo/travel-seed'
import { startWebMcpAdapter } from './webmcp-adapter'

class MemoryStorage {
  private readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

class FakeModelContext extends EventTarget implements WebMCP.ModelContext {
  readonly tools = new Map<string, WebMCP.ModelContextTool>()
  readonly registrations = new Map<string, number>()
  ontoolchange = null

  async registerTool(tool: WebMCP.ModelContextTool, options?: WebMCP.ModelContextRegisterToolOptions) {
    this.tools.set(tool.name, tool)
    this.registrations.set(tool.name, (this.registrations.get(tool.name) ?? 0) + 1)
    options?.signal?.addEventListener('abort', () => {
      if (this.tools.get(tool.name) === tool) this.tools.delete(tool.name)
    }, { once: true })
  }

  async getTools() { return [] }

  async execute(name: string, input: unknown) {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Missing tool: ${name}`)
    return tool.execute(input as Record<string, unknown>, { signal: new AbortController().signal })
  }
}

async function setup() {
  const repository = new LocalStoragePrivacyRepository(new MemoryStorage(), createTravelSeed)
  let time = 0
  const controller = await createPrivacyController({
    catalog: travelCatalog,
    repository,
    clock: { now: () => `2026-08-27T11:00:0${time++}.000Z` },
    idGenerator: { next: () => 'receipt-webmcp' },
  })
  return {
    controller,
    privacyUi: createPrivacyViewCoordinator(),
    modelContext: new FakeModelContext(),
  }
}

describe('WebMCP adapter', () => {
  it('registers exactly five tools at load with the correct read-only hints', async () => {
    const { controller, privacyUi, modelContext } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, controller, travelCatalog, privacyUi)

    expect([...modelContext.tools.keys()].sort()).toEqual([
      'get_privacy_history',
      'get_privacy_overview',
      'get_privacy_receipt',
      'inspect_processing',
      'stage_privacy_plan',
    ])
    expect(modelContext.tools.get('get_privacy_overview')?.annotations?.readOnlyHint).toBe(true)
    expect(modelContext.tools.get('inspect_processing')?.annotations?.readOnlyHint).toBe(true)
    expect(modelContext.tools.get('get_privacy_receipt')?.annotations?.readOnlyHint).toBe(true)
    expect(modelContext.tools.get('get_privacy_history')?.annotations?.readOnlyHint).toBe(true)
    expect(modelContext.tools.get('stage_privacy_plan')?.annotations?.readOnlyHint).toBe(false)
    expect(modelContext.tools.get('get_privacy_overview')?.inputSchema).not.toEqual(expect.objectContaining({
      required: expect.arrayContaining(['reveal']),
    }))
    adapter.dispose()
  })

  it('adds apply only for reviewed state and removes it after revoke or apply', async () => {
    const { controller, privacyUi, modelContext } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, controller, travelCatalog, privacyUi)
    const plan = controller.stage({ keepCapabilities: ['nearby_suggestions'], avoidUses: [] })
    controller.setReviewed(true)
    await adapter.whenSettled()

    expect(modelContext.tools.has('apply_privacy_plan')).toBe(true)
    expect(modelContext.tools.size).toBe(6)

    controller.setReviewed(false)
    await adapter.whenSettled()
    expect(modelContext.tools.has('apply_privacy_plan')).toBe(false)

    controller.setReviewed(true)
    await adapter.whenSettled()
    const result = await modelContext.execute('apply_privacy_plan', { planId: plan.id })
    await adapter.whenSettled()

    expect(result).toEqual(expect.objectContaining({ ok: true }))
    expect(modelContext.tools.has('apply_privacy_plan')).toBe(false)
    expect(privacyUi.getSnapshot()).toEqual(expect.objectContaining({
      navigation: expect.objectContaining({ view: 'receipt', origin: 'agent' }),
      agentActivity: expect.objectContaining({ status: 'opened', view: 'receipt' }),
    }))
    adapter.dispose()
  })

  it('never registers apply for a no-op plan', async () => {
    const { controller, privacyUi, modelContext } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, controller, travelCatalog, privacyUi)
    controller.stage({
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

    expect(() => controller.setReviewed(true)).toThrowError(expect.objectContaining({ code: 'no_changes' }))
    await adapter.whenSettled()
    expect(modelContext.tools.has('apply_privacy_plan')).toBe(false)
    adapter.dispose()
  })

  it('validates inputs and outputs and avoids duplicate apply registration', async () => {
    const { controller, privacyUi, modelContext } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, controller, travelCatalog, privacyUi)
    controller.stage({ keepCapabilities: ['nearby_suggestions'], avoidUses: [] })
    controller.setReviewed(true)
    controller.setReviewed(false)
    controller.setReviewed(true)
    await adapter.whenSettled()

    expect(modelContext.registrations.get('apply_privacy_plan')).toBe(1)
    expect(await modelContext.execute('inspect_processing', { processingId: 'unknown' })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'invalid_input' }),
    })

    const originalInspect = controller.inspect
    controller.inspect = (() => ({ invalid: true })) as unknown as PrivacyController['inspect']
    expect(await modelContext.execute('inspect_processing', { processingId: 'recommendations' })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'output_contract_error' }),
    })
    controller.inspect = originalInspect
    adapter.dispose()
  })

  it('keeps read-only calls hidden by default and reveals their requested view on demand', async () => {
    const { controller, privacyUi, modelContext } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, controller, travelCatalog, privacyUi)

    expect(await modelContext.execute('get_privacy_overview', {})).toEqual(expect.objectContaining({ ok: true }))
    expect(privacyUi.getSnapshot().agentActivity).toBeNull()

    await modelContext.execute('get_privacy_overview', { reveal: true })
    expect(privacyUi.getSnapshot().navigation.view).toBe('home')
    expect(privacyUi.getSnapshot().agentActivity?.status).toBe('opened')

    await modelContext.execute('inspect_processing', { processingId: 'recommendations', reveal: true })
    expect(privacyUi.getSnapshot().navigation).toEqual({
      view: 'activity',
      origin: 'agent',
      processingId: 'recommendations',
    })

    await modelContext.execute('get_privacy_history', { reveal: true })
    expect(privacyUi.getSnapshot().navigation.view).toBe('history')

    await modelContext.execute('get_privacy_receipt', { reveal: true })
    expect(privacyUi.getSnapshot().navigation.view).toBe('receipt')
    adapter.dispose()
  })

  it('opens review whenever a plan is staged and returns receipt history newest-first', async () => {
    const { controller, privacyUi, modelContext } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, controller, travelCatalog, privacyUi)

    const staged = await modelContext.execute('stage_privacy_plan', {
      keepCapabilities: ['book_and_manage_trips', 'protect_account', 'receive_trip_updates'],
      avoidUses: ['preference_personalisation', 'precise_location', 'partner_marketing'],
    }) as { ok: true; data: { id: string } }

    expect(staged.ok).toBe(true)
    expect(privacyUi.getSnapshot().navigation.view).toBe('review')
    expect(privacyUi.getSnapshot().agentActivity?.message).toContain('approve them manually')

    controller.setReviewed(true)
    await adapter.whenSettled()
    await modelContext.execute('apply_privacy_plan', { planId: staged.data.id })
    await adapter.whenSettled()

    const history = await modelContext.execute('get_privacy_history', {}) as {
      ok: true
      data: { receipts: Array<{ id: string }> }
    }
    expect(history.data.receipts.map(({ id }) => id)).toEqual(['receipt-webmcp'])
    adapter.dispose()
  })

  it('keeps the app usable when modelContext is unavailable', async () => {
    const { controller, privacyUi } = await setup()
    const adapter = await startWebMcpAdapter(undefined, controller, travelCatalog, privacyUi)

    expect(adapter.available).toBe(false)
    expect(controller.stage({ keepCapabilities: [], avoidUses: [] }).changes).toHaveLength(3)
    adapter.dispose()
  })
})
