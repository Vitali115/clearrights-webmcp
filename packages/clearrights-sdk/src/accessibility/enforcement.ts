import type { AccessibilityState, AccessibilityVerificationScope } from './model'

export interface AccessibilityEnforcementAdapter {
  readonly id: string
  readonly scope: AccessibilityVerificationScope
  readCurrentState(): Promise<AccessibilityState>
  apply(command: { operationId: string; target: AccessibilityState }): Promise<void>
}
