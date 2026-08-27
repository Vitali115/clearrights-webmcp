import {
  createPrivacyRuntime,
  type PrivacyController,
  type PrivacyRecord,
  type ProcessingState,
} from '@clearrights/sdk/privacy'
import {
  createAccessibilityRuntime,
  createDefaultAccessibilityState,
  type AccessibilityRuntime,
  type AccessibilityState,
} from '@clearrights/sdk/accessibility'
import { createSiteGuideRuntime, type SiteGuideRuntime } from '@clearrights/sdk/site-guide'
import {
  minimalAccessibilityCatalog,
  minimalPrivacyCatalog,
  minimalSiteGuideCatalog,
} from './catalogs'
import {
  MemoryAccessibilityAdapter,
  MemoryAccessibilityRepository,
  MemoryNavigationAdapter,
  MemoryPrivacyAdapter,
  MemoryPrivacyRepository,
} from './memory-adapters'

export interface MinimalExperience {
  feed: 'generic' | 'personalised'
  textScale: AccessibilityState['textScale']
  readingLayout: AccessibilityState['readingLayout']
}

export interface MinimalHost {
  privacy: PrivacyController
  accessibility: AccessibilityRuntime
  siteGuide: SiteGuideRuntime
  selectExperience(): MinimalExperience
  subscribe(listener: (experience: MinimalExperience) => void): () => void
}

export async function createMinimalHost(): Promise<MinimalHost> {
  const privacyState = Object.fromEntries(
    minimalPrivacyCatalog.processing.map(({ id, control }) => [id, control.defaultEnabled]),
  ) as ProcessingState
  const privacyRecord: PrivacyRecord = {
    schemaVersion: 4,
    state: { revision: 1, processing: privacyState },
    notice: {
      status: 'pending',
      currentVersion: minimalPrivacyCatalog.noticeVersion,
      recordedVersion: null,
      recordedAt: null,
      method: null,
    },
    receipts: [],
  }
  const accessibilityState = createDefaultAccessibilityState()
  let nextId = 0
  const idGenerator = { next: () => `minimal-${++nextId}` }

  const privacy = await createPrivacyRuntime({
    catalog: minimalPrivacyCatalog,
    repository: new MemoryPrivacyRepository(privacyRecord),
    enforcement: new MemoryPrivacyAdapter(privacyState),
    clock: { now: () => new Date(0).toISOString() },
    idGenerator,
  })
  const accessibility = await createAccessibilityRuntime({
    catalog: minimalAccessibilityCatalog,
    repository: new MemoryAccessibilityRepository({
      schemaVersion: 1,
      revision: 1,
      current: accessibilityState,
      previous: null,
    }),
    enforcement: new MemoryAccessibilityAdapter(accessibilityState),
    idGenerator,
  })
  const siteGuide = createSiteGuideRuntime({
    catalog: minimalSiteGuideCatalog,
    navigator: new MemoryNavigationAdapter(),
  })

  const selectExperience = (): MinimalExperience => ({
    feed: privacy.getSnapshot().record.state.processing.recommendations ? 'personalised' : 'generic',
    textScale: accessibility.getSnapshot().current.textScale,
    readingLayout: accessibility.getSnapshot().current.readingLayout,
  })

  return {
    privacy,
    accessibility,
    siteGuide,
    selectExperience,
    subscribe(listener) {
      const publish = () => listener(selectExperience())
      const unsubscribePrivacy = privacy.subscribe(publish)
      const unsubscribeAccessibility = accessibility.subscribe(publish)
      publish()
      return () => {
        unsubscribePrivacy()
        unsubscribeAccessibility()
      }
    },
  }
}
