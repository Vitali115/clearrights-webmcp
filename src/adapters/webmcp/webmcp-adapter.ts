import type { ActivityCoordinator, ActivityModule } from '@/application'
import { createToolDefinitions, type ClearRightsToolDependencies } from './tool-contracts'

export interface WebMcpAdapter {
  available: boolean
  whenSettled(): Promise<void>
  dispose(): void
}

export interface WebMcpAdapterDependencies extends ClearRightsToolDependencies {
  activity: ActivityCoordinator
}

export async function startWebMcpAdapter(
  modelContext: WebMCP.ModelContext | undefined,
  dependencies: WebMcpAdapterDependencies,
): Promise<WebMcpAdapter> {
  if (!modelContext) {
    return {
      available: false,
      whenSettled: async () => undefined,
      dispose: () => undefined,
    }
  }

  const definitions = createToolDefinitions(dependencies)
  const tools = {
    common: definitions.common.map((tool) => trackTool(tool, dependencies.activity)),
    apply: trackTool(definitions.apply, dependencies.activity),
  }
  const commonRegistration = new AbortController()
  let applyRegistration: AbortController | null = null
  let disposed = false
  let reconcileQueue = Promise.resolve()

  try {
    await Promise.all(tools.common.map((tool) =>
      modelContext.registerTool(tool, { signal: commonRegistration.signal })))
  } catch {
    commonRegistration.abort()
    return {
      available: false,
      whenSettled: async () => undefined,
      dispose: () => undefined,
    }
  }

  const reconcileApply = async () => {
    if (disposed) return
    const shouldRegister = dependencies.privacyController.getSnapshot().workflow === 'reviewed'
    if (shouldRegister && !applyRegistration) {
      const registration = new AbortController()
      applyRegistration = registration
      try {
        await modelContext.registerTool(tools.apply, { signal: registration.signal })
      } catch {
        registration.abort()
        if (applyRegistration === registration) applyRegistration = null
        return
      }
      if (disposed || dependencies.privacyController.getSnapshot().workflow !== 'reviewed') {
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

  const unsubscribe = dependencies.privacyController.subscribe(() => {
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

function trackTool(tool: WebMCP.ModelContextTool, activity: ActivityCoordinator): WebMCP.ModelContextTool {
  const execute = tool.execute
  return {
    ...tool,
    async execute(input, context) {
      const result = await execute(input, context)
      const envelope = result as { ok?: boolean; error?: { code?: string } }
      const succeeded = envelope.ok === true
      const blocked = !succeeded && envelope.error?.code === 'invalid_input'
      activity.record({
        source: 'agent',
        module: moduleFor(tool.name),
        action: tool.name,
        outcome: succeeded ? 'succeeded' : blocked ? 'blocked' : 'failed',
        summary: succeeded
          ? `The agent completed ${tool.title ?? tool.name}.`
          : `The agent call ${tool.title ?? tool.name} ${blocked ? 'was blocked by input validation' : 'failed safely'}.`,
      })
      return result
    },
  }
}

function moduleFor(toolName: string): ActivityModule {
  if (toolName.includes('accessibility')) return 'accessibility'
  if (toolName === 'navigate_to_site_destination') return 'site_guide'
  return 'privacy'
}
