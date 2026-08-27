import {
  SiteGuideError,
  type SiteDestinationDefinition,
  type SiteDestinationTarget,
} from './model'

export interface SiteGuideCatalog {
  version: string
  destinations: readonly SiteDestinationDefinition[]
  getDestination(id: string): SiteDestinationDefinition
  search(query: string): SiteDestinationDefinition[]
}

export interface SiteGuideCatalogInput {
  version: string
  destinations: readonly SiteDestinationDefinition[]
}

export function defineSiteGuideCatalog(input: SiteGuideCatalogInput): SiteGuideCatalog {
  assertText(input.version, 'Catalog version', 128)
  if (input.destinations.length === 0) throw new SiteGuideError('invalid_catalog', 'At least one site destination is required.')
  const ids = new Set<string>()
  const keywords = new Set<string>()
  const destinations = input.destinations.map((destination) => {
    if (!/^[a-z][a-z0-9_-]{1,63}$/.test(destination.id)) {
      throw new SiteGuideError('invalid_catalog', `Invalid destination ID: ${destination.id}.`)
    }
    if (ids.has(destination.id)) throw new SiteGuideError('invalid_catalog', `Duplicate destination ID: ${destination.id}.`)
    ids.add(destination.id)
    assertText(destination.label, `${destination.id} label`, 120)
    assertText(destination.summary, `${destination.id} summary`, 240)
    assertText(destination.category, `${destination.id} category`, 80)
    if (destination.keywords.length === 0) {
      throw new SiteGuideError('invalid_catalog', `${destination.id} requires at least one keyword.`)
    }
    for (const keyword of destination.keywords) {
      const normalized = keyword.trim().toLocaleLowerCase()
      if (!normalized || normalized.length > 60) {
        throw new SiteGuideError('invalid_catalog', `${destination.id} has an invalid keyword.`)
      }
      if (keywords.has(normalized)) {
        throw new SiteGuideError('invalid_catalog', `Duplicate site-guide keyword: ${normalized}.`)
      }
      keywords.add(normalized)
    }
    validateTarget(destination.target)
    return freeze(destination)
  })
  const byId = new Map(destinations.map((destination) => [destination.id, destination]))
  const catalog: SiteGuideCatalog = {
    version: input.version,
    destinations,
    getDestination(id) {
      const destination = byId.get(id)
      if (!destination) throw new SiteGuideError('unknown_destination', `Unknown site destination: ${id}.`)
      return destination
    },
    search(query) {
      const normalized = query.trim().toLocaleLowerCase()
      if (!normalized) return [...destinations]
      return destinations.filter((destination) => [
        destination.label,
        destination.summary,
        destination.category,
        ...destination.keywords,
      ].some((value) => value.toLocaleLowerCase().includes(normalized)))
    },
  }
  return Object.freeze(catalog)
}

function validateTarget(target: SiteDestinationTarget) {
  if (target.kind === 'panel') {
    if (target.panel !== 'personal_controls' || !['privacy', 'accessibility', 'activity'].includes(target.section)) {
      throw new SiteGuideError('unsafe_target', 'Panel destinations must target a supported Personal Controls section.')
    }
    return
  }
  if (
    !target.path.startsWith('/')
    || target.path.startsWith('//')
    || /[\\\r\n]/.test(target.path)
    || /%(?:0a|0d|5c)/i.test(target.path)
    || /^(?:[a-z][a-z0-9+.-]*:)/i.test(target.path)
    || /[?#]/.test(target.path)
  ) {
    throw new SiteGuideError('unsafe_target', `Unsafe same-origin route path: ${target.path}.`)
  }
  if (target.hash !== undefined && (
    !target.hash.startsWith('#')
    || /[\\\r\n]/.test(target.hash)
    || /%(?:0a|0d|5c)/i.test(target.hash)
    || /^#?(?:javascript|data):/i.test(target.hash)
  )) {
    throw new SiteGuideError('unsafe_target', `Unsafe local route hash: ${target.hash}.`)
  }
}

function assertText(value: string, label: string, max: number) {
  if (!value.trim()) throw new SiteGuideError('invalid_catalog', `${label} must not be empty.`)
  if (value.length > max) throw new SiteGuideError('invalid_catalog', `${label} exceeds ${max} characters.`)
}

function freeze<T>(value: T): T {
  return Object.freeze(JSON.parse(JSON.stringify(value))) as T
}
