import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createPrivacyController,
  createPrivacyViewCoordinator,
  type PrivacyController,
} from '@/application'
import { LocalStoragePrivacyRepository } from '@/adapters/storage/local-storage-privacy-repository'
import { LocalDemoEnforcementAdapter } from '@/adapters/enforcement/local-demo-enforcement-adapter'
import { travelCatalog } from '@/demo/travel-catalog'
import { createTravelSeed } from '@/demo/travel-seed'
import { HOLD_TO_CONFIRM_MS } from '@/ui/HoldToConfirm'
import App from './App'

class MemoryStorage {
  private readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

async function createController(storage = new MemoryStorage()) {
  let tick = 0
  return createPrivacyController({
    catalog: travelCatalog,
    repository: new LocalStoragePrivacyRepository(storage, createTravelSeed),
    enforcement: new LocalDemoEnforcementAdapter(storage, createTravelSeed),
    clock: { now: () => `2026-08-27T12:00:0${tick++}.000Z` },
    idGenerator: { next: () => 'receipt-ui-test' },
  })
}

function renderApp(controller: PrivacyController, webMcpAvailable = false) {
  const privacyUi = createPrivacyViewCoordinator()
  render(<App controller={controller} privacyUi={privacyUi} webMcpAvailable={webMcpAvailable} />)
  return privacyUi
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
  it('opens the internal privacy architecture page with live demo status', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller, true)

    await user.click(screen.getAllByRole('button', { name: 'How privacy works' })[0]!)

    expect(screen.getByRole('heading', { name: 'Privacy choices, readable by people and agents.' })).toBeVisible()
    expect(screen.getByText('WebMCP detected')).toBeVisible()
    expect(screen.getByText('6 declared uses')).toBeVisible()
    expect(screen.getByText('0 of 3 on')).toBeVisible()
    expect(screen.getByText(/createPrivacyRuntime/)).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open privacy settings' }))
    expect(screen.getByRole('dialog', { name: 'Privacy settings panel' })).toBeVisible()
  })

  it('supports a direct hash route to the privacy architecture page', async () => {
    window.history.replaceState(null, '', '#/privacy')
    const controller = await createController()
    renderApp(controller)

    expect(screen.getByRole('heading', { name: 'Privacy choices, readable by people and agents.' })).toBeVisible()
    expect(screen.getByText('Manual only')).toBeVisible()
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
      method: 'essential_only',
    }))
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

    expect(screen.getByRole('dialog', { name: 'Privacy settings panel' })).toBeVisible()
    expect(controller.getSnapshot().record.notice.status).toBe('pending')
    expect(controller.getReceipt()).toBeNull()
  })

  it('applies Accept all through the local adapter and dismisses the banner', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller)

    expect(screen.getByText('Popular destinations')).toBeVisible()
    expect(screen.queryByText('Near your Lisbon trip')).not.toBeInTheDocument()
    expect(screen.queryByText('Personalised partner offer')).not.toBeInTheDocument()
    expect(screen.getByText(/0 of 3 optional data uses active/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Accept all' }))

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Privacy choices' })).not.toBeInTheDocument())
    expect(controller.getSnapshot().record.state.processing.recommendations).toBe(true)
    expect(screen.getByText('Suggestions based on your travel interests')).toBeVisible()
    expect(screen.getByText('Near your Lisbon trip')).toBeVisible()
    expect(screen.getByText('Personalised partner offer')).toBeVisible()
    expect(screen.getByText(/3 of 3 optional data uses active/)).toBeVisible()
    expect(controller.getReceipt()).toEqual(expect.objectContaining({
      kind: 'initial_choice',
      choiceMethod: 'accept_all',
      changes: expect.arrayContaining([
        expect.objectContaining({ processingId: 'recommendations', after: true }),
      ]),
    }))
  })

  it('opens and closes the privacy Sheet over the travel product', async () => {
    const user = userEvent.setup()
    const controller = await createController()
    renderApp(controller)

    expect(screen.getByRole('heading', { name: 'Where do you want to go next?' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    const privacyCenter = screen.getByRole('dialog', { name: 'Privacy settings panel' })
    expect(privacyCenter).toBeVisible()
    expect(privacyCenter).toHaveClass(
      'data-[side=right]:w-full',
      'data-[side=right]:sm:w-[min(80vw,920px)]',
      'data-[side=right]:sm:max-w-none',
    )
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Privacy settings panel' })).not.toBeInTheDocument())
  })

  it('uses a compact header that does not expose secondary navigation on mobile', async () => {
    const controller = await createController()
    renderApp(controller)

    expect(screen.getByText('Waypoint')).toBeVisible()
    expect(screen.queryByText('Travel demo')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trips' })).toHaveClass('hidden', 'sm:inline-flex')
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
    await user.click(screen.getByRole('button', { name: /Review changes/ }))

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

    expect(await screen.findByRole('dialog', { name: 'Privacy settings panel' })).toBeVisible()
    expect(screen.getByText('3 changes ready')).toBeVisible()
    expect(screen.getByText(/Agent access available/)).toBeVisible()
    expect(screen.getByText('Agent check')).toBeVisible()
    expect(screen.getByText('Change set prepared')).toBeVisible()
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
    await user.click(screen.getByRole('button', { name: 'Review changes' }))
    expect(screen.getByText('Change set prepared')).toBeVisible()
    expect(controller.getSnapshot().plan?.id).toBe(plan.id)

    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('switch', { name: 'Partner advertising' }))
    expect(privacyUi.getSnapshot().agentPreparation).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Review changes' }))
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

    const activityButton = await screen.findByRole('button', { name: 'Agent activity, view awaiting review' })
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
    await screen.findByRole('dialog', { name: 'Privacy settings panel' })
    await user.click(screen.getByText('3 changes ready'))

    expect(privacyUi.getSnapshot().agentActivity?.status).toBe('engaged')
    expect(screen.queryByTestId('agent-activity-dot')).not.toBeInTheDocument()
    expect(controller.getSnapshot().plan?.id).toBe(plan.id)
    expect(screen.getByRole('button', { name: 'Hold to confirm review' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Agent activity, view review started' }))
    expect(screen.getByText('You started reviewing this view')).toBeVisible()
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
    await screen.findByRole('dialog', { name: 'Privacy settings panel' })

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
    fireEvent.scroll(screen.getByTestId('privacy-view-content'))
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
    await user.click(screen.getByRole('button', { name: /Review changes/ }))
    await holdToConfirm()

    expect(controller.getSnapshot().workflow).toBe('reviewed')
    expect(screen.getByText('3 changes ready')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Edit settings' }))
    await user.click(screen.getByLabelText('Partner advertising'))

    expect(controller.getSnapshot().workflow).toBe('staged')
    expect(screen.getByText('2 pending changes')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Hold to confirm review' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Review changes/ }))
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
    expect(screen.getByText('Waypoint Demo Privacy Notice §3.1')).toBeVisible()
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
    expect(screen.getByText('1 pending change')).toBeVisible()
  })
})
