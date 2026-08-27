import { describe, expect, it, vi } from 'vitest'
import { createPrivacyViewCoordinator } from './privacy-view-coordinator'

describe('PrivacyViewCoordinator', () => {
  it('tracks human navigation without creating agent activity', () => {
    const coordinator = createPrivacyViewCoordinator()

    coordinator.navigate({
      view: 'activity',
      processingId: 'recommendations',
      origin: 'human',
    })

    expect(coordinator.getSnapshot()).toEqual({
      navigation: {
        view: 'activity',
        processingId: 'recommendations',
        origin: 'human',
      },
      agentActivity: null,
      agentPreparation: null,
    })
  })

  it('keeps agent activity opened until it is explicitly acknowledged', () => {
    const coordinator = createPrivacyViewCoordinator()
    const listener = vi.fn()
    coordinator.subscribe(listener)

    coordinator.navigate({
      view: 'review',
      origin: 'agent',
      message: 'The agent prepared the final review.',
    })

    expect(coordinator.getSnapshot().agentActivity).toEqual(expect.objectContaining({
      view: 'review',
      status: 'opened',
      message: 'The agent prepared the final review.',
    }))
    expect(listener).toHaveBeenCalledTimes(1)

    coordinator.acknowledge()

    expect(coordinator.getSnapshot().agentActivity?.status).toBe('engaged')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('retains the last agent message through later human navigation', () => {
    const coordinator = createPrivacyViewCoordinator()
    coordinator.navigate({
      view: 'history',
      origin: 'agent',
      message: 'The agent opened previous changes.',
    })
    coordinator.navigate({ view: 'home', origin: 'human' })

    expect(coordinator.getSnapshot().navigation).toEqual({
      view: 'home',
      origin: 'human',
      processingId: null,
    })
    expect(coordinator.getSnapshot().agentActivity).toEqual(expect.objectContaining({
      view: 'history',
      status: 'opened',
    }))
  })

  it('keeps an agent preparation tied to its plan until explicitly revoked', () => {
    const coordinator = createPrivacyViewCoordinator()
    coordinator.navigate({
      view: 'review',
      origin: 'agent',
      preparedPlanId: 'plan-1',
      message: 'The agent prepared plan 1.',
    })
    coordinator.navigate({ view: 'home', origin: 'human' })

    expect(coordinator.getSnapshot().agentPreparation).toEqual({ planId: 'plan-1' })
    coordinator.revokeAgentPreparation()
    expect(coordinator.getSnapshot().agentPreparation).toBeNull()
  })

  it('replaces the last activity when the agent opens another view', () => {
    const coordinator = createPrivacyViewCoordinator()
    coordinator.navigate({ view: 'home', origin: 'agent', message: 'First view.' })
    coordinator.acknowledge()
    coordinator.navigate({ view: 'receipt', origin: 'agent', message: 'Second view.' })

    expect(coordinator.getSnapshot().agentActivity).toEqual({
      sequence: 2,
      view: 'receipt',
      message: 'Second view.',
      status: 'opened',
    })
  })
})
