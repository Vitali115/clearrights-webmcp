import type { ProcessingCatalog } from './catalog'
import type { PlannerInput } from './model'

export type DirectChoicePreset = 'allow_all' | 'reject_optional'

export function createDirectChoiceInput(
  catalog: ProcessingCatalog,
  preset: DirectChoicePreset,
): PlannerInput {
  if (preset === 'allow_all') {
    return {
      keepCapabilities: catalog.capabilities.map(({ id }) => id),
      avoidUses: [],
    }
  }

  const required = catalog.processing.filter(({ control }) => control.mode === 'required')
  const optional = catalog.processing.filter(({ control }) => control.mode !== 'required')
  return {
    keepCapabilities: [...new Set(required.flatMap(({ capabilities }) => capabilities))],
    avoidUses: [...new Set(optional.flatMap(({ uses }) => uses))],
  }
}
