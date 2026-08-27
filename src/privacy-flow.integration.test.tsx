import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LocalStoragePrivacyRepository } from '@/adapters/storage/local-storage-privacy-repository'
import { LocalDemoEnforcementAdapter } from '@/adapters/enforcement/local-demo-enforcement-adapter'
import { LocalStorageAccessibilityRepository } from '@/adapters/accessibility/local-storage-accessibility-repository'
import {
  readSystemAccessibilityPreferences,
  WaypointDomAccessibilityAdapter,
} from '@/adapters/accessibility/waypoint-dom-accessibility-adapter'
import { WaypointNavigationAdapter } from '@/adapters/navigation/waypoint-navigation-adapter'
import { startWebMcpAdapter } from '@/adapters/webmcp/webmcp-adapter'
import {
  createActivityCoordinator,
  createPersonalControlsCoordinator,
  createPrivacyController,
  createPrivacyViewCoordinator,
} from '@/application'
import { createAccessibilityRuntime, createSiteGuideRuntime } from '@/domain'
import { travelCatalog } from '@/demo/travel-catalog'
import { createTravelSeed } from '@/demo/travel-seed'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'
import { waypointSiteGuideCatalog } from '@/demo/waypoint/site-guide-catalog'
import { HOLD_TO_CONFIRM_MS } from '@/ui/HoldToConfirm'
import App from './App'

class MemoryStorage {
  private readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

class FakeModelContext extends EventTarget implements WebMCP.ModelContext {
  readonly tools = new Map<string, WebMCP.ModelContextTool>()
  ontoolchange = null

  async registerTool(tool: WebMCP.ModelContextTool, options?: WebMCP.ModelContextRegisterToolOptions) {
    this.tools.set(tool.name, tool)
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

afterEach(cleanup)

describe('agent-guided privacy flow', () => {
  it('requires visible human review between agent staging and agent apply', async () => {
    let tick = 0
    const storage = new MemoryStorage()
    const controller = await createPrivacyController({
      catalog: travelCatalog,
      repository: new LocalStoragePrivacyRepository(storage, createTravelSeed),
      enforcement: new LocalDemoEnforcementAdapter(storage, createTravelSeed),
      clock: { now: () => `2026-08-27T14:00:0${tick++}.000Z` },
      idGenerator: { next: () => 'receipt-integration' },
    })
    const privacyUi = createPrivacyViewCoordinator()
    const controlsUi = createPersonalControlsCoordinator()
    const accessibility = await createAccessibilityRuntime({
      catalog: waypointAccessibilityCatalog,
      repository: new LocalStorageAccessibilityRepository(storage),
      enforcement: new WaypointDomAccessibilityAdapter(document.createElement('html')),
      idGenerator: { next: () => 'accessibility-integration' },
    })
    let location = '/#/'
    const siteGuide = createSiteGuideRuntime({
      catalog: waypointSiteGuideCatalog,
      navigator: new WaypointNavigationAdapter({
        openRoute(path, hash) { location = `${path}${hash ?? ''}` },
        openPanel() {},
        getLocation: () => location,
      }),
    })
    const activity = createActivityCoordinator({
      storage,
      clock: { now: () => `2026-08-27T14:30:0${tick++}.000Z` },
      idGenerator: { next: () => `activity-${tick}` },
    })
    const modelContext = new FakeModelContext()
    const adapter = await startWebMcpAdapter(modelContext, {
      privacyController: controller,
      privacyCatalog: travelCatalog,
      privacyUi,
      controlsUi,
      accessibilityRuntime: accessibility,
      accessibilityCatalog: waypointAccessibilityCatalog,
      readSystemPreferences: () => readSystemAccessibilityPreferences(window),
      siteGuideRuntime: siteGuide,
      siteGuideCatalog: waypointSiteGuideCatalog,
      activity,
    })
    render(<App controller={controller} privacyUi={privacyUi} webMcpAvailable />)

    await act(async () => {
      await modelContext.execute('stage_privacy_plan', {
        keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
        avoidUses: [],
      })
    })

    expect(await screen.findByRole('heading', { name: 'Review changes' })).toBeVisible()
    expect(screen.getByText('3 changes ready')).toBeVisible()
    expect(screen.getByTestId('agent-activity-dot')).toBeVisible()
    expect(modelContext.tools.has('apply_privacy_plan')).toBe(false)

    expect(screen.getByText('Agent check')).toBeVisible()
    expect(screen.getByText('Change set prepared')).toBeVisible()
    expect(screen.getByText('Human check')).toBeVisible()
    expect(screen.getByText('Waiting for you')).toBeVisible()

    const confirmation = screen.getByRole('button', { name: 'Hold to confirm review' })
    fireEvent.pointerDown(confirmation, { button: 0, pointerId: 1 })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, HOLD_TO_CONFIRM_MS + 20))
    })
    fireEvent.pointerUp(confirmation, { button: 0, pointerId: 1 })
    expect(screen.getByText('Approved')).toBeVisible()
    await adapter.whenSettled()
    expect(controller.getSnapshot().workflow).toBe('reviewed')
    expect(modelContext.tools.has('apply_privacy_plan')).toBe(true)

    const planId = controller.getSnapshot().plan?.id
    expect(planId).toBeTruthy()
    await act(async () => {
      await modelContext.execute('apply_privacy_plan', { planId })
      await adapter.whenSettled()
    })

    expect(await screen.findByRole('heading', { name: 'Verified receipt' })).toBeVisible()
    expect(screen.getByText('receipt-integration')).toBeVisible()
    expect(controller.getReceiptHistory()).toHaveLength(1)
    expect(modelContext.tools.has('apply_privacy_plan')).toBe(false)
    expect(privacyUi.getSnapshot()).toEqual(expect.objectContaining({
      navigation: expect.objectContaining({ view: 'receipt', origin: 'agent' }),
      agentActivity: expect.objectContaining({ view: 'receipt', status: 'opened' }),
    }))
    adapter.dispose()
  })
})
