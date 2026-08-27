import type {
  CapabilityDefinition,
  CapabilityId,
  ProcessingDefinition,
  ProcessingId,
  UseDefinition,
  UseId,
} from './model'
import { DomainError } from './model'

export interface ProcessingCatalog {
  version: string
  processing: readonly ProcessingDefinition[]
  capabilities: readonly CapabilityDefinition[]
  uses: readonly UseDefinition[]
  getProcessing(id: ProcessingId): ProcessingDefinition
  getCapability(id: CapabilityId): CapabilityDefinition
  getUse(id: UseId): UseDefinition
}

export function createProcessingCatalog(
  version: string,
  processing: readonly ProcessingDefinition[],
  capabilities: readonly CapabilityDefinition[],
  uses: readonly UseDefinition[],
): ProcessingCatalog {
  assertUnique(processing.map(({ id }) => id), 'processing')
  assertUnique(capabilities.map(({ id }) => id), 'capability')
  assertUnique(uses.map(({ id }) => id), 'use')

  const processingById = new Map(processing.map((item) => [item.id, item]))
  const capabilityById = new Map(capabilities.map((item) => [item.id, item]))
  const useById = new Map(uses.map((item) => [item.id, item]))

  for (const item of processing) {
    if (item.group === 'required' && !item.locked) {
      throw new DomainError('invalid_catalog', `${item.id} must be locked because it is required.`)
    }
    if (item.group === 'optional' && item.locked) {
      throw new DomainError('invalid_catalog', `${item.id} cannot be locked because it is optional.`)
    }
    for (const dependency of item.dependencies) {
      if (!processingById.has(dependency)) {
        throw new DomainError('invalid_catalog', `${item.id} has unknown dependency ${dependency}.`)
      }
    }
    for (const capability of item.capabilities) {
      if (!capabilityById.has(capability)) {
        throw new DomainError('invalid_catalog', `${item.id} has unknown capability ${capability}.`)
      }
    }
    for (const use of item.uses) {
      if (!useById.has(use)) {
        throw new DomainError('invalid_catalog', `${item.id} has unknown use ${use}.`)
      }
    }
  }

  assertAcyclic(processing, processingById)

  return {
    version,
    processing,
    capabilities,
    uses,
    getProcessing(id) {
      const result = processingById.get(id)
      if (!result) throw new DomainError('unknown_processing', `Unknown processing: ${id}`)
      return result
    },
    getCapability(id) {
      const result = capabilityById.get(id)
      if (!result) throw new DomainError('unknown_capability', `Unknown capability: ${id}`)
      return result
    },
    getUse(id) {
      const result = useById.get(id)
      if (!result) throw new DomainError('unknown_use', `Unknown use: ${id}`)
      return result
    },
  }
}

function assertUnique(values: readonly string[], kind: string) {
  if (new Set(values).size !== values.length) {
    throw new DomainError('invalid_catalog', `Duplicate ${kind} identifier.`)
  }
}

function assertAcyclic(
  processing: readonly ProcessingDefinition[],
  byId: ReadonlyMap<ProcessingId, ProcessingDefinition>,
) {
  const visiting = new Set<ProcessingId>()
  const visited = new Set<ProcessingId>()

  const visit = (id: ProcessingId) => {
    if (visiting.has(id)) throw new DomainError('invalid_catalog', `Dependency cycle at ${id}.`)
    if (visited.has(id)) return

    visiting.add(id)
    for (const dependency of byId.get(id)?.dependencies ?? []) visit(dependency)
    visiting.delete(id)
    visited.add(id)
  }

  for (const item of processing) visit(item.id)
}
