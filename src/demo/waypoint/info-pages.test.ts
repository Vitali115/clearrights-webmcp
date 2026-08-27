import { describe, expect, it } from 'vitest'
import { waypointSiteGuideCatalog } from './site-guide-catalog'
import { getWaypointInfoPage } from './info-pages'

describe('Waypoint information pages', () => {
  it('provides content for every declared information route', () => {
    const informationRoutes = waypointSiteGuideCatalog.destinations.filter(({ target }) => (
      target.kind === 'route' && target.hash?.startsWith('#/info/')
    ))

    expect(informationRoutes).toHaveLength(8)
    for (const destination of informationRoutes) {
      expect(getWaypointInfoPage(destination.id)).toEqual(expect.objectContaining({
        id: destination.id,
        title: destination.label,
      }))
    }
  })

  it('does not resolve arbitrary or inherited identifiers', () => {
    expect(getWaypointInfoPage('not-declared')).toBeNull()
    expect(getWaypointInfoPage('__proto__')).toBeNull()
  })
})
