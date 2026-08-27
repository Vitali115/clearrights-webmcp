import { describe, expect, it, vi } from 'vitest'
import { createSiteGuideRuntime } from '@clearrights/sdk/site-guide'
import { WaypointNavigationAdapter } from '@/adapters/navigation/waypoint-navigation-adapter'
import { waypointSiteGuideCatalog } from '@/demo/waypoint/site-guide-catalog'

describe('Site Guide runtime', () => {
  it('opens declared routes and publishes the visible destination', async () => {
    let location = '/#/'
    const openRoute = vi.fn((path: string, hash?: string) => { location = `${path}${hash ?? ''}` })
    const runtime = createSiteGuideRuntime({
      catalog: waypointSiteGuideCatalog,
      navigator: new WaypointNavigationAdapter({ openRoute, openPanel: vi.fn(), getLocation: () => location }),
    })
    const snapshots: string[] = []
    runtime.subscribe((snapshot) => snapshots.push(snapshot.currentDestinationId ?? 'none'))

    const result = await runtime.navigate('cancellation-policy', 'agent')
    expect(openRoute).toHaveBeenCalledWith('/', '#/info/cancellation-policy', expect.objectContaining({
      destinationId: 'cancellation-policy',
      origin: 'agent',
    }))
    expect(result).toEqual(expect.objectContaining({
      destinationId: 'cancellation-policy',
      origin: 'agent',
      location: '/#/info/cancellation-policy',
    }))
    expect(runtime.getSnapshot().currentDestinationId).toBe('cancellation-policy')
    expect(snapshots).toEqual(['cancellation-policy'])
  })

  it('opens declared Personal Controls sections without changing another domain', async () => {
    const openPanel = vi.fn()
    const runtime = createSiteGuideRuntime({
      catalog: waypointSiteGuideCatalog,
      navigator: new WaypointNavigationAdapter({ openRoute: vi.fn(), openPanel, getLocation: () => '/#/' }),
    })

    await runtime.navigate('accessibility-preferences', 'human')
    expect(openPanel).toHaveBeenCalledWith('accessibility', expect.objectContaining({
      destinationId: 'accessibility-preferences',
      origin: 'human',
    }))
  })

  it('rejects undeclared destination IDs before invoking the host', async () => {
    const openRoute = vi.fn()
    const openPanel = vi.fn()
    const runtime = createSiteGuideRuntime({
      catalog: waypointSiteGuideCatalog,
      navigator: new WaypointNavigationAdapter({ openRoute, openPanel, getLocation: () => '/#/' }),
    })

    await expect(runtime.navigate('/arbitrary-path', 'agent')).rejects.toMatchObject({ code: 'unknown_destination' })
    expect(openRoute).not.toHaveBeenCalled()
    expect(openPanel).not.toHaveBeenCalled()
  })
})
