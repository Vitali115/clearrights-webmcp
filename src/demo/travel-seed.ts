import type { ProcessingState, UserPrivacyState } from '@/domain'
import { travelCatalog } from './travel-catalog'

export function createTravelSeed(): UserPrivacyState {
  return {
    revision: 1,
    processing: Object.fromEntries(
      travelCatalog.processing.map((item) => [item.id, item.defaultEnabled]),
    ) as ProcessingState,
  }
}
