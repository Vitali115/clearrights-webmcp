import type {
  AccessibilitySnapshot,
  AccessibilityState,
  PrivacyReceipt,
  ProcessingState,
} from '@/domain'

export type WaypointProductEffectSource = 'privacy' | 'accessibility'

export type WaypointProductEffectResult =
  | 'required'
  | 'generic'
  | 'personalised'
  | 'visible'
  | 'hidden'

export type WaypointProductSurfaceId =
  | 'trip-summary'
  | 'protection-status'
  | 'trip-updates'
  | 'travel-discovery'
  | 'nearby-guide'
  | 'partner-offer'
  | 'root-scale'
  | 'waypoint-tokens'
  | 'waypoint-motion'
  | 'secondary-content'

export interface WaypointProductEffectDefinition {
  id: string
  source: WaypointProductEffectSource
  settingId: string
  settingLabel: string
  surfaceId: WaypointProductSurfaceId
  surfaceLabel: string
  technicalCopy: string
}

export interface WaypointProductEffect extends WaypointProductEffectDefinition {
  runtimeValue: string
  result: WaypointProductEffectResult
  adapterId: string
  adapterScope: 'local_demo' | 'external'
  verification:
    | {
        kind: 'privacy_receipt'
        verified: boolean
        value: string | null
        receiptId: string | null
      }
    | {
        kind: 'accessibility_readback'
        verified: true
        value: string
        receiptId: null
      }
}

export interface WaypointExperienceViewModel {
  essentials: {
    tripSummary: 'required'
    protectionStatus: 'required'
    tripUpdates: 'required'
  }
  discovery: 'generic' | 'personalised'
  nearbyGuide: 'hidden' | 'visible'
  partnerOffer: 'hidden' | 'visible'
  accessibility: AccessibilityState
  effects: readonly WaypointProductEffect[]
  hiddenSurfaceIds: readonly WaypointProductSurfaceId[]
}

export const waypointProductEffectRegistry: readonly WaypointProductEffectDefinition[] = [
  {
    id: 'privacy-trip-summary',
    source: 'privacy',
    settingId: 'trip_fulfilment',
    settingLabel: 'Trip fulfilment',
    surfaceId: 'trip-summary',
    surfaceLabel: 'Upcoming trip summary',
    technicalCopy: 'Keeps the booked-trip summary available because fulfilment is a required service.',
  },
  {
    id: 'privacy-protection-status',
    source: 'privacy',
    settingId: 'account_security',
    settingLabel: 'Account security',
    surfaceId: 'protection-status',
    surfaceLabel: 'Account protection status',
    technicalCopy: 'Keeps the account protection state visible because security processing is required.',
  },
  {
    id: 'privacy-trip-updates',
    source: 'privacy',
    settingId: 'transactional_updates',
    settingLabel: 'Transactional updates',
    surfaceId: 'trip-updates',
    surfaceLabel: 'Essential trip updates',
    technicalCopy: 'Keeps operational booking updates available and separate from marketing.',
  },
  {
    id: 'privacy-discovery',
    source: 'privacy',
    settingId: 'recommendations',
    settingLabel: 'Recommendations',
    surfaceId: 'travel-discovery',
    surfaceLabel: 'Travel discovery',
    technicalCopy: 'Switches the same discovery surface between generic and interest-based content.',
  },
  {
    id: 'privacy-nearby-guide',
    source: 'privacy',
    settingId: 'location_suggestions',
    settingLabel: 'Location suggestions',
    surfaceId: 'nearby-guide',
    surfaceLabel: 'Nearby guide',
    technicalCopy: 'Shows the nearby guide only when the represented location setting is active.',
  },
  {
    id: 'privacy-partner-offer',
    source: 'privacy',
    settingId: 'partner_advertising',
    settingLabel: 'Partner advertising',
    surfaceId: 'partner-offer',
    surfaceLabel: 'Partner rail offer',
    technicalCopy: 'Shows the tailored partner offer only when partner advertising is active.',
  },
  {
    id: 'accessibility-root-scale',
    source: 'accessibility',
    settingId: 'textScale',
    settingLabel: 'Text size',
    surfaceId: 'root-scale',
    surfaceLabel: 'Root text scale',
    technicalCopy: 'Maps the chosen text scale to the Waypoint root element.',
  },
  {
    id: 'accessibility-tokens',
    source: 'accessibility',
    settingId: 'contrast',
    settingLabel: 'Contrast',
    surfaceId: 'waypoint-tokens',
    surfaceLabel: 'Waypoint design tokens',
    technicalCopy: 'Selects the normal or higher-contrast Waypoint token set while respecting forced colors.',
  },
  {
    id: 'accessibility-motion',
    source: 'accessibility',
    settingId: 'motion',
    settingLabel: 'Motion',
    surfaceId: 'waypoint-motion',
    surfaceLabel: 'Waypoint motion',
    technicalCopy: 'Delegates to the system or removes non-essential Waypoint transitions.',
  },
  {
    id: 'accessibility-secondary-content',
    source: 'accessibility',
    settingId: 'readingLayout',
    settingLabel: 'Reading layout',
    surfaceId: 'secondary-content',
    surfaceLabel: 'Secondary travel content',
    technicalCopy: 'Keeps secondary content inline or moves it into a reachable native disclosure.',
  },
]

export function selectWaypointExperience({
  privacyState,
  privacyRevision,
  privacyReceipt,
  accessibility,
}: {
  privacyState: ProcessingState
  privacyRevision: number
  privacyReceipt: PrivacyReceipt | null
  accessibility: AccessibilitySnapshot
}): WaypointExperienceViewModel {
  const discovery = privacyState.recommendations ? 'personalised' : 'generic'
  const nearbyGuide = privacyState.location_suggestions ? 'visible' : 'hidden'
  const partnerOffer = privacyState.partner_advertising ? 'visible' : 'hidden'
  const effects = waypointProductEffectRegistry.map((definition): WaypointProductEffect => {
    const runtimeValue = runtimeValueFor(definition.settingId, privacyState, accessibility.current)
    const receiptVerifiesCurrentValue = definition.source === 'privacy'
      && privacyReceipt?.verified === true
      && privacyReceipt.afterRevision === privacyRevision
      && String(privacyReceipt.verification.readback[definition.settingId]) === runtimeValue
    return {
      ...definition,
      runtimeValue,
      result: resultFor(definition.settingId, privacyState, accessibility.current),
      adapterId: definition.source === 'privacy' ? 'waypoint-local-demo' : accessibility.adapterId,
      adapterScope: definition.source === 'privacy' ? 'local_demo' : accessibility.scope,
      verification: definition.source === 'privacy'
        ? {
            kind: 'privacy_receipt',
            verified: receiptVerifiesCurrentValue,
            value: receiptVerifiesCurrentValue ? runtimeValue : null,
            receiptId: receiptVerifiesCurrentValue ? privacyReceipt.id : null,
          }
        : {
            kind: 'accessibility_readback',
            verified: true,
            value: String(accessibility.current[definition.settingId as keyof AccessibilityState]),
            receiptId: null,
          },
    }
  })

  return {
    essentials: {
      tripSummary: 'required',
      protectionStatus: 'required',
      tripUpdates: 'required',
    },
    discovery,
    nearbyGuide,
    partnerOffer,
    accessibility: { ...accessibility.current },
    effects,
    hiddenSurfaceIds: effects
      .filter(({ result }) => result === 'hidden')
      .map(({ surfaceId }) => surfaceId),
  }
}

function runtimeValueFor(
  settingId: string,
  privacyState: ProcessingState,
  accessibility: AccessibilityState,
): string {
  if (settingId in accessibility) return String(accessibility[settingId as keyof AccessibilityState])
  return String(Boolean(privacyState[settingId]))
}

function resultFor(
  settingId: string,
  privacyState: ProcessingState,
  accessibility: AccessibilityState,
): WaypointProductEffectResult {
  if (settingId === 'trip_fulfilment' || settingId === 'account_security' || settingId === 'transactional_updates') return 'required'
  if (settingId === 'recommendations') return privacyState[settingId] ? 'personalised' : 'generic'
  if (settingId === 'location_suggestions' || settingId === 'partner_advertising') return privacyState[settingId] ? 'visible' : 'hidden'
  if (settingId === 'readingLayout') return accessibility.readingLayout === 'focused' ? 'hidden' : 'visible'
  return 'visible'
}
