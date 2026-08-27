import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { travelCatalog } from '@/demo/travel-catalog'
import packJson from '../../../evals/privacy-prompt-cases.json'

const toolNames = [
  'get_privacy_overview',
  'inspect_processing',
  'stage_privacy_plan',
  'get_privacy_receipt',
  'get_privacy_history',
  'get_accessibility_preferences',
  'set_accessibility_preferences',
  'navigate_to_site_destination',
  'apply_privacy_plan',
] as const

const toolName = z.enum(toolNames)
const expectedCall = z.object({
  functionName: toolName,
  arguments: z.record(z.string(), z.unknown()),
}).strict()
const evalCase = z.object({
  id: z.string().min(1),
  initialState: z.enum(['clean', 'staged_unreviewed', 'reviewed']),
  humanStep: z.string().min(1).optional(),
  prompt: z.string().min(1),
  expectedCalls: z.array(expectedCall),
  allowedAdditionalCalls: z.array(toolName),
  forbiddenCalls: z.array(toolName),
  expectedUi: z.string().min(1),
  expectedOutcome: z.string().min(1),
}).strict()
const packSchema = z.object({
  schemaVersion: z.literal(1),
  repeatCount: z.literal(3),
  resetBetweenRuns: z.literal(true),
  cases: z.array(evalCase).length(5),
}).strict()

const pack = packSchema.parse(packJson)

describe('privacy WebMCP eval pack', () => {
  it('defines five unique, repeatable cases using only registered tools', () => {
    expect(new Set(pack.cases.map(({ id }) => id)).size).toBe(5)
    expect(pack.repeatCount).toBe(3)
    expect(pack.resetBetweenRuns).toBe(true)
  })

  it('keeps apply forbidden before review and expected only after the human step', () => {
    const premature = pack.cases.find(({ id }) => id === 'block-premature-apply')!
    expect(premature.initialState).toBe('staged_unreviewed')
    expect(premature.forbiddenCalls).toContain('apply_privacy_plan')
    expect(premature.expectedCalls).toEqual([])

    const reviewed = pack.cases.find(({ id }) => id === 'apply-reviewed-plan')!
    expect(reviewed.initialState).toBe('reviewed')
    expect(reviewed.humanStep).toContain('1.2 seconds')
    expect(reviewed.expectedCalls.map(({ functionName }) => functionName)).toEqual(['apply_privacy_plan'])
  })

  it('uses catalog-backed processing, capability, and use IDs', () => {
    const inspect = pack.cases.find(({ id }) => id === 'inspect-partner-advertising')!
    expect(() => travelCatalog.getProcessing(String(inspect.expectedCalls[0]?.arguments.processingId))).not.toThrow()

    const staged = pack.cases.find(({ id }) => id === 'prepare-minimisation-plan')!
    const input = staged.expectedCalls[0]?.arguments as {
      keepCapabilities: string[]
      avoidUses: string[]
    }
    expect(input.keepCapabilities.every((id) => travelCatalog.capabilities.some((item) => item.id === id))).toBe(true)
    expect(input.avoidUses.every((id) => travelCatalog.uses.some((item) => item.id === id))).toBe(true)
  })
})
