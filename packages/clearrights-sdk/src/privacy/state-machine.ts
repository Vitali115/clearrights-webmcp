import type { WorkflowEvent, WorkflowStatus } from './model'
import { DomainError } from './model'

export function transitionWorkflow(
  status: WorkflowStatus,
  event: WorkflowEvent,
): WorkflowStatus {
  if (event === 'reset') return 'idle'
  if (event === 'stage') return 'staged'
  if (event === 'review' && status === 'staged') return 'reviewed'
  if (event === 'revoke_review' && status === 'reviewed') return 'staged'
  if (event === 'apply' && status === 'reviewed') return 'applied'

  throw new DomainError(
    'invalid_workflow_transition',
    `Cannot ${event} while the workflow is ${status}.`,
  )
}
