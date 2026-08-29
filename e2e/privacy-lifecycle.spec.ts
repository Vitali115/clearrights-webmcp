import { expect, test, type Page } from '@playwright/test'
import {
  executeContractTool,
  installWebMcpContractHarness,
  listContractTools,
} from './support/webmcp-contract-harness'

const commonToolNames = [
  'get_accessibility_preferences',
  'get_privacy_history',
  'get_privacy_overview',
  'get_privacy_receipt',
  'inspect_processing',
  'navigate_to_site_destination',
  'set_accessibility_preferences',
  'stage_privacy_plan',
]

const minimiseInput = {
  keepCapabilities: [
    'book_and_manage_trips',
    'protect_account',
    'receive_trip_updates',
  ],
  avoidUses: [
    'preference_personalisation',
    'precise_location',
    'partner_marketing',
  ],
}

interface SuccessEnvelope<T> {
  ok: true
  data: T
}

interface PrivacyPlanResult {
  id: string
  changes: Array<{ processingId: string; before: boolean; after: boolean }>
}

interface PrivacyOverviewResult {
  workflow: string
  applyAvailable: boolean
  nextAction: null | {
    toolName: string
    input: { planId: string }
    humanReviewComplete: boolean
  }
}

interface PrivacyReceiptResult {
  id: string
  verified: boolean
  planId: string
  verification: {
    adapterId: string
    method: string
    scope: string
  }
}

async function toolNames(page: Page) {
  return (await listContractTools(page)).map(({ name }) => name).sort()
}

async function expectToolCount(page: Page, count: number) {
  await expect.poll(async () => (await listContractTools(page)).length).toBe(count)
}

async function recordAllowAll(page: Page) {
  await page.getByRole('button', { name: 'Accept all' }).click()
  await expect(page.getByRole('heading', { name: 'Privacy choices' })).toBeHidden()
  await expect(page.getByTestId('privacy-navbar-status')).toHaveAttribute(
    'aria-label',
    'All optional uses on.',
  )
}

async function stageMinimisation(page: Page) {
  const response = await executeContractTool<SuccessEnvelope<PrivacyPlanResult>>(
    page,
    'stage_privacy_plan',
    minimiseInput,
  )
  expect(response.ok).toBe(true)
  expect(response.data.changes).toHaveLength(3)
  return response.data
}

async function holdHumanReview(page: Page) {
  const confirmation = page.getByRole('button', { name: 'Hold to confirm review' })
  await confirmation.scrollIntoViewIfNeeded()
  const box = await confirmation.boundingBox()
  if (!box) throw new Error('Human review control has no visible bounding box.')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1_300)
  await page.mouse.up()
  await expect(page.getByText('Approved', { exact: true })).toBeVisible()
}

test.describe('ClearRights WebMCP contract lifecycle', () => {
  test.beforeEach(async ({ context }) => {
    await installWebMcpContractHarness(context)
  })

  test('keeps apply behind the human hold and verifies the resulting receipt', async ({ page }) => {
    await page.goto('/#/')
    await expect(page.getByRole('heading', { name: 'Where do you want to go next?' })).toBeVisible()
    await expect(page.getByText('Structured agent access detected in this browser.')).toBeVisible()

    await expectToolCount(page, 8)
    expect(await toolNames(page)).toEqual(commonToolNames)
    await recordAllowAll(page)

    const initialOverview = await executeContractTool<SuccessEnvelope<{
      processing: Array<{ id: string; enabled: boolean; controlMode: string }>
    }>>(page, 'get_privacy_overview', {})
    expect(initialOverview.data.processing.filter(({ controlMode }) => controlMode === 'required'))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'trip_fulfilment', enabled: true }),
        expect.objectContaining({ id: 'account_security', enabled: true }),
        expect.objectContaining({ id: 'transactional_updates', enabled: true }),
      ]))

    const plan = await stageMinimisation(page)
    await expect(page.getByRole('heading', { name: 'Review changes' })).toBeVisible()
    await expect(page.getByText('3 changes ready')).toBeVisible()
    await expect(page.getByText('Change set prepared', { exact: true })).toBeVisible()
    await expect(page.getByText('Waiting for you', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Human approval required' })).toBeDisabled()

    await expect(page.locator('[data-clearrights-surface="travel-discovery"]'))
      .toHaveAttribute('data-clearrights-result', 'personalised')
    await expect(page.locator('[data-clearrights-surface="nearby-guide"]')).toHaveCount(1)
    await expect(page.locator('[data-clearrights-surface="partner-offer"]')).toHaveCount(1)
    expect(await toolNames(page)).toEqual(commonToolNames)
    await expect(executeContractTool(page, 'apply_privacy_plan', { planId: plan.id }))
      .rejects.toThrow(`Tool not registered: apply_privacy_plan`)

    await holdHumanReview(page)
    await expectToolCount(page, 9)
    expect(await toolNames(page)).toContain('apply_privacy_plan')

    const reviewedOverview = await executeContractTool<SuccessEnvelope<PrivacyOverviewResult>>(
      page,
      'get_privacy_overview',
      {},
    )
    expect(reviewedOverview.data).toMatchObject({
      workflow: 'reviewed',
      applyAvailable: true,
      nextAction: {
        toolName: 'apply_privacy_plan',
        input: { planId: plan.id },
        humanReviewComplete: true,
      },
    })

    const applied = await executeContractTool<SuccessEnvelope<PrivacyReceiptResult>>(
      page,
      'apply_privacy_plan',
      { planId: plan.id },
    )
    expect(applied.data).toMatchObject({
      planId: plan.id,
      verified: true,
      verification: {
        adapterId: 'waypoint-local-demo',
        method: 'adapter_readback',
        scope: 'local_demo',
      },
    })

    await expect(page.getByRole('heading', { name: 'Verified receipt' })).toBeVisible()
    await expect(page.getByText('Readback verified')).toBeVisible()
    await expect(page.getByText('Privacy settings applied')).toBeVisible()
    await expectToolCount(page, 8)
    expect(await toolNames(page)).toEqual(commonToolNames)
    await expect(page.locator('[data-clearrights-surface="travel-discovery"]'))
      .toHaveAttribute('data-clearrights-result', 'generic')
    await expect(page.locator('[data-clearrights-surface="nearby-guide"]')).toHaveCount(0)
    await expect(page.locator('[data-clearrights-surface="partner-offer"]')).toHaveCount(0)
  })

  test('removes apply when the approved draft is changed', async ({ page }) => {
    await page.goto('/#/')
    await expectToolCount(page, 8)
    await recordAllowAll(page)
    await stageMinimisation(page)
    await holdHumanReview(page)
    await expectToolCount(page, 9)

    await page.getByRole('button', { name: 'Edit settings' }).click()
    await page.getByRole('switch', { name: 'Recommendations' }).click()

    await expectToolCount(page, 8)
    expect(await toolNames(page)).toEqual(commonToolNames)
    const overview = await executeContractTool<SuccessEnvelope<PrivacyOverviewResult>>(
      page,
      'get_privacy_overview',
      {},
    )
    expect(overview.data).toMatchObject({
      workflow: 'staged',
      applyAvailable: false,
      nextAction: null,
    })
    await expect(page.locator('[data-clearrights-surface="travel-discovery"]'))
      .toHaveAttribute('data-clearrights-result', 'personalised')
  })
})

test('keeps the complete manual fallback when WebMCP is unavailable', async ({ page }) => {
  await page.goto('/#/')
  expect(await page.evaluate(() => 'modelContext' in document)).toBe(false)
  await expect(page.getByText('Structured agent access is unavailable here; manual choices still work.')).toBeVisible()

  await recordAllowAll(page)
  await expect(page.locator('[data-clearrights-surface="travel-discovery"]'))
    .toHaveAttribute('data-clearrights-result', 'personalised')
  await expect(page.locator('[data-clearrights-surface="nearby-guide"]')).toHaveCount(1)
  await expect(page.locator('[data-clearrights-surface="partner-offer"]')).toHaveCount(1)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Privacy choices' })).toBeHidden()
  await expect(page.getByTestId('privacy-navbar-status')).toHaveAttribute(
    'aria-label',
    'All optional uses on.',
  )

  await page.getByRole('button', { name: 'Privacy settings', exact: true }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByRole('alertdialog', { name: 'Reset demo data?' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset data' }).click()

  await expect(page.getByRole('heading', { name: 'Privacy choices' })).toBeVisible()
  await expect(page.getByTestId('privacy-navbar-status')).toContainText('Choice required')
  await expect(page.locator('[data-clearrights-surface="travel-discovery"]'))
    .toHaveAttribute('data-clearrights-result', 'generic')
  await expect(page.locator('[data-clearrights-surface="nearby-guide"]')).toHaveCount(0)
  await expect(page.locator('[data-clearrights-surface="partner-offer"]')).toHaveCount(0)
})
