import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
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
import { WaypointNavigationAdapter } from '@/adapters/navigation/waypoint-navigation-adapter'
import { LocalStoragePrivacyRepository } from '@/adapters/storage/local-storage-privacy-repository'
import { LocalDemoEnforcementAdapter } from '@/adapters/enforcement/local-demo-enforcement-adapter'
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

type TestRuntime = Awaited<ReturnType<typeof createTestRuntime>>
const testRuntimes = new WeakMap<PrivacyController, TestRuntime>()

async function createTestRuntime(storage = new MemoryStorage()) {
  let tick = 0
  const controller = await createPrivacyController({
    catalog: travelCatalog,
    repository: new LocalStoragePrivacyRepository(storage, createTravelSeed),
    enforcement: new LocalDemoEnforcementAdapter(storage, createTravelSeed),
    clock: { now: () => `2026-08-27T12:00:0${tick++}.000Z` },
    idGenerator: { next: () => 'receipt-ui-test' },
  })
  const privacyUi = createPrivacyViewCoordinator()
  const controlsUi = createPersonalControlsCoordinator()
  const accessibility = await createAccessibilityRuntime({
    catalog: waypointAccessibilityCatalog,
    repository: new LocalStorageAccessibilityRepository(storage),
    enforcement: new WaypointDomAccessibilityAdapter(document.createElement('html')),
    idGenerator: { next: () => `accessibility-ui-${tick++}` },
  })
  let location = '/#/'
  const siteGuide = createSiteGuideRuntime({
    catalog: waypointSiteGuideCatalog,
    navigator: new WaypointNavigationAdapter({
      openRoute(path, hash, context) {
        location = `${path}${hash ?? ''}`
        window.history.pushState(null, '', location)
        controlsUi.reportRoute({
          origin: context.origin,
          targetId: context.destinationId,
          message: context.origin === 'agent' ? `The agent opened ${context.label}.` : undefined,
        })
        window.dispatchEvent(new PopStateEvent('popstate'))
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
    clock: { now: () => `2026-08-27T12:30:0${tick++}.000Z` },
    idGenerator: { next: () => `activity-ui-${tick}` },
  })
  return {
    controller,
    privacyUi,
    controlsUi,
    accessibility,
    siteGuide,
    activity,
    observedPrivacySignals: {
      globalPrivacyControl: {
        support: 'unavailable' as const,
        value: null,
        interpretation: 'unavailable' as const,
        effect: 'informational_only' as const,
      },
    },
  }
}

async function createController(storage = new MemoryStorage()) {
  const runtime = await createTestRuntime(storage)
  testRuntimes.set(runtime.controller, runtime)
  return runtime.controller
}

function renderApp(controller: PrivacyController, webMcpAvailable = false) {
  const runtime = testRuntimes.get(controller)
  if (!runtime) throw new Error('Missing test runtime.')
  render(<App {...runtime} webMcpAvailable={webMcpAvailable} />)
  return runtime.privacyUi
}

async function holdToConfirm() {
  const control = screen.getByRole('button', { name: 'Hold to confirm review' })
  fireEvent.pointerDown(control, { button: 0, pointerId: 1 })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, HOLD_TO_CONFIRM_MS + 20))
  })
  fireEvent.pointerUp(control, { button: 0, pointerId: 1 })
}

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '#/')
})

describe('privacy settings UI', () => {
  it('opens the ClearRights developer page with live module and adapter status', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller, true)

    await user.click(screen.getByRole('button', { name: 'How ClearRights works' }))

    const developerHeading = await screen.findByRole('heading', { name: 'ClearRights Privacy' })
    expect(developerHeading).toBeVisible()
    expect(developerHeading).toHaveFocus()
    expect(screen.getByText('8 tools registered')).toBeVisible()
    expect(screen.getByText(/0 of 3 optional on/)).toBeVisible()
    expect(screen.getByText('GPC unavailable · informational only')).toBeVisible()
    expect(screen.getByText(/definePrivacyCatalog/)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'ClearRights Accessibility Preferences' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'ClearRights Site Guide' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Product effects' })).toBeVisible()
    expect(screen.getByText('PrivacyRepository')).toBeVisible()
    expect(screen.getByRole('link', { name: 'OneTrust consent groups' })).toHaveAttribute('href', expect.stringContaining('developer.onetrust.com'))
    expect(screen.getByRole('link', { name: 'Usercentrics decisions' })).toHaveAttribute('href', expect.stringContaining('docs.usercentrics.com'))
    expect(screen.getByRole('heading', { name: 'Privacy trust trace' })).toBeVisible()
    expect(screen.getAllByTestId('privacy-trust-stage')).toHaveLength(5)
    expect(screen.getByText('Waiting for a plan')).toBeVisible()
    expect(screen.getByText('No matching receipt yet')).toBeVisible()
    expect(screen.getByText('Showing applied privacy revision 1.')).toBeVisible()
    expect(screen.queryByText('Waiting changes are not shown here')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('product-effect-row')).toHaveLength(6)
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accessibility' }))
    expect(screen.getAllByTestId('product-effect-row')).toHaveLength(5)
    await user.click(screen.getByText('Current experience view model'))
    expect(screen.getByText(/"discovery": "generic"/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Open live product preview' }))
    expect(window.location.hash).toBe('#/?effects=1')
    expect(screen.getByRole('heading', { name: 'Where do you want to go next?' })).toBeVisible()
    expect(screen.getByRole('complementary', { name: 'Privacy product effect preview' })).toBeVisible()
    expect(screen.getByText(/Hidden product surfaces: Nearby guide, Partner rail offer/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Applied' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Pending plan' })).toBeDisabled()
    expect(screen.getByText(/Applied revision 1/)).toBeVisible()
    expect(document.querySelector('[data-clearrights-surface="search"]')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Hidden in the product')).toHaveLength(2)

    await user.selectOptions(screen.getByLabelText('Inspect a mapped surface'), 'nearby-guide')
    const surfaceInspector = screen.getByRole('complementary', { name: 'Product surface inspector' })
    expect(surfaceInspector).toBeVisible()
    expect(within(surfaceInspector).getByRole('heading', { name: 'Nearby guide' })).toBeVisible()
    expect(within(surfaceInspector).getByText('Location suggestions · location_suggestions')).toBeVisible()
    expect(within(surfaceInspector).getByText('hidden')).toBeVisible()
    expect(within(surfaceInspector).getByText('No receipt verifies this preview value')).toBeVisible()
    expect(within(surfaceInspector).getByText('src/demo/waypoint/product-effect-registry.ts')).toBeVisible()
    expect(within(surfaceInspector).getByText('src/ui/TravelProductPage.tsx')).toBeVisible()
    expect(within(surfaceInspector).getByText("experience.nearbyGuide === 'visible'")).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Sandbox' }))
    expect(screen.getByText('Temporary overrides · Preview only · Not applied')).toBeVisible()
    await user.click(screen.getByRole('switch', { name: 'Recommendations: Off' }))
    await user.click(screen.getByRole('switch', { name: 'Location suggestions: Off' }))
    await user.click(screen.getByRole('switch', { name: 'Partner offers: Off' }))
    expect(screen.getByText('Ideas shaped by your travel interests')).toBeVisible()
    expect(screen.getByText('Around your Lisbon stay')).toBeVisible()
    expect(screen.getByText('A flexible rail pass for your saved city trips')).toBeVisible()
    expect(screen.queryByText('Hidden in the product')).not.toBeInTheDocument()
    expect(within(surfaceInspector).getByText('visible')).toBeVisible()
    expect(within(surfaceInspector).getByText('Sandbox override · temporary and unverified')).toBeVisible()
    expect(controller.getSnapshot().record.state.processing).toEqual(expect.objectContaining({
      recommendations: false,
      location_suggestions: false,
      partner_advertising: false,
    }))

    await user.click(screen.getByRole('button', { name: 'Exit effects view' }))
    expect(window.location.hash).toBe('#/')
    expect(screen.queryByRole('complementary', { name: 'Privacy product effect preview' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    expect(screen.getByRole('dialog', { name: 'Waypoint Privacy Settings' })).toBeVisible()
  })

  it('offers a manual fallback for every step in the two-minute demo', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller, true)

    await user.click(screen.getByRole('button', { name: 'How ClearRights works' }))

    expect(await screen.findByRole('heading', { name: 'The two-minute demo' })).toBeVisible()
    expect(screen.getByText(/Keep booking and account security/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Open privacy settings' }))
    expect(screen.getByRole('heading', { name: 'Privacy settings' })).toBeVisible()
  })

  it('keeps pending privacy drafts separate from the applied product effects inspector', async () => {
    const controller = await createController()
    controller.stage({
      keepCapabilities: ['book_and_manage_trips', 'protect_account', 'receive_trip_updates', 'personalised_recommendations'],
      avoidUses: [],
    }, 'webmcp_tool')
    window.history.replaceState(null, '', '#/clearrights')
    renderApp(controller, true)

    expect(await screen.findByText('Waiting changes are not shown here')).toBeVisible()
    expect(screen.getByText(/1 waiting in plan-1-/)).toBeVisible()
    expect(screen.getByText(/still shows revision 1/)).toBeVisible()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Open live product preview' }))
    const pendingButton = screen.getByRole('button', { name: 'Pending plan' })
    expect(pendingButton).toBeEnabled()
    await user.click(pendingButton)
    expect(screen.getByText(/plan-1-.*Preview only · Not applied/)).toBeVisible()
    expect(screen.getByText('Ideas shaped by your travel interests')).toBeVisible()
    expect(controller.getSnapshot().record.state.processing.recommendations).toBe(false)
  })

  it('redirects the legacy privacy hash to the ClearRights developer page', async () => {
    window.history.replaceState(null, '', '#/privacy')
    const controller = await createController()
    renderApp(controller)

    expect(await screen.findByRole('heading', { name: 'ClearRights Privacy' })).toBeVisible()
    expect(screen.getByText('Unavailable · manual fallback active')).toBeVisible()
    expect(window.location.hash).toBe('#/clearrights')
  })

  it('records Essential only even when the conservative seed already matches it', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller, true)

    expect(screen.getByRole('region', { name: 'Privacy choices' })).toBeVisible()
    expect(screen.getByText('Structured agent access detected in this browser.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Essential only' }))

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Privacy choices' })).not.toBeInTheDocument())
    expect(controller.getSnapshot().record.notice).toEqual(expect.objectContaining({
      status: 'recorded',
      method: 'reject_optional',
    }))
    await user.click(screen.getByRole('button', { name: 'How ClearRights works' }))
    expect(await screen.findByText('Direct human choice')).toBeVisible()
    expect(screen.getByText('Direct action · hold not required')).toBeVisible()
    expect(controller.getReceipt()).toEqual(expect.objectContaining({
      kind: 'initial_choice',
      changes: [],
    }))
  })

  it('keeps the notice pending when Manage choices only opens the settings', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller)

    await user.click(screen.getByRole('button', { name: 'Manage choices' }))

    expect(screen.getByRole('dialog', { name: 'Waypoint Privacy Settings' })).toBeVisible()
    expect(controller.getSnapshot().record.notice.status).toBe('pending')
    expect(controller.getReceipt()).toBeNull()
  })

  it('applies Accept all through the local adapter and dismisses the banner', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller)

    expect(within(screen.getByTestId('privacy-navbar-status')).getByText('Choice required')).toBeVisible()
    expect(screen.getByText('Popular places, selected without profile data')).toBeVisible()
    expect(screen.queryByText('Around your Lisbon stay')).not.toBeInTheDocument()
    expect(screen.queryByText('A flexible rail pass for your saved city trips')).not.toBeInTheDocument()
    expect(document.querySelector('[data-clearrights-surface="travel-discovery"]')).toHaveAttribute('data-clearrights-result', 'generic')
    await user.click(screen.getByRole('button', { name: 'Accept all' }))

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Privacy choices' })).not.toBeInTheDocument())
    expect(controller.getSnapshot().record.state.processing.recommendations).toBe(true)
    expect(screen.getByText('Ideas shaped by your travel interests')).toBeVisible()
    expect(screen.getByText('Around your Lisbon stay')).toBeVisible()
    expect(screen.getByText('A flexible rail pass for your saved city trips')).toBeVisible()
    expect(document.querySelector('[data-clearrights-surface="travel-discovery"]')).toHaveAttribute('data-clearrights-result', 'personalised')
    expect(document.querySelector('[data-clearrights-surface="nearby-guide"]')).toBeInTheDocument()
    expect(document.querySelector('[data-clearrights-surface="partner-offer"]')).toBeInTheDocument()
    expect(document.querySelector('img[src="/cards/reykjavik.jpg"]')).toBeInTheDocument()
    expect(document.querySelector('img[src="/cards/rail-pass.jpg"]')).toBeInTheDocument()
    const appliedEffect = screen.getByTestId('privacy-navbar-status')
    expect(within(appliedEffect).getByText('All optional uses on')).toBeVisible()
    expect(within(appliedEffect).queryByText(/revision|receipt|readback/i)).not.toBeInTheDocument()
    expect(controller.getReceipt()).toEqual(expect.objectContaining({
      kind: 'initial_choice',
      choiceMethod: 'allow_all',
      changes: expect.arrayContaining([
        expect.objectContaining({ processingId: 'recommendations', after: true }),
      ]),
    }))

    const directReceipt = controller.getReceipt()!
    await user.click(screen.getAllByRole('button', { name: 'Privacy settings' })[0]!)
    await user.click(screen.getByRole('button', { name: /Previous changes/ }))
    await user.click(screen.getByText(`Initial choice · ${directReceipt.id}`))
    await user.click(screen.getByRole('button', { name: 'Open receipt' }))
    expect(screen.getByText(/matched your direct choice/)).toBeVisible()
    expect(screen.queryByText(/matched the reviewed changes/)).not.toBeInTheDocument()
  })

  it('labels a staged privacy plan as pending while the home keeps applied effects', async () => {
    const controller = await createController()
    controller.stage({
      keepCapabilities: ['book_and_manage_trips', 'protect_account', 'receive_trip_updates', 'personalised_recommendations'],
      avoidUses: [],
    }, 'webmcp_tool')
    renderApp(controller, true)

    const effect = screen.getByTestId('privacy-navbar-status')
    expect(within(effect).getByText('Essential only')).toBeVisible()
    expect(within(effect).getByText('1 change pending')).toBeVisible()
    expect(within(effect).getByText('· product unchanged')).toBeVisible()
  })

  it('opens and closes the privacy Sheet over the travel product', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller)

    expect(screen.getByRole('heading', { name: 'Where do you want to go next?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    const privacyCenter = screen.getByRole('dialog', { name: 'Waypoint Privacy Settings' })
    expect(privacyCenter).toBeVisible()
    expect(screen.getByText('GPC is unavailable in this browser')).toBeVisible()
    expect(privacyCenter).toHaveClass(
      'data-[side=right]:w-full',
      'data-[side=right]:sm:w-[min(80vw,920px)]',
      'data-[side=right]:sm:max-w-none',
    )
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Waypoint Privacy Settings' })).not.toBeInTheDocument())
  })

  it('uses a compact header that does not expose secondary navigation on mobile', async () => {
    const controller = await createController()
    renderApp(controller)

    expect(screen.getByText('Waypoint')).toBeVisible()
    expect(screen.getByText('Fictional travel demo')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Trips' })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Account navigation' })).toHaveClass('shrink-0')
    expect(screen.getByRole('button', { name: 'Privacy settings' })).toBeVisible()
  })

  it('completes the manual fallback, verifies a receipt, and resets demo data', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller)
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))

    await user.click(screen.getByLabelText('Recommendations'))
    await user.click(screen.getByLabelText('Location suggestions'))
    await user.click(screen.getByLabelText('Partner advertising'))
    await user.click(screen.getByRole('button', { name: 'Review 3 changes' }))

    expect(screen.getByText('3 changes ready')).toBeVisible()
    await holdToConfirm()
    await user.click(screen.getByRole('button', { name: /Apply changes/ }))

    expect(await screen.findByRole('heading', { name: 'Verified receipt' })).toBeVisible()
    expect(controller.getSnapshot().record.state.processing.recommendations).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('alertdialog', { name: 'Reset demo data?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Reset data' }))

    await waitFor(() => expect(controller.getSnapshot().workflow).toBe('idle'))
    expect(controller.getReceipt()).toBeNull()
    expect(controller.getSnapshot().record.state.processing.recommendations).toBe(false)
    expect(controller.getSnapshot().record.notice.status).toBe('pending')
  })

  it('opens automatically when the shared coordinator reports an agent navigation', async () => {
    const controller = await createController()
    const privacyUi = renderApp(controller, true)

    act(() => {
      const plan = controller.stage({
        keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
        avoidUses: [],
      })
      privacyUi.navigate({
        view: 'review',
        origin: 'agent',
        preparedPlanId: plan.id,
        message: 'The agent prepared the final review of your requested changes.',
      })
    })

    expect(await screen.findByRole('dialog', { name: 'Waypoint Privacy Settings' })).toBeVisible()
    expect(screen.getByText('3 changes ready')).toBeVisible()
    expect(screen.getByText('Agent check')).toBeVisible()
    expect(screen.getByText('Change set prepared')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Display preferences' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Site guide' })).not.toBeInTheDocument()
  })

  it('keeps the agent check when returning to an unchanged plan and revokes it after an edit', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    const plan = controller.stage({
      keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
      avoidUses: [],
    })
    const privacyUi = renderApp(controller, true)

    act(() => privacyUi.navigate({
      view: 'review',
      origin: 'agent',
      preparedPlanId: plan.id,
      message: 'The agent prepared this exact plan.',
    }))
    expect(await screen.findByText('Change set prepared')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Privacy settings' })).toBeVisible()
    expect(privacyUi.getSnapshot().agentPreparation).toEqual({ planId: plan.id })
    await user.click(screen.getByRole('button', { name: 'Review 3 changes' }))
    expect(screen.getByText('Change set prepared')).toBeVisible()
    expect(controller.getSnapshot().plan?.id).toBe(plan.id)

    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('switch', { name: 'Partner advertising' }))
    expect(privacyUi.getSnapshot().agentPreparation).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Review 2 changes' }))
    expect(screen.getByText('Manual change set')).toBeVisible()
    expect(screen.queryByText('Change set prepared')).not.toBeInTheDocument()
  })

  it('keeps the agent dot until meaningful content engagement, not popover or close', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    const plan = controller.stage({
      keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
      avoidUses: [],
    })
    const privacyUi = renderApp(controller, true)

    act(() => privacyUi.navigate({
      view: 'review',
      origin: 'agent',
      preparedPlanId: plan.id,
      message: 'The agent prepared the final review of your requested changes. Read the consequences and approve them manually.',
    }))

    const activityButton = await screen.findByRole('button', { name: 'Agent activity, new agent-opened view' })
    expect(screen.getByTestId('agent-activity-dot')).toBeVisible()
    await user.click(activityButton)
    expect(screen.getByText(/The agent prepared the final review/)).toBeVisible()
    expect(privacyUi.getSnapshot().agentActivity?.status).toBe('opened')
    expect(screen.getByTestId('agent-activity-dot')).toBeVisible()

    await user.keyboard('{Escape}')
    expect(privacyUi.getSnapshot().agentActivity?.status).toBe('opened')

    act(() => privacyUi.navigate({
      view: 'review',
      origin: 'agent',
      preparedPlanId: plan.id,
      message: 'The agent prepared the final review of your requested changes. Read the consequences and approve them manually.',
    }))
    await screen.findByRole('dialog', { name: 'Waypoint Privacy Settings' })
    await user.click(screen.getByText('3 changes ready'))

    expect(privacyUi.getSnapshot().agentActivity?.status).toBe('engaged')
    expect(screen.queryByTestId('agent-activity-dot')).not.toBeInTheDocument()
    expect(controller.getSnapshot().plan?.id).toBe(plan.id)
    expect(screen.getByRole('button', { name: 'Hold to confirm review' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Agent activity, interaction recorded' }))
    expect(screen.getByText('You interacted with this view')).toBeVisible()
  })

  it('acknowledges keyboard and scroll engagement while surviving unrelated rerenders', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    const privacyUi = renderApp(controller, true)
    act(() => privacyUi.navigate({
      view: 'home',
      origin: 'agent',
      message: 'The agent opened the privacy settings overview.',
    }))
    await screen.findByRole('dialog', { name: 'Waypoint Privacy Settings' })

    act(() => {
      controller.stage({
        keepCapabilities: [
          'book_and_manage_trips',
          'protect_account',
          'receive_trip_updates',
        ],
        avoidUses: ['preference_personalisation', 'precise_location', 'partner_marketing'],
      })
    })
    expect(privacyUi.getSnapshot().agentActivity?.status).toBe('opened')
    expect(screen.getByTestId('agent-activity-dot')).toBeVisible()

    screen.getByRole('switch', { name: 'Recommendations' }).focus()
    await user.keyboard('x')
    expect(privacyUi.getSnapshot().agentActivity?.status).toBe('engaged')

    act(() => privacyUi.navigate({
      view: 'home',
      origin: 'agent',
      message: 'The agent opened the privacy settings overview again.',
    }))
    fireEvent.wheel(screen.getByTestId('privacy-view-content'))
    expect(privacyUi.getSnapshot().agentActivity?.status).toBe('engaged')
  })

  it('shows a conflict when a kept capability needs an avoided use', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    const privacyUi = renderApp(controller)
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    act(() => {
      controller.stage({ keepCapabilities: ['nearby_suggestions'], avoidUses: ['precise_location'] })
      privacyUi.navigate({ view: 'review', origin: 'human' })
    })

    expect(screen.getByText('Conflicting request')).toBeVisible()
    expect(screen.getByText(/Nearby suggestions needs precise location/)).toBeVisible()
  })

  it('does not allow reviewing or applying a plan with no changes', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    const privacyUi = renderApp(controller, true)
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    act(() => {
      controller.stage({
        keepCapabilities: [
          'book_and_manage_trips',
          'protect_account',
          'receive_trip_updates',
        ],
        avoidUses: ['preference_personalisation', 'precise_location', 'partner_marketing'],
      })
      privacyUi.navigate({ view: 'review', origin: 'human' })
    })

    expect(screen.getByText('You’re already set')).toBeVisible()
    expect(screen.getByText(/nothing to approve or apply/i)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Hold to confirm review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Apply changes/ })).not.toBeInTheDocument()
  })

  it('explains locked essentials when an already-minimal plan avoids every use', async () => {
    const controller = await createController()
    const privacyUi = renderApp(controller, true)

    act(() => {
      controller.stage({
        keepCapabilities: [],
        avoidUses: [
          'booking_operations',
          'fraud_prevention',
          'service_communications',
          'preference_personalisation',
          'precise_location',
          'partner_marketing',
        ],
      })
      privacyUi.navigate({
        view: 'review',
        origin: 'agent',
        message: 'The agent prepared the minimum privacy review.',
      })
    })

    expect(screen.getByText('You’re already set')).toBeVisible()
    expect(screen.getByText(/All optional settings are already off/)).toBeVisible()
    expect(screen.getByText('3 essential settings stay on')).toBeVisible()
    expect(screen.queryByText('This required activity cannot be changed')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hold to confirm review' })).not.toBeInTheDocument()
  })

  it('shows the latest verified receipt after the controller reloads', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStorage()
    const controller = await createController(storage)
    const plan = controller.stage({
      keepCapabilities: travelCatalog.capabilities.map(({ id }) => id),
      avoidUses: [],
    })
    controller.setReviewed(true)
    const receipt = await controller.apply(plan.id)
    const reloaded = await createController(storage)

    renderApp(reloaded, true)
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    await user.click(screen.getByRole('button', { name: /Previous changes/ }))
    await user.click(screen.getByText(new RegExp(`^3 changes · ${receipt.id}$`)))
    await user.click(screen.getByRole('button', { name: /Open receipt/ }))

    expect(reloaded.getSnapshot().workflow).toBe('idle')
    expect(screen.getAllByText('Verified receipt').length).toBeGreaterThan(0)
    expect(screen.getByText(receipt.id)).toBeVisible()
    expect(screen.getByText('1 → 2')).toBeVisible()
  })

  it('hides a staged preview and revokes review when the intent changes', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller, true)
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    await user.click(screen.getByLabelText('Recommendations'))
    await user.click(screen.getByLabelText('Location suggestions'))
    await user.click(screen.getByLabelText('Partner advertising'))
    await user.click(screen.getByRole('button', { name: 'Review 3 changes' }))
    await holdToConfirm()

    expect(controller.getSnapshot().workflow).toBe('reviewed')
    expect(screen.getByText('3 changes ready')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove confirmation' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Remove confirmation' }))
    expect(controller.getSnapshot().workflow).toBe('staged')
    expect(screen.getByRole('button', { name: 'Hold to confirm review' })).toHaveAttribute('aria-pressed', 'false')
    await holdToConfirm()
    expect(controller.getSnapshot().workflow).toBe('reviewed')

    await user.click(screen.getByRole('button', { name: 'Edit settings' }))
    await user.click(screen.getByLabelText('Partner advertising'))

    expect(controller.getSnapshot().workflow).toBe('staged')
    expect(screen.getByRole('button', { name: 'Review 2 changes' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Hold to confirm review' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Review 2 changes' }))
    expect(screen.getByText('2 changes ready')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Hold to confirm review' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('navigates from current setup to an activity detail and back', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller)
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))

    expect(screen.getByRole('heading', { name: 'Privacy settings' })).toBeVisible()
    expect(screen.getByText('Essential services')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Open Recommendations details' }))

    expect(screen.getByRole('heading', { name: 'Setting details' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Setting details' })).toHaveFocus()
    expect(screen.getByText('Travel preferences, Viewed destinations, Past trips')).toBeVisible()
    expect(screen.getAllByText('Waypoint Demo Privacy Notice §3.1')).not.toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Privacy settings' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Privacy settings' })).toHaveFocus()
  })

  it('returns from setting details without losing accumulated choices', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller)
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    await user.click(screen.getByLabelText('Recommendations'))

    await user.click(screen.getByRole('button', { name: 'Open Recommendations details' }))
    expect(screen.getByRole('heading', { name: 'Setting details' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByRole('heading', { name: 'Privacy settings' })).toBeVisible()
    expect(screen.getByLabelText('Recommendations')).toBeChecked()
    expect(screen.getByText('Will turn on')).toBeVisible()
    expect(screen.getByText('Now on · 0 of 3 optional')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Review 1 change' })).toBeVisible()
  })

  it('applies accessibility preferences immediately, exposes one Undo, and records Activity', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    const runtime = testRuntimes.get(controller)!
    renderApp(controller)
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    await user.click(screen.getByLabelText('Recommendations'))
    expect(screen.getAllByRole('tab').map(({ textContent }) => textContent)).toEqual(['Privacy', 'Activity'])
    expect(screen.queryByRole('tab', { name: 'Display preferences' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Display preferences' }))

    expect(screen.getByRole('heading', { name: 'Display preferences' })).toBeVisible()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Display preferences' })).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Back to Privacy' })).toBeVisible()
    await user.click(screen.getByRole('radio', { name: 'Large' }))
    expect(runtime.accessibility.getSnapshot().current.textScale).toBe('large')
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Back to Privacy' }))
    expect(screen.getByLabelText('Recommendations')).toBeChecked()
    expect(screen.getByRole('button', { name: 'Review 1 change' })).toBeVisible()
    await user.click(screen.getByRole('tab', { name: /Activity/ }))
    expect(screen.getByText('Text size was updated.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Display preferences' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(runtime.accessibility.getSnapshot().current.textScale).toBe('system')
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })

  it('uses keyboard tabs and moves secondary content into a reachable focused disclosure', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller)
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    const privacyTab = screen.getByRole('tab', { name: 'Privacy' })
    privacyTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Privacy' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Display preferences' }))
    await user.click(screen.getByRole('radio', { name: 'Focused' }))
    await user.keyboard('{Escape}')
    const disclosure = screen.getByText('Travel ideas · Generic suggestions').closest('details')
    expect(disclosure).not.toHaveAttribute('open')
    expect(screen.getByRole('heading', { name: 'Upcoming trips' })).toBeVisible()
    expect(screen.getByText('Popular places, selected without profile data')).not.toBeVisible()
  })

  it('shows only related privacy pages while preserving the complete Site Guide catalog', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller)
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    await user.click(screen.getByRole('button', { name: 'Site guide' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Related privacy pages' })).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Back to Privacy' })).toBeVisible()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.getByText('Privacy notice')).toBeVisible()
    expect(screen.getByText('Cookie details')).toBeVisible()
    expect(screen.getByText('Accessibility statement')).toBeVisible()
    expect(screen.getByText('Help and support')).toBeVisible()
    expect(screen.getByText('Contact Waypoint')).toBeVisible()
    expect(screen.queryByText('Cancellation policy')).not.toBeInTheDocument()
    expect(screen.queryByText('Payment methods')).not.toBeInTheDocument()
    expect(waypointSiteGuideCatalog.destinations).toHaveLength(12)
    expect(waypointSiteGuideCatalog.getDestination('cancellation-policy').label).toBe('Cancellation policy')
    await user.click(screen.getByRole('button', { name: 'Open Privacy notice' }))
    expect(window.location.hash).toBe('#/info/privacy-notice')
    expect(screen.queryByRole('dialog', { name: 'Waypoint Privacy Settings' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Privacy notice' })).toHaveFocus()
    expect(screen.getByText(/Waypoint Travel is fictional/)).toBeVisible()
  })

  it('opens Display preferences for the agent without treating engagement as privacy approval', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    const runtime = testRuntimes.get(controller)!
    renderApp(controller, true)

    act(() => runtime.controlsUi.openPanel('accessibility', {
      origin: 'agent',
      targetId: 'accessibility-preferences',
      message: 'The agent opened Display preferences so you can inspect the current local settings.',
    }))

    expect(await screen.findByRole('dialog', { name: 'Waypoint Privacy Settings' })).toBeVisible()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Display preferences' })).toHaveFocus())
    expect(screen.getByTestId('agent-activity-dot')).toBeVisible()
    expect(runtime.controlsUi.getSnapshot().agentActivity?.status).toBe('opened')
    expect(controller.getSnapshot().workflow).toBe('idle')

    await user.click(screen.getByRole('heading', { name: 'Display preferences' }))

    expect(runtime.controlsUi.getSnapshot().agentActivity?.status).toBe('engaged')
    expect(screen.queryByTestId('agent-activity-dot')).not.toBeInTheDocument()
    expect(controller.getSnapshot().workflow).toBe('idle')
  })

  it('opens the declared bookings anchor and leaves browser Back functional', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    const runtime = testRuntimes.get(controller)!
    renderApp(controller)

    await act(async () => {
      await runtime.siteGuide.navigate('bookings', 'human')
    })
    expect(window.location.hash).toBe('#/?focus=upcoming-trips')
    expect(screen.getByRole('heading', { name: 'Upcoming trips' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'How ClearRights works' }))
    expect(window.location.hash).toBe('#/clearrights')
    act(() => window.history.back())
    await waitFor(() => expect(window.location.hash).toBe('#/?focus=upcoming-trips'))
    expect(screen.getByRole('heading', { name: 'Upcoming trips' })).toBeVisible()
  })

  it('shows a route-level agent indicator until page engagement and resets every demo store', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    const runtime = testRuntimes.get(controller)!
    renderApp(controller, true)

    await act(async () => {
      await runtime.siteGuide.navigate('cancellation-policy', 'agent')
    })
    expect(screen.getByTestId('agent-activity-dot')).toBeVisible()
    expect(runtime.controlsUi.getSnapshot().agentActivity?.status).toBe('opened')
    await user.click(screen.getByRole('heading', { name: 'Cancellation policy' }))
    expect(runtime.controlsUi.getSnapshot().agentActivity?.status).toBe('engaged')

    act(() => runtime.controlsUi.openPanel('accessibility', { origin: 'human', targetId: 'accessibility' }))
    await user.click(screen.getByRole('radio', { name: 'Large' }))
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    await user.click(screen.getByRole('button', { name: 'Reset data' }))

    await waitFor(() => expect(runtime.controlsUi.getSnapshot().open).toBe(false))
    expect(runtime.accessibility.getSnapshot().current.textScale).toBe('system')
    expect(runtime.activity.getSnapshot().events).toEqual([])
    expect(controller.getSnapshot().record.notice.status).toBe('pending')
    expect(window.location.hash).toBe('#/')
  })
})
