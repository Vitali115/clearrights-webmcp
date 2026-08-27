export type ProcessingId = string
export type CapabilityId = string
export type UseId = string
export type PrivacySectionId = string

export type ControlMode = 'required' | 'opt_in' | 'opt_out'

export interface ProcessingControl {
  mode: ControlMode
  mutable: boolean
  defaultEnabled: boolean
}

export interface ProcessingDescription {
  summary: string
  details: string
}

export interface ProcessingConsequences {
  whenEnabled: string
  whenDisabled: string
}

export interface ContextReference {
  label: string
  citation?: string
  url?: string
}

export interface PolicyContext {
  id: string
  label: string
  rationale: string
  legalBasis?: string
  category?: string
  userAction?: string
  references: readonly ContextReference[]
}

export interface DeveloperContext {
  factualBackground: string
  decisionFactors: readonly string[]
  limitations: readonly string[]
  references: readonly ContextReference[]
}

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
  description: ProcessingDescription
  purpose: string
  data: readonly string[]
  control: ProcessingControl
  dependencies: readonly ProcessingId[]
  consequences: ProcessingConsequences
  policyContexts: readonly PolicyContext[]
  developerContext?: DeveloperContext
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

export type DirectChoiceMethod = 'allow_all' | 'reject_optional' | 'managed'
export type PrivacyApprovalMethod = 'explicit_action' | 'review_hold'
export type PrivacyPreparationOrigin = 'page_ui' | 'webmcp_tool'
export type PrivacyVerificationScope = 'local_demo' | 'external'
export type PrivacyEntrySurface =
  | 'initial_banner'
  | 'footer_link'
  | 'account_settings'
  | 'embedded_panel'
  | 'agent_only'

export interface PrivacyNoticeState {
  status: 'pending' | 'recorded' | 'outdated'
  currentVersion: string
  recordedVersion: string | null
  recordedAt: string | null
  method: DirectChoiceMethod | null
}

export interface PrivacyReceiptPolicyContext {
  id: string
  label: string
  legalBasis?: string
  category?: string
  userAction?: string
}

export interface PrivacyReceiptDecision {
  processingId: ProcessingId
  label: string
  enabled: boolean
  choice: 'required' | 'allowed' | 'denied'
  controlMode: ControlMode
  policyContexts: readonly PrivacyReceiptPolicyContext[]
}

export interface PrivacyReceipt {
  id: string
  kind: 'initial_choice' | 'settings_change'
  planId: string
  catalogVersion: string
  noticeVersion: string
  issuedAt: string
  reviewedAt: string
  approvalMethod: PrivacyApprovalMethod
  preparationOrigin: PrivacyPreparationOrigin
  entrySurface: PrivacyEntrySurface
  choiceMethod: DirectChoiceMethod | null
  beforeRevision: number
  afterRevision: number
  beforeState: ProcessingState
  afterState: ProcessingState
  changes: readonly PlanChange[]
  decisions: readonly PrivacyReceiptDecision[]
  verified: true
  migrated?: boolean
  verification: {
    observedRevision: number
    method: 'persisted_state_readback' | 'adapter_readback'
    adapterId: string
    scope: PrivacyVerificationScope
    readback: ProcessingState
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
