import type { BrowserContext, Page } from '@playwright/test'

export interface ContractToolSummary {
  name: string
  title?: string
  description: string
  inputSchema: unknown
  annotations?: unknown
}

interface ContractHarnessApi {
  listTools(): ContractToolSummary[]
  executeTool(name: string, input: unknown): Promise<unknown>
}

interface ContractHarnessWindow {
  __clearRightsWebMcpHarness: ContractHarnessApi
}

export async function installWebMcpContractHarness(context: BrowserContext) {
  await context.addInitScript(() => {
    interface RegisteredTool {
      name: string
      title?: string
      description: string
      inputSchema: unknown
      annotations?: unknown
      execute(input: unknown, context: { signal: AbortSignal }): Promise<unknown> | unknown
    }

    interface RegistrationOptions {
      signal?: AbortSignal
    }

    const tools = new Map<string, RegisteredTool>()
    const modelContext = new EventTarget()
    let ontoolchange: EventListener | null = null

    const emitToolChange = () => {
      const event = new Event('toolchange')
      modelContext.dispatchEvent(event)
      ontoolchange?.call(modelContext, event)
    }

    Object.defineProperties(modelContext, {
      ontoolchange: {
        configurable: true,
        get: () => ontoolchange,
        set: (listener: EventListener | null) => { ontoolchange = listener },
      },
      registerTool: {
        configurable: true,
        value: async (tool: RegisteredTool, options?: RegistrationOptions) => {
          if (options?.signal?.aborted) return
          tools.set(tool.name, tool)
          emitToolChange()
          options?.signal?.addEventListener('abort', () => {
            if (tools.get(tool.name) !== tool) return
            tools.delete(tool.name)
            emitToolChange()
          }, { once: true })
        },
      },
      getTools: {
        configurable: true,
        value: async () => Array.from(tools.values(), ({ execute: _execute, ...tool }) => tool),
      },
    })

    const harness: ContractHarnessApi = {
      listTools: () => Array.from(tools.values(), ({ execute: _execute, ...tool }) => tool),
      async executeTool(name, input) {
        const tool = tools.get(name)
        if (!tool) throw new Error(`Tool not registered: ${name}`)
        return tool.execute(input, { signal: new AbortController().signal })
      },
    }

    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: modelContext,
    })
    Object.defineProperty(globalThis, '__clearRightsWebMcpHarness', {
      configurable: true,
      value: harness,
    })
  })
}

export async function listContractTools(page: Page): Promise<ContractToolSummary[]> {
  return page.evaluate(() => (
    globalThis as unknown as ContractHarnessWindow
  ).__clearRightsWebMcpHarness.listTools())
}

export async function executeContractTool<T>(
  page: Page,
  name: string,
  input: unknown,
): Promise<T> {
  return page.evaluate(async ({ toolName, toolInput }) => (
    globalThis as unknown as ContractHarnessWindow
  ).__clearRightsWebMcpHarness.executeTool(toolName, toolInput), {
    toolName: name,
    toolInput: input,
  }) as Promise<T>
}
