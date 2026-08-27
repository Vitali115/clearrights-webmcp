import {
  createPrivacyPlan,
  type PlannerInput,
  type PrivacyPlan,
  type PrivacyReceipt,
  type ProcessingCatalog,
  type ProcessingDefinition,
  type ProcessingId,
  transitionWorkflow,
  type WorkflowStatus,
} from '@/domain'
import type { PrivacyRecord, PrivacyRepository } from './privacy-repository'

export interface Clock {
  now(): string
}

export interface IdGenerator {
  next(): string
}

export interface PrivacyControllerSnapshot {
  workflow: WorkflowStatus
  record: PrivacyRecord
  plan: PrivacyPlan | null
  reviewedAt: string | null
}

export interface ProcessingInspection {
  definition: ProcessingDefinition
  enabled: boolean
}

export interface PrivacyController {
  getSnapshot(): PrivacyControllerSnapshot
  subscribe(listener: (snapshot: PrivacyControllerSnapshot) => void): () => void
  inspect(processingId: ProcessingId): ProcessingInspection
  stage(input: PlannerInput): PrivacyPlan
  setReviewed(reviewed: boolean): void
  apply(planId: string): Promise<PrivacyReceipt>
  getReceipt(): PrivacyReceipt | null
  resetDemo(confirmed: boolean): Promise<void>
}

export class ApplicationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
  }
}

interface ControllerDependencies {
  catalog: ProcessingCatalog
  repository: PrivacyRepository
  clock: Clock
  idGenerator: IdGenerator
}

export async function createPrivacyController({
  catalog,
  repository,
  clock,
  idGenerator,
}: ControllerDependencies): Promise<PrivacyController> {
  let snapshot: PrivacyControllerSnapshot = {
    workflow: 'idle',
    record: await repository.load(),
    plan: null,
    reviewedAt: null,
  }
  const listeners = new Set<(next: PrivacyControllerSnapshot) => void>()

  const publish = (next: PrivacyControllerSnapshot) => {
    snapshot = clone(next)
    const publicSnapshot = clone(snapshot)
    for (const listener of listeners) listener(publicSnapshot)
  }

  const controller: PrivacyController = {
    getSnapshot: () => clone(snapshot),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    inspect(processingId) {
      return clone({
        definition: catalog.getProcessing(processingId),
        enabled: snapshot.record.state.processing[processingId],
      })
    },
    stage(input) {
      const plan = createPrivacyPlan(catalog, snapshot.record.state, input)
      publish({
        ...snapshot,
        workflow: transitionWorkflow(snapshot.workflow, 'stage'),
        plan,
        reviewedAt: null,
      })
      return clone(plan)
    },
    setReviewed(reviewed) {
      if (!reviewed && snapshot.workflow === 'staged') return
      const event = reviewed ? 'review' : 'revoke_review'
      publish({
        ...snapshot,
        workflow: transitionWorkflow(snapshot.workflow, event),
        reviewedAt: reviewed ? clock.now() : null,
      })
    },
    async apply(planId) {
      if (snapshot.workflow !== 'reviewed' || !snapshot.plan || !snapshot.reviewedAt) {
        throw new ApplicationError('review_required', 'The staged plan must be reviewed by a person before apply.')
      }
      if (snapshot.plan.id !== planId) {
        throw new ApplicationError('plan_mismatch', 'The supplied plan ID is not the reviewed plan.')
      }

      const reviewedPlan = clone(snapshot.plan)
      const reviewedAt = snapshot.reviewedAt

      const persisted = await repository.load()
      if (persisted.state.revision !== reviewedPlan.baseRevision) {
        throw new ApplicationError('stale_plan', 'Privacy state changed after this plan was staged.')
      }

      const checkedPlan = createPrivacyPlan(catalog, persisted.state, reviewedPlan.input)
      if (checkedPlan.id !== reviewedPlan.id || !sameState(checkedPlan.target, reviewedPlan.target)) {
        throw new ApplicationError('plan_changed', 'The reviewed plan no longer matches its recalculated result.')
      }
      if (
        snapshot.workflow !== 'reviewed'
        || snapshot.plan?.id !== reviewedPlan.id
        || snapshot.reviewedAt !== reviewedAt
      ) {
        throw new ApplicationError('review_revoked', 'Human review was revoked before the plan could be committed.')
      }

      const afterRevision = persisted.state.revision + 1
      const receipt: PrivacyReceipt = {
        id: idGenerator.next(),
        planId: checkedPlan.id,
        catalogVersion: catalog.version,
        issuedAt: clock.now(),
        reviewedAt,
        beforeRevision: persisted.state.revision,
        afterRevision,
        changes: checkedPlan.changes,
        finalState: clone(checkedPlan.target),
        verified: true,
        verification: {
          observedRevision: afterRevision,
          method: 'persisted_state_readback',
        },
      }
      const nextRecord: PrivacyRecord = {
        schemaVersion: 1,
        state: {
          revision: afterRevision,
          processing: clone(checkedPlan.target),
        },
        latestReceipt: receipt,
      }

      // A receipt is exposed as verified only after this exact aggregate is read back.
      await repository.commit(persisted.state.revision, nextRecord)
      const observed = await repository.load()
      if (
        observed.state.revision !== afterRevision
        || !sameState(observed.state.processing, checkedPlan.target)
        || observed.latestReceipt?.id !== receipt.id
      ) {
        throw new ApplicationError('verification_failed', 'The persisted state did not match the reviewed plan.')
      }

      publish({
        workflow: transitionWorkflow(snapshot.workflow, 'apply'),
        record: observed,
        plan: checkedPlan,
        reviewedAt,
      })
      return clone(receipt)
    },
    getReceipt() {
      return clone(snapshot.record.latestReceipt)
    },
    async resetDemo(confirmed) {
      if (!confirmed) {
        throw new ApplicationError('reset_confirmation_required', 'Reset demo data requires explicit human confirmation.')
      }
      const persisted = await repository.load()
      const resetRecord = await repository.reset(persisted.state.revision)
      publish({
        workflow: transitionWorkflow(snapshot.workflow, 'reset'),
        record: resetRecord,
        plan: null,
        reviewedAt: null,
      })
    },
  }

  return controller
}

function sameState(
  left: Record<ProcessingId, boolean>,
  right: Record<ProcessingId, boolean>,
) {
  return Object.keys(left).every((id) => left[id as ProcessingId] === right[id as ProcessingId])
}

function clone<T>(value: T): T {
  if (value === null || value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}
