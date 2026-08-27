import { describe, expect, it } from 'vitest'
import { createPersonalControlsCoordinator } from './personal-controls-coordinator'

describe('PersonalControlsCoordinator', () => {
  it('opens human-selected panels without creating agent activity', () => {
    const coordinator = createPersonalControlsCoordinator()
    coordinator.openPanel('site_guide', { origin: 'human', targetId: 'site-guide' })
    expect(coordinator.getSnapshot()).toEqual({
      open: true,
      section: 'site_guide',
      focusRequest: 1,
      agentActivity: null,
    })
  })

  it('keeps agent panel and route activity opened until meaningful engagement', () => {
    const coordinator = createPersonalControlsCoordinator()
    coordinator.openPanel('accessibility', {
      origin: 'agent',
      targetId: 'accessibility-preferences',
      message: 'The agent changed accessibility preferences.',
    })
    coordinator.close()
    expect(coordinator.getSnapshot().agentActivity).toEqual(expect.objectContaining({
      kind: 'panel',
      status: 'opened',
    }))

    coordinator.reportRoute({
      origin: 'agent',
      targetId: 'cancellation-policy',
      message: 'The agent opened Cancellation policy.',
    })
    expect(coordinator.getSnapshot().agentActivity).toEqual(expect.objectContaining({
      kind: 'route',
      targetId: 'cancellation-policy',
      status: 'opened',
    }))
    coordinator.acknowledge()
    expect(coordinator.getSnapshot().agentActivity?.status).toBe('engaged')
  })
})
