import { describe, expect, it } from 'vitest'
import {
  createActivityCoordinator,
  createPersonalControlsCoordinator,
  createPrivacyController,
  createPrivacyViewCoordinator,
  type PrivacyController,
} from '@/application'
import { createAccessibilityRuntime, createSiteGuideRuntime } from '@/domain'
import { LocalStorageAccessibilityRepository } from '@/adapters/accessibility/local-storage-accessibility-repository'
import { WaypointDomAccessibilityAdapter } from '@/adapters/accessibility/waypoint-dom-accessibility-adapter'
import { LocalStoragePrivacyRepository } from '@/adapters/storage/local-storage-privacy-repository'
import { LocalDemoEnforcementAdapter } from '@/adapters/enforcement/local-demo-enforcement-adapter'
import { WaypointNavigationAdapter } from '@/adapters/navigation/waypoint-navigation-adapter'
import { travelCatalog } from '@/demo/travel-catalog'
import { createTravelSeed } from '@/demo/travel-seed'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'
import { waypointSiteGuideCatalog } from '@/demo/waypoint/site-guide-catalog'
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
  const storage = new MemoryStorage()
  const repository = new LocalStoragePrivacyRepository(storage, createTravelSeed)
  let time = 0
  const controller = await createPrivacyController({
    catalog: travelCatalog,
    repository,
    enforcement: new LocalDemoEnforcementAdapter(storage, createTravelSeed),
    clock: { now: () => `2026-08-27T11:00:0${time++}.000Z` },
    idGenerator: { next: () => 'receipt-webmcp' },
  })
  const privacyUi = createPrivacyViewCoordinator()
  const controlsUi = createPersonalControlsCoordinator()
  const accessibilityRepository = new LocalStorageAccessibilityRepository(storage)
  const accessibilityEnforcement = new WaypointDomAccessibilityAdapter(document.createElement('html'))
  const accessibility = await createAccessibilityRuntime({
    catalog: waypointAccessibilityCatalog,
    repository: accessibilityRepository,
    enforcement: accessibilityEnforcement,
    idGenerator: { next: () => 'accessibility-webmcp' },
  })
  let location = '/#/'
  const siteGuide = createSiteGuideRuntime({
    catalog: waypointSiteGuideCatalog,
    navigator: new WaypointNavigationAdapter({
      openRoute(path, hash, context) {
        location = `${path}${hash ?? ''}`
        controlsUi.reportRoute({
          origin: context.origin,
          targetId: context.destinationId,
          message: context.origin === 'agent' ? `The agent opened ${context.label}.` : undefined,
        })
      },
      openPanel(section, context) {
        controlsUi.openPanel(section, {
          origin: context.origin,
          targetId: context.destinationId,
          message: context.origin === 'agent' ? `The agent opened ${context.label}.` : undefined,
        })
      },
      getLocation: () => location,
    }),
  })
  const activity = createActivityCoordinator({
    storage,
    clock: { now: () => `2026-08-27T11:30:0${time++}.000Z` },
    idGenerator: { next: () => `activity-${time}` },
  })
  const dependencies = {
    privacyController: controller,
    privacyCatalog: travelCatalog,
    privacyUi,
    controlsUi,
    accessibilityRuntime: accessibility,
    accessibilityCatalog: waypointAccessibilityCatalog,
    readSystemPreferences: () => ({
      prefersReducedMotion: false,
      prefersHigherContrast: false,
      forcedColorsActive: false,
    }),
    siteGuideRuntime: siteGuide,
    siteGuideCatalog: waypointSiteGuideCatalog,
    activity,
  }
  return {
    controller,
    privacyUi,
    controlsUi,
    accessibility,
    siteGuide,
    activity,
    dependencies,
    modelContext: new FakeModelContext(),
  }
}

describe('WebMCP adapter', () => {
  it('registers exactly eight tools at load with the correct read-only hints', async () => {
    const { modelContext, dependencies } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, dependencies)

    expect([...modelContext.tools.keys()].sort()).toEqual([
      'get_accessibility_preferences',
      'get_privacy_history',
      'get_privacy_overview',
      'get_privacy_receipt',
      'inspect_processing',
      'navigate_to_site_destination',
      'set_accessibility_preferences',
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
    const { controller, privacyUi, modelContext, dependencies } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, dependencies)
    const plan = controller.stage({ keepCapabilities: ['nearby_suggestions'], avoidUses: [] })
    controller.setReviewed(true)
    await adapter.whenSettled()

    expect(modelContext.tools.has('apply_privacy_plan')).toBe(true)
    expect(modelContext.tools.size).toBe(9)

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
    const { controller, modelContext, dependencies } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, dependencies)
    controller.stage({
      keepCapabilities: [
        'book_and_manage_trips',
        'protect_account',
        'receive_trip_updates',
      ],
      avoidUses: ['preference_personalisation', 'precise_location', 'partner_marketing'],
    })

    expect(() => controller.setReviewed(true)).toThrowError(expect.objectContaining({ code: 'no_changes' }))
    await adapter.whenSettled()
    expect(modelContext.tools.has('apply_privacy_plan')).toBe(false)
    adapter.dispose()
  })

  it('validates inputs and outputs and avoids duplicate apply registration', async () => {
    const { controller, modelContext, dependencies } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, dependencies)
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
    const { privacyUi, modelContext, dependencies } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, dependencies)

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

  it('keeps the overview compact and exposes full developer-authored context only on inspect', async () => {
    const { modelContext, dependencies } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, dependencies)

    const overview = await modelContext.execute('get_privacy_overview', {})
    expect(overview).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        pendingPlan: null,
        processing: expect.arrayContaining([
          expect.objectContaining({
            id: 'recommendations',
            summary: expect.any(String),
            controlMode: 'opt_in',
            policyContextIds: ['waypoint-personalisation-choice'],
          }),
        ]),
      }),
    }))
    expect(JSON.stringify(overview)).not.toContain('factualBackground')
    expect(JSON.stringify(overview)).not.toContain('decisionFactors')

    dependencies.privacyController.stage({
      keepCapabilities: ['book_and_manage_trips', 'protect_account', 'receive_trip_updates', 'personalised_recommendations'],
      avoidUses: [],
    }, 'webmcp_tool')
    const stagedOverview = await modelContext.execute('get_privacy_overview', {})
    expect(stagedOverview).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        pendingPlan: expect.objectContaining({
          status: 'staged',
          baseRevision: 1,
          changes: expect.arrayContaining([
            expect.objectContaining({ processingId: 'recommendations', before: false, after: true }),
          ]),
        }),
      }),
    }))

    const inspection = await modelContext.execute('inspect_processing', {
      processingId: 'recommendations',
    })
    expect(inspection).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        contentProvenance: 'site_developer',
        definition: expect.objectContaining({
          description: expect.objectContaining({ details: expect.any(String) }),
          developerContext: expect.objectContaining({
            factualBackground: expect.any(String),
            decisionFactors: expect.any(Array),
            limitations: expect.any(Array),
          }),
        }),
      }),
    }))
    adapter.dispose()
  })

  it('opens review whenever a plan is staged and returns receipt history newest-first', async () => {
    const { controller, privacyUi, modelContext, dependencies } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, dependencies)

    const staged = await modelContext.execute('stage_privacy_plan', {
      keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
      avoidUses: [],
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
      data: { receipts: Array<{ id: string; preparationOrigin: string }> }
    }
    expect(history.data.receipts.map(({ id }) => id)).toEqual(['receipt-webmcp'])
    expect(history.data.receipts[0]?.preparationOrigin).toBe('webmcp_tool')
    adapter.dispose()
  })

  it('applies accessibility preferences, exposes catalog-derived schemas, and navigates only to declared destinations', async () => {
    const { modelContext, dependencies, accessibility, controlsUi, activity } = await setup()
    const adapter = await startWebMcpAdapter(modelContext, dependencies)

    expect(modelContext.tools.get('navigate_to_site_destination')?.inputSchema).toEqual(expect.objectContaining({
      properties: expect.objectContaining({
        destinationId: expect.objectContaining({
          oneOf: expect.arrayContaining([
            expect.objectContaining({
              const: 'cancellation-policy',
              title: 'Cancellation policy',
              description: expect.any(String),
            }),
          ]),
        }),
      }),
    }))
    expect(await modelContext.execute('get_accessibility_preferences', {})).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({
        primitives: expect.arrayContaining([expect.objectContaining({ id: 'textScale' })]),
        current: expect.objectContaining({ textScale: 'system' }),
        system: expect.objectContaining({ forcedColorsActive: expect.any(Boolean) }),
      }),
    }))
    expect(controlsUi.getSnapshot().agentActivity).toBeNull()
    expect(await modelContext.execute('set_accessibility_preferences', {})).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'invalid_input' }),
    })

    const changed = await modelContext.execute('set_accessibility_preferences', {
      textScale: 'large',
      motion: 'reduced',
    })
    expect(changed).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({ changed: true, undoAvailable: true }),
    }))
    expect(accessibility.getSnapshot().current).toEqual(expect.objectContaining({
      textScale: 'large',
      motion: 'reduced',
    }))
    expect(controlsUi.getSnapshot()).toEqual(expect.objectContaining({
      open: true,
      section: 'accessibility',
      agentActivity: expect.objectContaining({ status: 'opened' }),
    }))

    const navigated = await modelContext.execute('navigate_to_site_destination', {
      destinationId: 'cancellation-policy',
    })
    expect(navigated).toEqual(expect.objectContaining({
      ok: true,
      data: expect.objectContaining({ location: '/#/info/cancellation-policy' }),
    }))
    expect(controlsUi.getSnapshot()).toEqual(expect.objectContaining({
      open: false,
      agentActivity: expect.objectContaining({ targetId: 'cancellation-policy', status: 'opened' }),
    }))
    expect(activity.getSnapshot().events.slice(-3).map(({ action, outcome }) => ({ action, outcome }))).toEqual([
      { action: 'set_accessibility_preferences', outcome: 'blocked' },
      { action: 'set_accessibility_preferences', outcome: 'succeeded' },
      { action: 'navigate_to_site_destination', outcome: 'succeeded' },
    ])
    adapter.dispose()
  })

  it('keeps the app usable when modelContext is unavailable', async () => {
    const { controller, dependencies } = await setup()
    const adapter = await startWebMcpAdapter(undefined, dependencies)

    expect(adapter.available).toBe(false)
    expect(controller.stage({
      keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
      avoidUses: [],
    }).changes).toHaveLength(3)
    adapter.dispose()
  })
})
