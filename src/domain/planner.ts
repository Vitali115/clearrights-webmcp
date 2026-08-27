import type { ProcessingCatalog } from './processing-catalog'
import type {
  CapabilityId,
  PlannerInput,
  PrivacyPlan,
  ProcessingId,
  ProcessingState,
  UserPrivacyState,
  UseId,
} from './model'
import { DomainError } from './model'

export function createPrivacyPlan(
  catalog: ProcessingCatalog,
  state: UserPrivacyState,
  input: PlannerInput,
): PrivacyPlan {
  validateInput(catalog, input)

  const normalizedInput: PlannerInput = {
    keepCapabilities: catalog.capabilities
      .map(({ id }) => id)
      .filter((id) => input.keepCapabilities.includes(id)),
    avoidUses: catalog.uses
      .map(({ id }) => id)
      .filter((id) => input.avoidUses.includes(id)),
  }
  const requestedCapabilities = new Set(normalizedInput.keepCapabilities)
  const avoidedUses = new Set(normalizedInput.avoidUses)
  const target = Object.fromEntries(
    catalog.processing.map((item) => [item.id, item.locked]),
  ) as ProcessingState
  const capabilityClosures = new Map<CapabilityId, Set<ProcessingId>>()

  for (const capabilityId of normalizedInput.keepCapabilities) {
    const providers = catalog.processing.filter((item) => item.capabilities.includes(capabilityId))
    if (providers.length === 0) {
      throw new DomainError('unsupported_capability', `No processing provides ${capabilityId}.`)
    }

    const closure = new Set<ProcessingId>()
    for (const provider of providers) enableWithDependencies(catalog, provider.id, target, closure)
    capabilityClosures.set(capabilityId, closure)
  }

  const conflicts = normalizedInput.keepCapabilities.flatMap((capabilityId) => {
    const closure = capabilityClosures.get(capabilityId) ?? new Set<ProcessingId>()
    return catalog.processing.flatMap((item) =>
      !item.locked && closure.has(item.id)
        ? item.uses
            .filter((useId) => avoidedUses.has(useId))
            .map((useId) => ({
              processingId: item.id,
              capabilityId,
              useId,
              message: `${catalog.getCapability(capabilityId).label} needs ${catalog.getUse(useId).label.toLowerCase()}. The capability is kept.`,
            }))
        : [],
    )
  })

  const blockedItems = catalog.processing.flatMap((item) =>
    item.locked
      ? item.uses
          .filter((useId) => avoidedUses.has(useId))
          .map((useId) => ({
            processingId: item.id,
            useId,
            message: `${catalog.getUse(useId).label} cannot be avoided because ${item.label} is required and locked.`,
          }))
      : [],
  )

  const changes = catalog.processing.flatMap((item) => {
    const before = state.processing[item.id]
    const after = target[item.id]
    if (before === after) return []

    return [{
      processingId: item.id,
      label: item.label,
      before,
      after,
      reason: changeReason(catalog, item.id, after, requestedCapabilities, avoidedUses),
    }]
  })

  const consequences = changes.map((change) => {
    const item = catalog.getProcessing(change.processingId)
    return change.after
      ? {
          processingId: item.id,
          kind: 'enabled' as const,
          message: `${item.label} is restored to preserve a requested capability.`,
        }
      : {
          processingId: item.id,
          kind: 'disabled' as const,
          message: item.consequence,
        }
  })

  return {
    id: createPlanId(state.revision, normalizedInput, target),
    baseRevision: state.revision,
    input: normalizedInput,
    target,
    changes,
    preservedCapabilities: [...normalizedInput.keepCapabilities],
    consequences,
    conflicts,
    blockedItems,
    isNoOp: changes.length === 0,
  }
}

function validateInput(catalog: ProcessingCatalog, input: PlannerInput) {
  assertNoDuplicates(input.keepCapabilities, 'keepCapabilities')
  assertNoDuplicates(input.avoidUses, 'avoidUses')
  if (input.keepCapabilities.length > catalog.capabilities.length) {
    throw new DomainError('invalid_planner_input', 'Too many capabilities requested.')
  }
  if (input.avoidUses.length > catalog.uses.length) {
    throw new DomainError('invalid_planner_input', 'Too many uses requested.')
  }
  for (const capability of input.keepCapabilities) catalog.getCapability(capability)
  for (const use of input.avoidUses) catalog.getUse(use)
}

function assertNoDuplicates(values: readonly string[], field: string) {
  if (new Set(values).size !== values.length) {
    throw new DomainError('invalid_planner_input', `${field} cannot contain duplicates.`)
  }
}

function enableWithDependencies(
  catalog: ProcessingCatalog,
  id: ProcessingId,
  target: ProcessingState,
  closure: Set<ProcessingId>,
) {
  if (closure.has(id)) return
  closure.add(id)
  target[id] = true
  for (const dependency of catalog.getProcessing(id).dependencies) {
    enableWithDependencies(catalog, dependency, target, closure)
  }
}

function changeReason(
  catalog: ProcessingCatalog,
  processingId: ProcessingId,
  enabled: boolean,
  requestedCapabilities: ReadonlySet<CapabilityId>,
  avoidedUses: ReadonlySet<UseId>,
) {
  const item = catalog.getProcessing(processingId)
  if (enabled) {
    const capability = item.capabilities.find((id) => requestedCapabilities.has(id))
    return capability
      ? `Needed to keep ${catalog.getCapability(capability).label.toLowerCase()}.`
      : 'Needed by another selected capability.'
  }

  const avoidedUse = item.uses.find((id) => avoidedUses.has(id))
  return avoidedUse
    ? `Avoids ${catalog.getUse(avoidedUse).label.toLowerCase()}.`
    : 'Not needed by the selected capabilities.'
}

function createPlanId(
  revision: number,
  input: PlannerInput,
  target: ProcessingState,
) {
  const signature = JSON.stringify({ revision, input, target })
  let hash = 2166136261
  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `plan-${revision}-${(hash >>> 0).toString(36)}`
}
