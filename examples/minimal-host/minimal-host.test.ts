import { describe, expect, it, vi } from 'vitest'
import { createMinimalHost } from './bootstrap'

describe('minimal ClearRights host', () => {
  it('connects catalogued decisions to verified host effects', async () => {
    const host = await createMinimalHost()
    const listener = vi.fn()
    const unsubscribe = host.subscribe(listener)

    expect(host.selectExperience()).toEqual({
      feed: 'generic',
      textScale: 'system',
      colorScheme: 'system',
      readingLayout: 'standard',
    })

    const plan = host.privacy.stage({
      keepCapabilities: ['use_service', 'personalised_feed'],
      avoidUses: [],
    }, 'page_ui')
    // A real host calls setReviewed only after its visible human confirmation completes.
    host.privacy.setReviewed(true, 'review_hold')
    const receipt = await host.privacy.apply(plan.id)

    expect(receipt.verified).toBe(true)
    expect(receipt.verification.readback.recommendations).toBe(true)
    expect(host.selectExperience().feed).toBe('personalised')

    const accessibility = await host.accessibility.setPreferences({ textScale: 'large', colorScheme: 'dark' }, 'agent')
    expect(accessibility.readback.textScale).toBe('large')
    expect(accessibility.readback.colorScheme).toBe('dark')
    expect(host.selectExperience().textScale).toBe('large')
    expect(host.selectExperience().colorScheme).toBe('dark')

    const navigation = await host.siteGuide.navigate('privacy-controls', 'agent')
    expect(navigation.location).toBe('panel:personal_controls/privacy')
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ feed: 'personalised', textScale: 'large', colorScheme: 'dark' }))

    unsubscribe()
  })
})
