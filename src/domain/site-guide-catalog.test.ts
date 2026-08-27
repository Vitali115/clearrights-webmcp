import { describe, expect, it } from 'vitest'
import { defineSiteGuideCatalog } from '@clearrights/sdk/site-guide'
import { waypointSiteGuideCatalog } from '@/demo/waypoint/site-guide-catalog'

const validDestination = {
  id: 'safe-route',
  label: 'Safe route',
  summary: 'A same-origin route.',
  category: 'Test',
  keywords: ['safe-keyword'],
  target: { kind: 'route' as const, path: '/', hash: '#/safe' },
}

describe('site guide catalog', () => {
  it('searches developer-authored fields case-insensitively', () => {
    expect(waypointSiteGuideCatalog.search('REFUND').map(({ id }) => id)).toEqual(['cancellation-policy'])
    expect(waypointSiteGuideCatalog.search('privacy').map(({ id }) => id)).toEqual(expect.arrayContaining([
      'privacy-choices',
      'privacy-notice',
      'cookie-details',
    ]))
    expect(waypointSiteGuideCatalog.search('')).toHaveLength(12)
  })

  it.each([
    'https://example.com',
    '//example.com/path',
    'javascript:alert(1)',
    'data:text/html,unsafe',
    '/unsafe\\path',
    '/unsafe\npath',
    '/unsafe%0apath',
  ])('rejects unsafe or non-relative route path %s', (path) => {
    expect(() => defineSiteGuideCatalog({
      version: 'invalid',
      destinations: [{ ...validDestination, target: { kind: 'route', path } }],
    })).toThrowError(expect.objectContaining({ code: 'unsafe_target' }))
  })

  it('rejects unsafe hashes, duplicate IDs and duplicate keywords', () => {
    expect(() => defineSiteGuideCatalog({
      version: 'invalid',
      destinations: [{ ...validDestination, target: { kind: 'route', path: '/', hash: '#javascript:alert(1)' } }],
    })).toThrowError(expect.objectContaining({ code: 'unsafe_target' }))
    expect(() => defineSiteGuideCatalog({
      version: 'invalid',
      destinations: [validDestination, { ...validDestination }],
    })).toThrowError(expect.objectContaining({ code: 'invalid_catalog' }))
    expect(() => defineSiteGuideCatalog({
      version: 'invalid',
      destinations: [validDestination, {
        ...validDestination,
        id: 'another-route',
        keywords: ['SAFE-KEYWORD'],
      }],
    })).toThrowError(expect.objectContaining({ code: 'invalid_catalog' }))
  })
})
