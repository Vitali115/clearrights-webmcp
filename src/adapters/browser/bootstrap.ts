import {
  createActivityCoordinator,
  createPersonalControlsCoordinator,
  createPrivacyController,
  createPrivacyViewCoordinator,
} from '@/application'
import { createAccessibilityRuntime, createSiteGuideRuntime } from '@/domain'
import { LocalStorageAccessibilityRepository } from '@/adapters/accessibility/local-storage-accessibility-repository'
import {
  readSystemAccessibilityPreferences,
  WaypointDomAccessibilityAdapter,
} from '@/adapters/accessibility/waypoint-dom-accessibility-adapter'
import { WaypointNavigationAdapter } from '@/adapters/navigation/waypoint-navigation-adapter'
import { LocalStoragePrivacyRepository } from '@/adapters/storage/local-storage-privacy-repository'
import { LocalDemoEnforcementAdapter } from '@/adapters/enforcement/local-demo-enforcement-adapter'
import { startWebMcpAdapter } from '@/adapters/webmcp/webmcp-adapter'
import { travelCatalog } from '@/demo/travel-catalog'
import { createTravelSeed } from '@/demo/travel-seed'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'
import { waypointSiteGuideCatalog } from '@/demo/waypoint/site-guide-catalog'

export async function bootstrapBrowserApp() {
  const privacyUi = createPrivacyViewCoordinator()
  const controlsUi = createPersonalControlsCoordinator()
  const activity = createActivityCoordinator({
    storage: window.sessionStorage,
    clock: { now: () => new Date().toISOString() },
    idGenerator: { next: () => `activity-${globalThis.crypto.randomUUID()}` },
  })
  const repository = new LocalStoragePrivacyRepository(window.localStorage, createTravelSeed)
  const enforcement = new LocalDemoEnforcementAdapter(window.localStorage, createTravelSeed)
  const initialRecord = await repository.load()
  await enforcement.synchronize(initialRecord.state.processing, initialRecord.state.revision)
  const controller = await createPrivacyController({
    catalog: travelCatalog,
    repository,
    enforcement,
    clock: { now: () => new Date().toISOString() },
    idGenerator: {
      next: () => `receipt-${globalThis.crypto.randomUUID()}`,
    },
  })
  const accessibilityRepository = new LocalStorageAccessibilityRepository(window.localStorage)
  const accessibilityEnforcement = new WaypointDomAccessibilityAdapter(document.documentElement)
  const accessibilityRecord = await accessibilityRepository.load()
  await accessibilityEnforcement.apply({
    operationId: `bootstrap-accessibility-${accessibilityRecord.revision}`,
    target: accessibilityRecord.current,
  })
  const accessibility = await createAccessibilityRuntime({
    catalog: waypointAccessibilityCatalog,
    repository: accessibilityRepository,
    enforcement: accessibilityEnforcement,
    idGenerator: { next: () => `accessibility-${globalThis.crypto.randomUUID()}` },
  })
  const siteGuide = createSiteGuideRuntime({
    catalog: waypointSiteGuideCatalog,
    navigator: new WaypointNavigationAdapter({
      openRoute(path, hash, context) {
        window.history.pushState(null, '', `${path}${hash ?? ''}`)
        controlsUi.reportRoute({
          origin: context.origin,
          targetId: context.destinationId,
          message: context.origin === 'agent' ? `The agent opened ${context.label}.` : undefined,
        })
        window.dispatchEvent(new PopStateEvent('popstate'))
      },
      openPanel(section, context) {
        controlsUi.openPanel(section, {
          origin: context.origin,
          targetId: context.destinationId,
          message: context.origin === 'agent' ? `The agent opened ${context.label}.` : undefined,
        })
      },
      getLocation: () => `${window.location.pathname}${window.location.hash}`,
    }),
  })
  const webMcp = await startWebMcpAdapter(document.modelContext, {
    privacyController: controller,
    privacyCatalog: travelCatalog,
    privacyUi,
    controlsUi,
    accessibilityRuntime: accessibility,
    accessibilityCatalog: waypointAccessibilityCatalog,
    readSystemPreferences: () => readSystemAccessibilityPreferences(window),
    siteGuideRuntime: siteGuide,
    siteGuideCatalog: waypointSiteGuideCatalog,
    activity,
  })

  return {
    controller,
    privacyUi,
    controlsUi,
    accessibility,
    siteGuide,
    activity,
    webMcpAvailable: webMcp.available,
    dispose: () => webMcp.dispose(),
  }
}
