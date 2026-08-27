import type {
  CapabilityDefinition,
  CapabilityId,
  PrivacySectionDefinition,
  PrivacySectionId,
  ProcessingDefinition,
  ProcessingId,
  UseDefinition,
  UseId,
} from './model'
import { DomainError } from './model'

export interface ProcessingCatalog {
  version: string
  noticeVersion: string
  sections: readonly PrivacySectionDefinition[]
  processing: readonly ProcessingDefinition[]
  capabilities: readonly CapabilityDefinition[]
  uses: readonly UseDefinition[]
  getSection(id: PrivacySectionId): PrivacySectionDefinition
  getProcessing(id: ProcessingId): ProcessingDefinition
  getCapability(id: CapabilityId): CapabilityDefinition
  getUse(id: UseId): UseDefinition
}

export interface ProcessingCatalogInput {
  version: string
  noticeVersion: string
  sections: readonly PrivacySectionDefinition[]
  processing: readonly ProcessingDefinition[]
  capabilities: readonly CapabilityDefinition[]
  uses: readonly UseDefinition[]
}

export function definePrivacyCatalog(input: ProcessingCatalogInput): ProcessingCatalog {
  const { version, noticeVersion, sections, processing, capabilities, uses } = input
  assertNonEmpty(version, 'Catalog version')
  assertNonEmpty(noticeVersion, 'Notice version')
  assertUnique(sections.map(({ id }) => id), 'section')
  assertUnique(processing.map(({ id }) => id), 'processing')
  assertUnique(capabilities.map(({ id }) => id), 'capability')
  assertUnique(uses.map(({ id }) => id), 'use')

  const sectionById = new Map(sections.map((item) => [item.id, item]))
  const processingById = new Map(processing.map((item) => [item.id, item]))
  const capabilityById = new Map(capabilities.map((item) => [item.id, item]))
  const useById = new Map(uses.map((item) => [item.id, item]))

  for (const item of processing) {
    if (!sectionById.has(item.sectionId)) {
      throw new DomainError('invalid_catalog', `${item.id} has unknown section ${item.sectionId}.`)
    }
    if (item.group === 'required' && !item.locked) {
      throw new DomainError('invalid_catalog', `${item.id} must be locked because it is required.`)
    }
    if (item.group === 'optional' && item.locked) {
      throw new DomainError('invalid_catalog', `${item.id} cannot be locked because it is optional.`)
    }
    if (item.locked && !item.defaultEnabled) {
      throw new DomainError('invalid_catalog', `${item.id} must default to enabled because it is locked.`)
    }
    if (item.capabilities.length === 0 || item.uses.length === 0) {
      throw new DomainError('invalid_catalog', `${item.id} must declare at least one capability and use.`)
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

  for (const capability of capabilities) {
    const providers = processing.filter((item) => item.capabilities.includes(capability.id))
    if (providers.length !== 1) {
      throw new DomainError(
        'invalid_catalog',
        `${capability.id} must have exactly one processing provider in this SDK version.`,
      )
    }
  }

  assertAcyclic(processing, processingById)

  return {
    version,
    noticeVersion,
    sections,
    processing,
    capabilities,
    uses,
    getSection(id) {
      const result = sectionById.get(id)
      if (!result) throw new DomainError('unknown_section', `Unknown section: ${id}`)
      return result
    },
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

/** @deprecated Use definePrivacyCatalog with sections and noticeVersion. */
export function createProcessingCatalog(
  version: string,
  processing: readonly ProcessingDefinition[],
  capabilities: readonly CapabilityDefinition[],
  uses: readonly UseDefinition[],
  sections: readonly PrivacySectionDefinition[] = inferSections(processing),
  noticeVersion = version,
) {
  return definePrivacyCatalog({ version, noticeVersion, sections, processing, capabilities, uses })
}

function inferSections(processing: readonly ProcessingDefinition[]): PrivacySectionDefinition[] {
  return [...new Set(processing.map(({ sectionId }) => sectionId))].map((id) => ({
    id,
    label: id,
    description: '',
  }))
}

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) throw new DomainError('invalid_catalog', `${label} cannot be empty.`)
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
