import type {
  AccessibilitySnapshot,
  AccessibilityState,
  PrivacyReceipt,
  ProcessingState,
} from '@/domain'
import { waypointProductEffectRegistry } from './product-effect-registry'

export {
  WAYPOINT_PRODUCT_EFFECT_REGISTRY_FILE,
  waypointProductEffectRegistry,
} from './product-effect-registry'

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
  | 'waypoint-color-scheme'
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
  code: {
    consumerFile: string
    expression: string
  }
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
