import type {
  ObservedPrivacySignals,
  PersonalControlsCoordinator,
  PrivacyController,
  PrivacyViewCoordinator,
} from '@/application'
import type {
  AccessibilityCatalog,
  AccessibilityRuntime,
  AccessibilityState,
  ProcessingCatalog,
  SiteGuideCatalog,
  SiteGuideRuntime,
  SystemAccessibilityPreferences,
} from '@/domain'
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

export interface ClearRightsToolDependencies {
  privacyController: PrivacyController
  privacyCatalog: ProcessingCatalog
  privacyUi: PrivacyViewCoordinator
  controlsUi: PersonalControlsCoordinator
  readObservedPrivacySignals(): ObservedPrivacySignals
  accessibilityRuntime: AccessibilityRuntime
  accessibilityCatalog: AccessibilityCatalog
  readSystemPreferences(): SystemAccessibilityPreferences
  siteGuideRuntime: SiteGuideRuntime
  siteGuideCatalog: SiteGuideCatalog
}

export function createToolDefinitions(dependencies: ClearRightsToolDependencies) {
  const {
    privacyController: controller,
    privacyCatalog: catalog,
    privacyUi,
    controlsUi,
    readObservedPrivacySignals,
    accessibilityRuntime,
    accessibilityCatalog,
    readSystemPreferences,
    siteGuideRuntime,
    siteGuideCatalog,
  } = dependencies
  const schemas = createCatalogSchemas(catalog)
  const accessibilitySchemas = createAccessibilitySchemas(accessibilityCatalog)
  const siteGuideSchemas = createSiteGuideSchemas(siteGuideCatalog)
  const common: WebMCP.ModelContextTool[] = [
    {
      name: 'get_privacy_overview',
      title: 'Get privacy overview',
      description: 'Read the applied privacy state, any separate pending plan, planner options, workflow status, and observed browser privacy signals.',
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
          controlsUi.openPanel('privacy', {
            origin: 'agent',
            targetId: 'privacy-overview',
            message: 'The agent opened Privacy so you can inspect the current setup.',
          })
        }
        return {
          catalogVersion: catalog.version,
          noticeVersion: catalog.noticeVersion,
          noticeStatus: snapshot.record.notice.status,
          workflow: snapshot.workflow,
          revision: snapshot.record.state.revision,
          applyAvailable: snapshot.workflow === 'reviewed',
          observedSignals: readObservedPrivacySignals(),
          pendingPlan: snapshot.plan && (snapshot.workflow === 'staged' || snapshot.workflow === 'reviewed')
            ? {
                id: snapshot.plan.id,
                status: snapshot.workflow,
                baseRevision: snapshot.plan.baseRevision,
                changes: snapshot.plan.changes.map(({ processingId, label, before, after }) => ({
                  processingId,
                  label,
                  before,
                  after,
                })),
              }
            : null,
          processing: catalog.processing.map((item) => ({
            id: item.id,
            sectionId: item.sectionId,
            label: item.label,
            summary: item.description.summary,
            controlMode: item.control.mode,
            enabled: snapshot.record.state.processing[item.id],
            mutable: item.control.mutable,
            policyContextIds: item.policyContexts.map(({ id }) => id),
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
          controlsUi.openPanel('privacy', {
            origin: 'agent',
            targetId: processingId,
            message: `The agent opened ${inspection.definition.label} for detailed review.`,
          })
        }
        return { ...inspection, contentProvenance: 'site_developer' as const }
      }),
    },
    {
      name: 'stage_privacy_plan',
      title: 'Stage privacy plan',
      description: 'Prepare and display a deterministic minimisation plan from capabilities to keep and data uses to avoid.',
      inputSchema: z.toJSONSchema(schemas.stageInput),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeValidated(schemas.stageInput, schemas.privacyPlan, input, (parsed) => {
        const plan = controller.stage(parsed, 'webmcp_tool')
        privacyUi.navigate({
          view: 'review',
          origin: 'agent',
          preparedPlanId: plan.id,
          message: 'The agent prepared the final review of your requested changes. Read the consequences and approve them manually.',
        })
        controlsUi.openPanel('privacy', {
          origin: 'agent',
          targetId: 'privacy-review',
          message: 'The agent prepared privacy changes. Review the consequences and approve them manually.',
        })
        return plan
      }),
    },
    {
      name: 'get_privacy_receipt',
      title: 'Get privacy receipt',
      description: 'Read the latest receipt verified by enforcement-adapter readback, if a human-approved choice has been applied.',
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
          controlsUi.openPanel('privacy', {
            origin: 'agent',
            targetId: 'privacy-receipt',
            message: 'The agent opened the latest verified privacy receipt.',
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
          controlsUi.openPanel('privacy', {
            origin: 'agent',
            targetId: 'privacy-history',
            message: 'The agent opened the privacy change history.',
          })
        }
        return { receipts }
      }),
    },
    {
      name: 'get_accessibility_preferences',
      title: 'Get accessibility preferences',
      description: 'Read the developer-declared accessibility preference catalog, current local values, observed system preferences, and undo availability.',
      inputSchema: z.toJSONSchema(revealInputSchema),
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: (input) => executeValidated(
        revealInputSchema,
        accessibilitySchemas.overviewOutput,
        input,
        ({ reveal = false }) => {
          const snapshot = accessibilityRuntime.getSnapshot()
          if (reveal) {
            controlsUi.openPanel('accessibility', {
              origin: 'agent',
              targetId: 'accessibility-preferences',
              message: 'The agent opened Display preferences so you can inspect the current local settings.',
            })
          }
          return {
            catalogVersion: accessibilityCatalog.version,
            primitives: accessibilityCatalog.primitives.map((primitive) => ({
              ...primitive,
              options: primitive.options.map((option) => ({ ...option })),
            })),
            current: snapshot.current,
            system: readSystemPreferences(),
            undoAvailable: snapshot.undoAvailable,
            adapterId: snapshot.adapterId,
            scope: snapshot.scope,
          }
        },
      ),
    },
    {
      name: 'set_accessibility_preferences',
      title: 'Set accessibility preferences',
      description: 'Apply one or more available local accessibility preferences, verify DOM readback, and keep one visible undo.',
      inputSchema: z.toJSONSchema(accessibilitySchemas.setInput),
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeValidated(
        accessibilitySchemas.setInput,
        accessibilitySchemas.changeOutput,
        input,
        async (partial) => {
          const changed = await accessibilityRuntime.setPreferences(partial as Partial<AccessibilityState>, 'agent')
          controlsUi.openPanel('accessibility', {
            origin: 'agent',
            targetId: 'accessibility-preferences',
            message: changed.changed
              ? 'The agent applied Display preferences and verified the visible result. Undo remains available.'
              : 'The agent checked Display preferences; the requested values were already active.',
          })
          return changed
        },
      ),
    },
    {
      name: 'navigate_to_site_destination',
      title: 'Navigate to site destination',
      description: 'Open one developer-declared Waypoint route or Personal Controls destination. Arbitrary paths are not accepted.',
      inputSchema: siteGuideSchemas.inputJsonSchema,
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => executeValidated(
        siteGuideSchemas.input,
        siteGuideSchemas.output,
        input,
        ({ destinationId }) => siteGuideRuntime.navigate(destinationId, 'agent'),
      ),
    },
  ]

  const apply: WebMCP.ModelContextTool = {
    name: 'apply_privacy_plan',
    title: 'Apply reviewed privacy plan',
    description: 'Apply the exact staged plan after a person has reviewed it in the visible privacy settings, then verify enforcement-adapter readback and return a scoped receipt.',
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
      controlsUi.openPanel('privacy', {
        origin: 'agent',
        targetId: 'privacy-receipt',
        message: 'The agent applied the human-approved privacy plan and opened its verified receipt.',
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
    description: z.object({
      summary: z.string().max(240),
      details: z.string().max(4_000),
    }).strict(),
    purpose: z.string(),
    data: z.array(z.string()),
    control: z.object({
      mode: z.enum(['required', 'opt_in', 'opt_out']),
      mutable: z.boolean(),
      defaultEnabled: z.boolean(),
    }).strict(),
    dependencies: z.array(processingId),
    consequences: z.object({ whenEnabled: z.string(), whenDisabled: z.string() }).strict(),
    policyContexts: z.array(policyContextSchema()),
    developerContext: z.object({
      factualBackground: z.string().max(4_000),
      decisionFactors: z.array(z.string().max(500)).max(12),
      limitations: z.array(z.string().max(500)).max(12),
      references: z.array(contextReferenceSchema()).max(8),
    }).strict().optional(),
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
    kind: z.enum(['initial_choice', 'settings_change']),
    planId: z.string(),
    catalogVersion: z.string(),
    noticeVersion: z.string(),
    issuedAt: z.string(),
    reviewedAt: z.string(),
    approvalMethod: z.enum(['explicit_action', 'review_hold']),
    preparationOrigin: z.enum(['page_ui', 'webmcp_tool']),
    entrySurface: z.enum(['initial_banner', 'footer_link', 'account_settings', 'embedded_panel', 'agent_only']),
    choiceMethod: z.enum(['allow_all', 'reject_optional', 'managed']).nullable(),
    beforeRevision: z.number().int().positive(),
    afterRevision: z.number().int().positive(),
    beforeState: processingState,
    afterState: processingState,
    changes: z.array(planChange),
    decisions: z.array(z.object({
      processingId,
      label: z.string(),
      enabled: z.boolean(),
      choice: z.enum(['required', 'allowed', 'denied']),
      controlMode: z.enum(['required', 'opt_in', 'opt_out']),
      policyContexts: z.array(z.object({
        id: z.string(),
        label: z.string(),
        legalBasis: z.string().optional(),
        category: z.string().optional(),
        userAction: z.string().optional(),
      }).strict()),
    }).strict()).length(catalog.processing.length),
    verified: z.literal(true),
    migrated: z.boolean().optional(),
    verification: z.object({
      observedRevision: z.number().int().positive(),
      method: z.enum(['persisted_state_readback', 'adapter_readback']),
      adapterId: z.string(),
      scope: z.enum(['local_demo', 'external']),
      readback: processingState,
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
    noticeStatus: z.enum(['pending', 'recorded', 'outdated']),
    workflow: z.enum(['idle', 'staged', 'reviewed', 'applied']),
    revision: z.number().int().positive(),
    applyAvailable: z.boolean(),
    observedSignals: z.object({
      globalPrivacyControl: z.discriminatedUnion('support', [
        z.object({
          support: z.literal('supported'),
          value: z.boolean(),
          interpretation: z.enum(['opt_out_observed', 'no_opt_out_observed']),
          effect: z.literal('informational_only'),
        }).strict(),
        z.object({
          support: z.literal('unavailable'),
          value: z.null(),
          interpretation: z.literal('unavailable'),
          effect: z.literal('informational_only'),
        }).strict(),
      ]),
    }).strict(),
    pendingPlan: z.object({
      id: z.string(),
      status: z.enum(['staged', 'reviewed']),
      baseRevision: z.number().int().positive(),
      changes: z.array(z.object({
        processingId,
        label: z.string(),
        before: z.boolean(),
        after: z.boolean(),
      }).strict()),
    }).strict().nullable(),
    processing: z.array(z.object({
      id: processingId,
      sectionId,
      label: z.string(),
      summary: z.string().max(240),
      controlMode: z.enum(['required', 'opt_in', 'opt_out']),
      enabled: z.boolean(),
      mutable: z.boolean(),
      policyContextIds: z.array(z.string()),
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
    inspectionOutput: z.object({
      definition: processingDefinition,
      enabled: z.boolean(),
      contentProvenance: z.literal('site_developer'),
    }).strict(),
    receiptOutput: z.object({ receipt: privacyReceipt.nullable() }).strict(),
    historyOutput: z.object({ receipts: z.array(privacyReceipt).max(10) }).strict(),
  }
}

function contextReferenceSchema() {
  return z.object({
    label: z.string(),
    citation: z.string().optional(),
    url: z.string().url().optional(),
  }).strict()
}

function policyContextSchema() {
  return z.object({
    id: z.string(),
    label: z.string(),
    rationale: z.string().max(4_000),
    legalBasis: z.string().optional(),
    category: z.string().optional(),
    userAction: z.string().optional(),
    references: z.array(contextReferenceSchema()).max(8),
  }).strict()
}

function createAccessibilitySchemas(catalog: AccessibilityCatalog) {
  const option = (id: 'textScale' | 'colorScheme' | 'contrast' | 'motion' | 'readingLayout') => stringEnum(
    catalog.getPrimitive(id).options.map(({ value }) => value),
    `accessibility ${id}`,
  )
  const state = z.object({
    textScale: option('textScale'),
    colorScheme: option('colorScheme'),
    contrast: option('contrast'),
    motion: option('motion'),
    readingLayout: option('readingLayout'),
  }).strict()
  const setInput = z.object({
    textScale: option('textScale').optional(),
    colorScheme: option('colorScheme').optional(),
    contrast: option('contrast').optional(),
    motion: option('motion').optional(),
    readingLayout: option('readingLayout').optional(),
  }).strict().refine((input) => Object.keys(input).length > 0, {
    message: 'At least one accessibility preference is required.',
  })
  const primitive = z.object({
    id: z.enum(['textScale', 'colorScheme', 'contrast', 'motion', 'readingLayout']),
    label: z.string(),
    summary: z.string().max(240),
    details: z.string().max(2_000),
    options: z.array(z.object({
      value: z.string(),
      label: z.string(),
      summary: z.string().max(240),
    }).strict()),
  }).strict()
  const changeOutput = z.object({
    before: state,
    after: state,
    readback: state,
    changed: z.boolean(),
    origin: z.enum(['human', 'agent', 'system']),
    adapterId: z.string(),
    scope: z.enum(['local_demo', 'external']),
    undoAvailable: z.boolean(),
  }).strict()
  return {
    setInput,
    changeOutput,
    overviewOutput: z.object({
      catalogVersion: z.string(),
      primitives: z.array(primitive).length(5),
      current: state,
      system: z.object({
        prefersReducedMotion: z.boolean(),
        prefersHigherContrast: z.boolean(),
        prefersDarkColorScheme: z.boolean(),
        forcedColorsActive: z.boolean(),
      }).strict(),
      undoAvailable: z.boolean(),
      adapterId: z.string(),
      scope: z.enum(['local_demo', 'external']),
    }).strict(),
  }
}

function createSiteGuideSchemas(catalog: SiteGuideCatalog) {
  const destinationId = stringEnum(catalog.destinations.map(({ id }) => id), 'site destination')
  const input = z.object({ destinationId }).strict()
  const target = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('route'), path: z.string(), hash: z.string().optional() }).strict(),
    z.object({
      kind: z.literal('panel'),
      panel: z.literal('personal_controls'),
      section: z.enum(['privacy', 'accessibility', 'activity']),
    }).strict(),
  ])
  return {
    input,
    inputJsonSchema: {
      type: 'object',
      properties: {
        destinationId: {
          oneOf: catalog.destinations.map((destination) => ({
            const: destination.id,
            title: destination.label,
            description: destination.summary,
          })),
        },
      },
      required: ['destinationId'],
      additionalProperties: false,
    },
    output: z.object({
      destinationId,
      label: z.string(),
      target,
      origin: z.enum(['human', 'agent']),
      location: z.string(),
    }).strict(),
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
