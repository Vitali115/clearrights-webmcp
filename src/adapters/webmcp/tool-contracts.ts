import type { PrivacyController, PrivacyViewCoordinator } from '@/application'
import type { ProcessingCatalog } from '@/domain'
import { z } from 'zod'

const revealInputSchema = z.object({
  reveal: z.boolean().optional(),
}).strict()

const applyInputSchema = z.object({
  planId: z.string().min(1).max(128),
}).strict()

const errorSchema = z.object({
  code: z.string().min(1).max(64),
  message: z.string().min(1).max(300),
}).strict()

export type ToolEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: z.infer<typeof errorSchema> }

export async function executeValidated<I, O>(
  inputSchema: z.ZodType<I>,
  outputSchema: z.ZodType<O>,
  input: unknown,
  operation: (parsed: I) => O | Promise<O>,
): Promise<ToolEnvelope<O>> {
  const parsedInput = inputSchema.safeParse(input)
  if (!parsedInput.success) {
    return errorEnvelope('invalid_input', parsedInput.error.issues[0]?.message ?? 'Invalid tool input.')
  }

  try {
    const output = await operation(parsedInput.data)
    const parsedOutput = outputSchema.safeParse(output)
    if (!parsedOutput.success) {
      return errorEnvelope('output_contract_error', 'The tool produced an invalid output shape.')
    }
    return { ok: true, data: parsedOutput.data }
  } catch (error) {
    return errorEnvelope(
      errorCode(error),
      error instanceof Error ? error.message : 'The privacy operation failed.',
    )
  }
}

export function createToolDefinitions(
  controller: PrivacyController,
  catalog: ProcessingCatalog,
  privacyUi: PrivacyViewCoordinator,
) {
  const schemas = createCatalogSchemas(catalog)
  const common: WebMCP.ModelContextTool[] = [
    {
      name: 'get_privacy_overview',
      title: 'Get privacy overview',
      description: 'Read the service-declared privacy activities, current states, planner options, and workflow status.',
      inputSchema: z.toJSONSchema(revealInputSchema),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => executeValidated(revealInputSchema, schemas.overviewOutput, input, ({ reveal = false }) => {
        const snapshot = controller.getSnapshot()
        if (reveal) {
          privacyUi.navigate({
            view: 'home',
            origin: 'agent',
            message: 'The agent opened the privacy settings index so you can inspect the current setup.',
          })
        }
        return {
          catalogVersion: catalog.version,
          noticeVersion: catalog.noticeVersion,
          workflow: snapshot.workflow,
          revision: snapshot.record.state.revision,
          applyAvailable: snapshot.workflow === 'reviewed',
          processing: catalog.processing.map((item) => ({
            id: item.id,
            sectionId: item.sectionId,
            label: item.label,
            group: item.group,
            enabled: snapshot.record.state.processing[item.id],
            locked: item.locked,
            declaredLegalBasis: item.declaredLegalBasis,
          })),
          plannerOptions: {
            capabilities: catalog.capabilities.map(({ id, label }) => ({ id, label })),
            uses: catalog.uses.map(({ id, label }) => ({ id, label })),
          },
        }
      }),
    },
    {
      name: 'inspect_processing',
      title: 'Inspect privacy processing',
      description: 'Read the service-declared purpose, data, legal basis, controls, dependencies, consequences, and current state for one activity.',
      inputSchema: z.toJSONSchema(schemas.inspectInput),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => executeValidated(schemas.inspectInput, schemas.inspectionOutput, input, ({ processingId, reveal = false }) => {
        const inspection = controller.inspect(processingId)
        if (reveal) {
          privacyUi.navigate({
            view: 'activity',
            processingId,
            origin: 'agent',
            message: `The agent opened ${inspection.definition.label} so you can review its purpose, data, dependencies, and consequences.`,
          })
        }
        return inspection
      }),
    },
    {
      name: 'stage_privacy_plan',
      title: 'Stage privacy plan',
      description: 'Prepare and display a deterministic minimisation plan from capabilities to keep and data uses to avoid.',
      inputSchema: z.toJSONSchema(schemas.stageInput),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeValidated(schemas.stageInput, schemas.privacyPlan, input, (parsed) => {
        const plan = controller.stage(parsed)
        privacyUi.navigate({
          view: 'review',
          origin: 'agent',
          preparedPlanId: plan.id,
          message: 'The agent prepared the final review of your requested changes. Read the consequences and approve them manually.',
        })
        return plan
      }),
    },
    {
      name: 'get_privacy_receipt',
      title: 'Get privacy receipt',
      description: 'Read the latest receipt verified by persisted-state readback, if a reviewed plan has been applied.',
      inputSchema: z.toJSONSchema(revealInputSchema),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => executeValidated(revealInputSchema, schemas.receiptOutput, input, ({ reveal = false }) => {
        const receipt = controller.getReceipt()
        if (reveal) {
          privacyUi.navigate({
            view: 'receipt',
            origin: 'agent',
            message: receipt
              ? 'The agent opened the latest verified receipt so you can inspect what was applied.'
              : 'The agent opened the receipt view. No verified receipt is available yet.',
          })
        }
        return { receipt }
      }),
    },
    {
      name: 'get_privacy_history',
      title: 'Get privacy history',
      description: 'Read up to ten verified privacy receipts in newest-first order.',
      inputSchema: z.toJSONSchema(revealInputSchema),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => executeValidated(revealInputSchema, schemas.historyOutput, input, ({ reveal = false }) => {
        const receipts = controller.getReceiptHistory()
        if (reveal) {
          privacyUi.navigate({
            view: 'history',
            origin: 'agent',
            message: 'The agent opened Previous changes so you can inspect the verified receipt history.',
          })
        }
        return { receipts }
      }),
    },
  ]

  const apply: WebMCP.ModelContextTool = {
    name: 'apply_privacy_plan',
    title: 'Apply reviewed privacy plan',
    description: 'Apply the exact staged plan after a person has reviewed it in the visible privacy settings, then verify persisted state and return a receipt.',
    inputSchema: z.toJSONSchema(applyInputSchema),
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: (input) => executeValidated(applyInputSchema, schemas.privacyReceipt, input, async ({ planId }) => {
      const receipt = await controller.apply(planId)
      privacyUi.revokeAgentPreparation()
      privacyUi.navigate({
        view: 'receipt',
        origin: 'agent',
        message: 'The agent applied the human-approved plan and opened its verified receipt for your confirmation.',
      })
      return receipt
    }),
  }

  return { common, apply }
}

function createCatalogSchemas(catalog: ProcessingCatalog) {
  const processingId = stringEnum(catalog.processing.map(({ id }) => id), 'processing')
  const capabilityId = stringEnum(catalog.capabilities.map(({ id }) => id), 'capability')
  const useId = stringEnum(catalog.uses.map(({ id }) => id), 'use')
  const sectionId = stringEnum(catalog.sections.map(({ id }) => id), 'section')
  const processingState = z.object(Object.fromEntries(
    catalog.processing.map(({ id }) => [id, z.boolean()]),
  )).strict()
  const processingDefinition = z.object({
    id: processingId,
    sectionId,
    label: z.string(),
    group: z.enum(['required', 'optional']),
    locked: z.boolean(),
    defaultEnabled: z.boolean(),
    purpose: z.string(),
    data: z.array(z.string()),
    declaredLegalBasis: z.enum(['contract', 'legitimate_interest', 'consent']),
    control: z.string(),
    dependencies: z.array(processingId),
    consequence: z.string(),
    policyReference: z.string(),
    capabilities: z.array(capabilityId),
    uses: z.array(useId),
  }).strict()
  const planChange = z.object({
    processingId,
    label: z.string(),
    before: z.boolean(),
    after: z.boolean(),
    reason: z.string(),
  }).strict()
  const plannerInput = z.object({
    keepCapabilities: z.array(capabilityId),
    avoidUses: z.array(useId),
  }).strict()
  const privacyPlan = z.object({
    id: z.string(),
    baseRevision: z.number().int().positive(),
    input: plannerInput,
    target: processingState,
    changes: z.array(planChange),
    preservedCapabilities: z.array(capabilityId),
    consequences: z.array(z.object({
      processingId,
      kind: z.enum(['disabled', 'enabled']),
      message: z.string(),
    }).strict()),
    conflicts: z.array(z.object({
      processingId,
      capabilityId,
      useId,
      message: z.string(),
    }).strict()),
    blockedItems: z.array(z.object({
      processingId,
      useId,
      message: z.string(),
    }).strict()),
    isNoOp: z.boolean(),
  }).strict()
  const privacyReceipt = z.object({
    id: z.string(),
    planId: z.string(),
    catalogVersion: z.string(),
    issuedAt: z.string(),
    reviewedAt: z.string(),
    beforeRevision: z.number().int().positive(),
    afterRevision: z.number().int().positive(),
    changes: z.array(planChange),
    finalState: processingState,
    verified: z.literal(true),
    verification: z.object({
      observedRevision: z.number().int().positive(),
      method: z.literal('persisted_state_readback'),
    }).strict(),
  }).strict()
  const inspectInput = z.object({
    processingId,
    reveal: z.boolean().optional(),
  }).strict()
  const stageInput = z.object({
    keepCapabilities: z.array(capabilityId).max(catalog.capabilities.length),
    avoidUses: z.array(useId).max(catalog.uses.length),
  }).strict()
  const overviewOutput = z.object({
    catalogVersion: z.string(),
    noticeVersion: z.string(),
    workflow: z.enum(['idle', 'staged', 'reviewed', 'applied']),
    revision: z.number().int().positive(),
    applyAvailable: z.boolean(),
    processing: z.array(z.object({
      id: processingId,
      sectionId,
      label: z.string(),
      group: z.enum(['required', 'optional']),
      enabled: z.boolean(),
      locked: z.boolean(),
      declaredLegalBasis: z.enum(['contract', 'legitimate_interest', 'consent']),
    }).strict()),
    plannerOptions: z.object({
      capabilities: z.array(z.object({ id: capabilityId, label: z.string() }).strict()),
      uses: z.array(z.object({ id: useId, label: z.string() }).strict()),
    }).strict(),
  }).strict()

  return {
    inspectInput,
    stageInput,
    privacyPlan,
    privacyReceipt,
    overviewOutput,
    inspectionOutput: z.object({ definition: processingDefinition, enabled: z.boolean() }).strict(),
    receiptOutput: z.object({ receipt: privacyReceipt.nullable() }).strict(),
    historyOutput: z.object({ receipts: z.array(privacyReceipt).max(10) }).strict(),
  }
}

function stringEnum(values: readonly string[], kind: string) {
  if (values.length === 0) throw new Error(`Cannot build WebMCP ${kind} schema from an empty catalog.`)
  return z.enum(values as [string, ...string[]])
}

function errorEnvelope(code: string, message: string): ToolEnvelope<never> {
  const error = errorSchema.parse({ code, message: message.slice(0, 300) })
  return { ok: false, error }
}

function errorCode(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'string') {
    return error.code
  }
  return 'operation_failed'
}
