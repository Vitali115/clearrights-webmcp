import {
  CAPABILITY_IDS,
  PROCESSING_IDS,
  USE_IDS,
  type ProcessingCatalog,
} from '@/domain'
import type { PrivacyController, PrivacyViewCoordinator } from '@/application'
import { z } from 'zod'

export const revealInputSchema = z.object({
  reveal: z.boolean().optional(),
}).strict()

export const inspectInputSchema = z.object({
  processingId: z.enum(PROCESSING_IDS),
  reveal: z.boolean().optional(),
}).strict()

export const stageInputSchema = z.object({
  keepCapabilities: z.array(z.enum(CAPABILITY_IDS)).max(CAPABILITY_IDS.length),
  avoidUses: z.array(z.enum(USE_IDS)).max(USE_IDS.length),
}).strict()

export const applyInputSchema = z.object({
  planId: z.string().min(1).max(128),
}).strict()

const processingStateSchema = z.object(Object.fromEntries(
  PROCESSING_IDS.map((id) => [id, z.boolean()]),
) as Record<(typeof PROCESSING_IDS)[number], z.ZodBoolean>).strict()

const processingDefinitionSchema = z.object({
  id: z.enum(PROCESSING_IDS),
  label: z.string(),
  group: z.enum(['required', 'optional']),
  locked: z.boolean(),
  purpose: z.string(),
  data: z.array(z.string()),
  declaredLegalBasis: z.enum(['contract', 'legitimate_interest', 'consent']),
  control: z.string(),
  dependencies: z.array(z.enum(PROCESSING_IDS)),
  consequence: z.string(),
  policyReference: z.string(),
  capabilities: z.array(z.enum(CAPABILITY_IDS)),
  uses: z.array(z.enum(USE_IDS)),
}).strict()

const planChangeSchema = z.object({
  processingId: z.enum(PROCESSING_IDS),
  label: z.string(),
  before: z.boolean(),
  after: z.boolean(),
  reason: z.string(),
}).strict()

const plannerInputSchema = z.object({
  keepCapabilities: z.array(z.enum(CAPABILITY_IDS)),
  avoidUses: z.array(z.enum(USE_IDS)),
}).strict()

export const privacyPlanSchema = z.object({
  id: z.string(),
  baseRevision: z.number().int().positive(),
  input: plannerInputSchema,
  target: processingStateSchema,
  changes: z.array(planChangeSchema),
  preservedCapabilities: z.array(z.enum(CAPABILITY_IDS)),
  consequences: z.array(z.object({
    processingId: z.enum(PROCESSING_IDS),
    kind: z.enum(['disabled', 'enabled']),
    message: z.string(),
  }).strict()),
  conflicts: z.array(z.object({
    processingId: z.enum(PROCESSING_IDS),
    capabilityId: z.enum(CAPABILITY_IDS),
    useId: z.enum(USE_IDS),
    message: z.string(),
  }).strict()),
  blockedItems: z.array(z.object({
    processingId: z.enum(PROCESSING_IDS),
    useId: z.enum(USE_IDS),
    message: z.string(),
  }).strict()),
  isNoOp: z.boolean(),
}).strict()

export const privacyReceiptSchema = z.object({
  id: z.string(),
  planId: z.string(),
  catalogVersion: z.string(),
  issuedAt: z.string(),
  reviewedAt: z.string(),
  beforeRevision: z.number().int().positive(),
  afterRevision: z.number().int().positive(),
  changes: z.array(planChangeSchema),
  finalState: processingStateSchema,
  verified: z.literal(true),
  verification: z.object({
    observedRevision: z.number().int().positive(),
    method: z.literal('persisted_state_readback'),
  }).strict(),
}).strict()

export const overviewOutputSchema = z.object({
  workflow: z.enum(['idle', 'staged', 'reviewed', 'applied']),
  revision: z.number().int().positive(),
  applyAvailable: z.boolean(),
  processing: z.array(z.object({
    id: z.enum(PROCESSING_IDS),
    label: z.string(),
    group: z.enum(['required', 'optional']),
    enabled: z.boolean(),
    locked: z.boolean(),
    declaredLegalBasis: z.enum(['contract', 'legitimate_interest', 'consent']),
  }).strict()),
  plannerOptions: z.object({
    capabilities: z.array(z.object({ id: z.enum(CAPABILITY_IDS), label: z.string() }).strict()),
    uses: z.array(z.object({ id: z.enum(USE_IDS), label: z.string() }).strict()),
  }).strict(),
}).strict()

export const inspectionOutputSchema = z.object({
  definition: processingDefinitionSchema,
  enabled: z.boolean(),
}).strict()

export const receiptOutputSchema = z.object({
  receipt: privacyReceiptSchema.nullable(),
}).strict()

export const historyOutputSchema = z.object({
  receipts: z.array(privacyReceiptSchema).max(10),
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
  const common: WebMCP.ModelContextTool[] = [
    {
      name: 'get_privacy_overview',
      title: 'Get privacy overview',
      description: 'Read the service-declared privacy activities, current states, planner options, and workflow status.',
      inputSchema: z.toJSONSchema(revealInputSchema),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => executeValidated(revealInputSchema, overviewOutputSchema, input, ({ reveal = false }) => {
        const snapshot = controller.getSnapshot()
        if (reveal) {
          privacyUi.navigate({
            view: 'home',
            origin: 'agent',
            message: 'The agent opened the Privacy Center overview so you can inspect the current setup.',
          })
        }
        return {
          workflow: snapshot.workflow,
          revision: snapshot.record.state.revision,
          applyAvailable: snapshot.workflow === 'reviewed',
          processing: catalog.processing.map((item) => ({
            id: item.id,
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
      inputSchema: z.toJSONSchema(inspectInputSchema),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => executeValidated(inspectInputSchema, inspectionOutputSchema, input, ({ processingId, reveal = false }) => {
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
      inputSchema: z.toJSONSchema(stageInputSchema),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeValidated(stageInputSchema, privacyPlanSchema, input, (parsed) => {
        const plan = controller.stage(parsed)
        privacyUi.navigate({
          view: 'review',
          origin: 'agent',
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
      execute: (input) => executeValidated(revealInputSchema, receiptOutputSchema, input, ({ reveal = false }) => {
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
      execute: (input) => executeValidated(revealInputSchema, historyOutputSchema, input, ({ reveal = false }) => {
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
    description: 'Apply the exact staged plan after a person has reviewed it in the visible privacy center, then verify persisted state and return a receipt.',
    inputSchema: z.toJSONSchema(applyInputSchema),
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: (input) => executeValidated(applyInputSchema, privacyReceiptSchema, input, async ({ planId }) => {
      const receipt = await controller.apply(planId)
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
