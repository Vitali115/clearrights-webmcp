export type ProcessingId = string
export type CapabilityId = string
export type UseId = string
export type PrivacySectionId = string

export type ProcessingGroup = 'required' | 'optional'

export type DeclaredLegalBasis = 'contract' | 'legitimate_interest' | 'consent'

export interface PrivacySectionDefinition {
  id: PrivacySectionId
  label: string
  description: string
}

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
  sectionId: PrivacySectionId
  label: string
  group: ProcessingGroup
  locked: boolean
  defaultEnabled: boolean
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

export interface PrivacyReceipt {
  id: string
  planId: string
  catalogVersion: string
  issuedAt: string
  reviewedAt: string
  beforeRevision: number
  afterRevision: number
  changes: readonly PlanChange[]
  finalState: ProcessingState
  verified: true
  verification: {
    observedRevision: number
    method: 'persisted_state_readback'
  }
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
