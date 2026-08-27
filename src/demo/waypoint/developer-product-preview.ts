import type {
  AccessibilitySnapshot,
  PrivacyReceipt,
  ProcessingState,
} from '@/domain'
import {
  selectWaypointExperience,
  type WaypointExperienceViewModel,
} from './product-effects'

export type WaypointDeveloperPreviewMode = 'applied' | 'pending' | 'sandbox'

export interface WaypointPrivacySandboxState {
  recommendations: boolean
  location_suggestions: boolean
  partner_advertising: boolean
}

export interface WaypointDeveloperPreviewModel {
  mode: WaypointDeveloperPreviewMode
  experience: WaypointExperienceViewModel
  pendingAvailable: boolean
  pendingPlanId: string | null
  sandbox: WaypointPrivacySandboxState
  evidence:
    | { kind: 'applied'; revision: number; verified: boolean }
    | { kind: 'pending_plan'; planId: string; verified: false }
    | { kind: 'sandbox'; verified: false }
}

export function createWaypointPrivacySandboxState(
  state: ProcessingState,
): WaypointPrivacySandboxState {
  return {
    recommendations: state.recommendations,
    location_suggestions: state.location_suggestions,
    partner_advertising: state.partner_advertising,
  }
}

export function selectWaypointDeveloperPreview({
  mode,
  appliedState,
  appliedRevision,
  appliedReceipt,
  pending,
  sandbox,
  accessibility,
}: {
  mode: WaypointDeveloperPreviewMode
  appliedState: ProcessingState
  appliedRevision: number
  appliedReceipt: PrivacyReceipt | null
  pending: { planId: string; target: ProcessingState } | null
  sandbox: WaypointPrivacySandboxState
  accessibility: AccessibilitySnapshot
}): WaypointDeveloperPreviewModel {
  const resolvedMode = mode === 'pending' && !pending ? 'applied' : mode
  const state = resolvedMode === 'pending' && pending
    ? pending.target
    : resolvedMode === 'sandbox'
      ? { ...appliedState, ...sandbox }
      : appliedState
  const experience = selectWaypointExperience({
    privacyState: state,
    privacyRevision: appliedRevision,
    privacyReceipt: resolvedMode === 'applied' ? appliedReceipt : null,
    accessibility,
  })

  return {
    mode: resolvedMode,
    experience,
    pendingAvailable: Boolean(pending),
    pendingPlanId: pending?.planId ?? null,
    sandbox,
    evidence: resolvedMode === 'pending' && pending
      ? { kind: 'pending_plan', planId: pending.planId, verified: false }
      : resolvedMode === 'sandbox'
        ? { kind: 'sandbox', verified: false }
        : {
            kind: 'applied',
            revision: appliedRevision,
            verified: experience.effects
              .filter(({ source }) => source === 'privacy')
              .every(({ verification }) => verification.verified),
          },
  }
}
