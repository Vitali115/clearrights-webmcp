import type { ProcessingCatalog } from './catalog'
import type { PrivacyEnforcementAdapter } from './enforcement'
import {
  createPrivacyPlan,
} from './planner'
import { createPresetInput, type PrivacyPreset } from './presets'
import {
  type PlannerInput,
  type PrivacyApprovalMethod,
  type PrivacyChoiceMethod,
  type PrivacyPlan,
  type PrivacyPreparationOrigin,
  type PrivacyReceipt,
  type ProcessingDefinition,
  type ProcessingId,
  type ProcessingState,
  type WorkflowStatus,
} from './model'
import {
  PRIVACY_RECEIPT_HISTORY_LIMIT,
  type PrivacyRecord,
  type PrivacyRepository,
} from './repository'
import { transitionWorkflow } from './state-machine'

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
  approvalMethod: PrivacyApprovalMethod | null
  preparationOrigin: PrivacyPreparationOrigin | null
}

export interface ProcessingInspection {
  definition: ProcessingDefinition
  enabled: boolean
}

export interface PrivacyController {
  getSnapshot(): PrivacyControllerSnapshot
  subscribe(listener: (snapshot: PrivacyControllerSnapshot) => void): () => void
  inspect(processingId: ProcessingId): ProcessingInspection
  stage(input: PlannerInput, origin?: PrivacyPreparationOrigin): PrivacyPlan
  setReviewed(reviewed: boolean, method?: PrivacyApprovalMethod): void
  apply(planId: string): Promise<PrivacyReceipt>
  applyInitialChoice(preset: PrivacyPreset): Promise<PrivacyReceipt>
  getReceipt(): PrivacyReceipt | null
  getReceiptHistory(): PrivacyReceipt[]
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

export interface PrivacyRuntimeDependencies {
  catalog: ProcessingCatalog
  repository: PrivacyRepository
  enforcement: PrivacyEnforcementAdapter
  clock: Clock
  idGenerator: IdGenerator
}

export async function createPrivacyRuntime({
  catalog,
  repository,
  enforcement,
  clock,
  idGenerator,
}: PrivacyRuntimeDependencies): Promise<PrivacyController> {
  const initialRecord = await repository.load()
  const initialEnforcedState = await enforcement.readCurrentState()
  if (!sameState(catalog, initialEnforcedState, initialRecord.state.processing)) {
    throw new ApplicationError(
      'enforcement_drift',
      `The ${enforcement.id} adapter state does not match the stored privacy decision.`,
    )
  }
  let snapshot: PrivacyControllerSnapshot = {
    workflow: 'idle',
    record: initialRecord,
    plan: null,
    reviewedAt: null,
    approvalMethod: null,
    preparationOrigin: null,
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
    stage(input, origin = 'page_ui') {
      const plan = createPrivacyPlan(catalog, snapshot.record.state, input)
      publish({
        ...snapshot,
        workflow: transitionWorkflow(snapshot.workflow, 'stage'),
        plan,
        reviewedAt: null,
        approvalMethod: null,
        preparationOrigin: origin,
      })
      return clone(plan)
    },
    setReviewed(reviewed, method = 'review_hold') {
      if (!reviewed && snapshot.workflow === 'staged') return
      if (reviewed && snapshot.plan?.isNoOp) {
        throw new ApplicationError('no_changes', 'A plan with no preference changes cannot be reviewed or applied.')
      }
      const event = reviewed ? 'review' : 'revoke_review'
      publish({
        ...snapshot,
        workflow: transitionWorkflow(snapshot.workflow, event),
        reviewedAt: reviewed ? clock.now() : null,
        approvalMethod: reviewed ? method : null,
      })
    },
    async apply(planId) {
      if (
        snapshot.workflow !== 'reviewed'
        || !snapshot.plan
        || !snapshot.reviewedAt
        || !snapshot.approvalMethod
        || !snapshot.preparationOrigin
      ) {
        throw new ApplicationError('review_required', 'The staged plan must be reviewed by a person before apply.')
      }
      if (snapshot.plan.id !== planId) {
        throw new ApplicationError('plan_mismatch', 'The supplied plan ID is not the reviewed plan.')
      }
      if (snapshot.plan.isNoOp) {
        throw new ApplicationError('no_changes', 'A plan with no preference changes cannot be applied.')
      }

      const reviewedPlan = clone(snapshot.plan)
      const reviewedAt = snapshot.reviewedAt
      const approvalMethod = snapshot.approvalMethod
      const preparationOrigin = snapshot.preparationOrigin
      const persisted = await repository.load()
      if (persisted.state.revision !== reviewedPlan.baseRevision) {
        throw new ApplicationError('stale_plan', 'Privacy state changed after this plan was staged.')
      }

      const checkedPlan = createPrivacyPlan(catalog, persisted.state, reviewedPlan.input)
      if (checkedPlan.id !== reviewedPlan.id || !sameState(catalog, checkedPlan.target, reviewedPlan.target)) {
        throw new ApplicationError('plan_changed', 'The reviewed plan no longer matches its recalculated result.')
      }
      if (
        snapshot.workflow !== 'reviewed'
        || snapshot.plan?.id !== reviewedPlan.id
        || snapshot.reviewedAt !== reviewedAt
        || snapshot.approvalMethod !== approvalMethod
      ) {
        throw new ApplicationError('review_revoked', 'Human review was revoked before the plan could be committed.')
      }

      const receiptId = idGenerator.next()
      await applyAndVerify(enforcement, catalog, {
        operationId: receiptId,
        planId: checkedPlan.id,
        expectedRevision: persisted.state.revision,
        target: checkedPlan.target,
        changes: checkedPlan.changes,
      })

      const afterRevision = persisted.state.revision + 1
      const issuedAt = clock.now()
      const receipt: PrivacyReceipt = {
        id: receiptId,
        kind: 'settings_change',
        planId: checkedPlan.id,
        catalogVersion: catalog.version,
        noticeVersion: catalog.noticeVersion,
        issuedAt,
        reviewedAt,
        approvalMethod,
        preparationOrigin,
        choiceMethod: persisted.notice.status === 'pending' ? 'managed_settings' : null,
        beforeRevision: persisted.state.revision,
        afterRevision,
        changes: checkedPlan.changes,
        finalState: clone(checkedPlan.target),
        verified: true,
        verification: {
          observedRevision: afterRevision,
          method: 'adapter_readback',
          adapterId: enforcement.id,
          scope: enforcement.scope,
        },
      }
      const nextRecord: PrivacyRecord = {
        schemaVersion: 3,
        state: {
          revision: afterRevision,
          processing: clone(checkedPlan.target),
        },
        notice: persisted.notice.status === 'pending'
          ? recordedNotice(catalog.noticeVersion, issuedAt, 'managed_settings')
          : persisted.notice,
        receipts: [receipt, ...persisted.receipts].slice(0, PRIVACY_RECEIPT_HISTORY_LIMIT),
      }

      await repository.commit(persisted.state.revision, nextRecord)
      const observed = await repository.load()
      if (
        observed.state.revision !== afterRevision
        || !sameState(catalog, observed.state.processing, checkedPlan.target)
        || observed.receipts[0]?.id !== receipt.id
      ) {
        throw new ApplicationError('verification_failed', 'The persisted decision record did not match the enforced plan.')
      }

      publish({
        workflow: transitionWorkflow(snapshot.workflow, 'apply'),
        record: observed,
        plan: checkedPlan,
        reviewedAt,
        approvalMethod,
        preparationOrigin,
      })
      return clone(receipt)
    },
    async applyInitialChoice(preset) {
      const persisted = await repository.load()
      const plan = createPrivacyPlan(catalog, persisted.state, createPresetInput(catalog, preset))
      const reviewedAt = clock.now()
      const issuedAt = clock.now()
      const afterRevision = persisted.state.revision + 1
      const choiceMethod: PrivacyChoiceMethod = preset
      const receiptId = idGenerator.next()

      await applyAndVerify(enforcement, catalog, {
        operationId: receiptId,
        planId: plan.id,
        expectedRevision: persisted.state.revision,
        target: plan.target,
        changes: plan.changes,
      })

      const receipt: PrivacyReceipt = {
        id: receiptId,
        kind: 'initial_choice',
        planId: plan.id,
        catalogVersion: catalog.version,
        noticeVersion: catalog.noticeVersion,
        issuedAt,
        reviewedAt,
        approvalMethod: 'banner_button',
        preparationOrigin: 'page_ui',
        choiceMethod,
        beforeRevision: persisted.state.revision,
        afterRevision,
        changes: plan.changes,
        finalState: clone(plan.target),
        verified: true,
        verification: {
          observedRevision: afterRevision,
          method: 'adapter_readback',
          adapterId: enforcement.id,
          scope: enforcement.scope,
        },
      }
      const nextRecord: PrivacyRecord = {
        schemaVersion: 3,
        state: {
          revision: afterRevision,
          processing: clone(plan.target),
        },
        notice: recordedNotice(catalog.noticeVersion, issuedAt, choiceMethod),
        receipts: [receipt, ...persisted.receipts].slice(0, PRIVACY_RECEIPT_HISTORY_LIMIT),
      }

      await repository.commit(persisted.state.revision, nextRecord)
      const observed = await repository.load()
      if (
        observed.state.revision !== afterRevision
        || !sameState(catalog, observed.state.processing, plan.target)
        || observed.notice.status !== 'recorded'
        || observed.receipts[0]?.id !== receipt.id
      ) {
        throw new ApplicationError('verification_failed', 'The stored initial choice did not match the enforced preset.')
      }

      publish({
        workflow: 'applied',
        record: observed,
        plan,
        reviewedAt,
        approvalMethod: 'banner_button',
        preparationOrigin: 'page_ui',
      })
      return clone(receipt)
    },
    getReceipt() {
      return clone(snapshot.record.receipts[0] ?? null)
    },
    getReceiptHistory() {
      return clone(snapshot.record.receipts)
    },
    async resetDemo(confirmed) {
      if (!confirmed) {
        throw new ApplicationError('reset_confirmation_required', 'Reset demo data requires explicit human confirmation.')
      }
      const persisted = await repository.load()
      const resetRecord = await repository.reset(persisted.state.revision)
      await applyAndVerify(enforcement, catalog, {
        operationId: `reset-${resetRecord.state.revision}`,
        planId: `reset-${resetRecord.state.revision}`,
        expectedRevision: persisted.state.revision,
        target: resetRecord.state.processing,
        changes: catalog.processing.flatMap((definition) => {
          const before = persisted.state.processing[definition.id]
          const after = resetRecord.state.processing[definition.id]
          return before === after ? [] : [{
            processingId: definition.id,
            label: definition.label,
            before,
            after,
            reason: 'Restored by demo reset.',
          }]
        }),
      })
      publish({
        workflow: transitionWorkflow(snapshot.workflow, 'reset'),
        record: resetRecord,
        plan: null,
        reviewedAt: null,
        approvalMethod: null,
        preparationOrigin: null,
      })
    },
  }

  return controller
}

export const createPrivacyController = createPrivacyRuntime

async function applyAndVerify(
  enforcement: PrivacyEnforcementAdapter,
  catalog: ProcessingCatalog,
  command: Parameters<PrivacyEnforcementAdapter['apply']>[0],
) {
  await enforcement.apply(clone(command))
  const observed = await enforcement.readCurrentState()
  if (!sameState(catalog, observed, command.target)) {
    throw new ApplicationError(
      'enforcement_verification_failed',
      `The ${enforcement.id} adapter readback did not match the reviewed target.`,
    )
  }
}

function recordedNotice(
  version: string,
  recordedAt: string,
  method: PrivacyChoiceMethod,
) {
  return {
    version,
    status: 'recorded' as const,
    recordedAt,
    method,
  }
}

function sameState(
  catalog: ProcessingCatalog,
  left: ProcessingState,
  right: ProcessingState,
) {
  return catalog.processing.every(({ id }) => left[id] === right[id])
}

function clone<T>(value: T): T {
  if (value === null || value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}
