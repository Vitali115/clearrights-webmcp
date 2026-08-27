import type { ObservedPrivacySignals } from '@/application'

type NavigatorWithOptionalGpc = Navigator & {
  globalPrivacyControl?: unknown
}

export function readObservedPrivacySignals(navigatorObject: Navigator): ObservedPrivacySignals {
  const candidate = navigatorObject as NavigatorWithOptionalGpc
  if (!('globalPrivacyControl' in candidate) || typeof candidate.globalPrivacyControl !== 'boolean') {
    return {
      globalPrivacyControl: {
        support: 'unavailable',
        value: null,
        interpretation: 'unavailable',
        effect: 'informational_only',
      },
    }
  }

  return {
    globalPrivacyControl: {
      support: 'supported',
      value: candidate.globalPrivacyControl,
      interpretation: candidate.globalPrivacyControl ? 'opt_out_observed' : 'no_opt_out_observed',
      effect: 'informational_only',
    },
  }
}
