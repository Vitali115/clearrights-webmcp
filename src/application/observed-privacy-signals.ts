export type ObservedGlobalPrivacyControl =
  | {
      support: 'supported'
      value: boolean
      interpretation: 'opt_out_observed' | 'no_opt_out_observed'
      effect: 'informational_only'
    }
  | {
      support: 'unavailable'
      value: null
      interpretation: 'unavailable'
      effect: 'informational_only'
    }

export interface ObservedPrivacySignals {
  globalPrivacyControl: ObservedGlobalPrivacyControl
}
