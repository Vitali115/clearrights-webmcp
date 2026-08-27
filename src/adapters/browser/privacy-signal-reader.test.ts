import { describe, expect, it } from 'vitest'
import { readObservedPrivacySignals } from './privacy-signal-reader'

describe('browser privacy signal reader', () => {
  it('reports an observed GPC opt-out without applying a privacy choice', () => {
    expect(readObservedPrivacySignals({ globalPrivacyControl: true } as unknown as Navigator)).toEqual({
      globalPrivacyControl: {
        support: 'supported',
        value: true,
        interpretation: 'opt_out_observed',
        effect: 'informational_only',
      },
    })
  })

  it('does not describe false as consent', () => {
    expect(readObservedPrivacySignals({ globalPrivacyControl: false } as unknown as Navigator)).toEqual({
      globalPrivacyControl: {
        support: 'supported',
        value: false,
        interpretation: 'no_opt_out_observed',
        effect: 'informational_only',
      },
    })
  })

  it.each([{}, { globalPrivacyControl: 'true' }])('reports unsupported or invalid values as unavailable', (navigatorObject) => {
    expect(readObservedPrivacySignals(navigatorObject as Navigator)).toEqual({
      globalPrivacyControl: {
        support: 'unavailable',
        value: null,
        interpretation: 'unavailable',
        effect: 'informational_only',
      },
    })
  })
})
