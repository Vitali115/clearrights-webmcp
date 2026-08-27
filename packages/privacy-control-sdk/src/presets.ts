import type { ProcessingCatalog } from './catalog'
import type { PlannerInput } from './model'

export type PrivacyPreset = 'accept_all' | 'essential_only'

export function createPresetInput(
  catalog: ProcessingCatalog,
  preset: PrivacyPreset,
): PlannerInput {
  if (preset === 'accept_all') {
    return {
      keepCapabilities: catalog.capabilities.map(({ id }) => id),
      avoidUses: [],
    }
  }

  const required = catalog.processing.filter(({ locked }) => locked)
  const optional = catalog.processing.filter(({ locked }) => !locked)
  return {
    keepCapabilities: [...new Set(required.flatMap(({ capabilities }) => capabilities))],
    avoidUses: [...new Set(optional.flatMap(({ uses }) => uses))],
  }
}
