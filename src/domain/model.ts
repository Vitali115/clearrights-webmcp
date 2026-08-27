export const PROCESSING_IDS = [
  'trip_fulfilment',
  'account_security',
  'transactional_updates',
  'recommendations',
  'location_suggestions',
  'partner_advertising',
] as const

export type ProcessingId = (typeof PROCESSING_IDS)[number]

export const CAPABILITY_IDS = [
  'book_and_manage_trips',
  'protect_account',
  'receive_trip_updates',
  'personalised_recommendations',
  'nearby_suggestions',
  'partner_offers',
] as const

export type CapabilityId = (typeof CAPABILITY_IDS)[number]

export const USE_IDS = [
  'booking_operations',
  'fraud_prevention',
  'service_communications',
  'preference_personalisation',
  'precise_location',
  'partner_marketing',
] as const

export type UseId = (typeof USE_IDS)[number]

export type ProcessingGroup = 'required' | 'optional'

export type DeclaredLegalBasis = 'contract' | 'legitimate_interest' | 'consent'

export interface CapabilityDefinition {
  id: CapabilityId
  label: string
  description: string
}

export interface UseDefinition {
  id: UseId
  label: string
  description: string
}

export interface ProcessingDefinition {
  id: ProcessingId
  label: string
  group: ProcessingGroup
  locked: boolean
  purpose: string
  data: readonly string[]
  declaredLegalBasis: DeclaredLegalBasis
  control: string
  dependencies: readonly ProcessingId[]
  consequence: string
  policyReference: string
  capabilities: readonly CapabilityId[]
  uses: readonly UseId[]
}

export type ProcessingState = Record<ProcessingId, boolean>

export interface UserPrivacyState {
  revision: number
  processing: ProcessingState
}

export interface PlannerInput {
  keepCapabilities: readonly CapabilityId[]
  avoidUses: readonly UseId[]
}

export interface PlanChange {
  processingId: ProcessingId
  label: string
  before: boolean
  after: boolean
  reason: string
}

export interface PlanConsequence {
  processingId: ProcessingId
  kind: 'disabled' | 'enabled'
  message: string
}

export interface PlanConflict {
  processingId: ProcessingId
  capabilityId: CapabilityId
  useId: UseId
  message: string
}

export interface BlockedItem {
  processingId: ProcessingId
  useId: UseId
  message: string
}

export interface PrivacyPlan {
  id: string
  baseRevision: number
  input: PlannerInput
  target: ProcessingState
  changes: readonly PlanChange[]
  preservedCapabilities: readonly CapabilityId[]
  consequences: readonly PlanConsequence[]
  conflicts: readonly PlanConflict[]
  blockedItems: readonly BlockedItem[]
  isNoOp: boolean
}

export type WorkflowStatus = 'idle' | 'staged' | 'reviewed' | 'applied'

export type WorkflowEvent = 'stage' | 'review' | 'revoke_review' | 'apply' | 'reset'

export class DomainError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}
