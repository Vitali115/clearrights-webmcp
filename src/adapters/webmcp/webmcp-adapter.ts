import type { PrivacyController } from '@/application'
import type { ProcessingCatalog } from '@/domain'
import { createToolDefinitions } from './tool-contracts'

export interface WebMcpAdapter {
  available: boolean
  whenSettled(): Promise<void>
  dispose(): void
}

export async function startWebMcpAdapter(
  modelContext: WebMCP.ModelContext | undefined,
  controller: PrivacyController,
  catalog: ProcessingCatalog,
): Promise<WebMcpAdapter> {
  if (!modelContext) {
    return {
      available: false,
      whenSettled: async () => undefined,
      dispose: () => undefined,
    }
  }

  const tools = createToolDefinitions(controller, catalog)
  const commonRegistration = new AbortController()
  let applyRegistration: AbortController | null = null
  let disposed = false
  let reconcileQueue = Promise.resolve()

  await Promise.all(tools.common.map((tool) =>
    modelContext.registerTool(tool, { signal: commonRegistration.signal })))

  const reconcileApply = async () => {
    if (disposed) return
    const shouldRegister = controller.getSnapshot().workflow === 'reviewed'
    if (shouldRegister && !applyRegistration) {
      const registration = new AbortController()
      applyRegistration = registration
      await modelContext.registerTool(tools.apply, { signal: registration.signal })
      if (disposed || controller.getSnapshot().workflow !== 'reviewed') {
        registration.abort()
        if (applyRegistration === registration) applyRegistration = null
      }
      return
    }
    if (!shouldRegister && applyRegistration) {
      applyRegistration.abort()
      applyRegistration = null
    }
  }

  const enqueueReconcile = () => {
    reconcileQueue = reconcileQueue.then(reconcileApply, reconcileApply)
    return reconcileQueue
  }

  const unsubscribe = controller.subscribe(() => {
    void enqueueReconcile()
  })
  await enqueueReconcile()

  return {
    available: true,
    whenSettled: () => reconcileQueue,
    dispose() {
      if (disposed) return
      disposed = true
      unsubscribe()
      commonRegistration.abort()
      applyRegistration?.abort()
      applyRegistration = null
    },
  }
}
