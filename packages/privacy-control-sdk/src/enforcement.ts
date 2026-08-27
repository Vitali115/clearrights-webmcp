import type {
  PlanChange,
  PrivacyVerificationScope,
  ProcessingState,
} from './model'

export interface PrivacyEnforcementCommand {
  operationId: string
  planId: string
  expectedRevision: number
  target: ProcessingState
  changes: readonly PlanChange[]
}

export interface PrivacyEnforcementAdapter {
  readonly id: string
  readonly scope: PrivacyVerificationScope
  apply(command: PrivacyEnforcementCommand): Promise<void>
  readCurrentState(): Promise<ProcessingState>
}
