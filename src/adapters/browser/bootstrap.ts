import { createPrivacyController, createPrivacyViewCoordinator } from '@/application'
import { LocalStoragePrivacyRepository } from '@/adapters/storage/local-storage-privacy-repository'
import { LocalDemoEnforcementAdapter } from '@/adapters/enforcement/local-demo-enforcement-adapter'
import { startWebMcpAdapter } from '@/adapters/webmcp/webmcp-adapter'
import { travelCatalog } from '@/demo/travel-catalog'
import { createTravelSeed } from '@/demo/travel-seed'

export async function bootstrapBrowserApp() {
  const privacyUi = createPrivacyViewCoordinator()
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
  const webMcp = await startWebMcpAdapter(document.modelContext, controller, travelCatalog, privacyUi)

  return {
    controller,
    privacyUi,
    webMcpAvailable: webMcp.available,
    dispose: () => webMcp.dispose(),
  }
}
