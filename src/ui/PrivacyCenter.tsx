import { useEffect, useRef, useState } from 'react'
import type {
  PrivacyController,
  PrivacyControllerSnapshot,
  PrivacyView,
  PrivacyViewCoordinator,
  PrivacyViewSnapshot,
} from '@/application'
import type {
  CapabilityId,
  PrivacyReceipt,
  ProcessingDefinition,
  ProcessingId,
  UseId,
} from '@/domain'
import { travelCatalog } from '@/demo/travel-catalog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Clock3 } from 'lucide-react'
import { AgentActivityIndicator } from './AgentActivityIndicator'
import { HoldToConfirm } from './HoldToConfirm'

interface PrivacyCenterProps {
  controller: PrivacyController
  privacyUi: PrivacyViewCoordinator
  privacyView: PrivacyViewSnapshot
  snapshot: PrivacyControllerSnapshot
  webMcpAvailable: boolean
}

const SETTING_GROUPS: ReadonlyArray<{
  title: string
  description: string
  ids: readonly ProcessingId[]
}> = [
  {
    title: 'Essential services',
    description: 'Needed to provide booked trips and protect your account.',
    ids: ['trip_fulfilment', 'account_security', 'transactional_updates'],
  },
  {
    title: 'Personalisation',
    description: 'Controls experiences adapted to your interests.',
    ids: ['recommendations'],
  },
  {
    title: 'Location',
    description: 'Controls features that use your precise location.',
    ids: ['location_suggestions'],
  },
  {
    title: 'Partner offers',
    description: 'Controls tailored offers from selected partners.',
    ids: ['partner_advertising'],
  },
]

const VIEW_COPY: Record<PrivacyView, { title: string; description: string }> = {
  home: {
    title: 'Privacy settings',
    description: 'All data-use settings available for this site.',
  },
  current_setup: {
    title: 'Privacy settings',
    description: 'All data-use settings available for this site.',
  },
  activity: {
    title: 'Setting details',
    description: 'Purpose, data, dependencies, and effect of this setting.',
  },
  cleanup: {
    title: 'Privacy settings',
    description: 'All data-use settings available for this site.',
  },
  review: {
    title: 'Review changes',
    description: 'Check each effect before you approve and apply.',
  },
  history: {
    title: 'Previous changes',
    description: 'Verified changes stored in this browser, newest first.',
  },
  receipt: {
    title: 'Verified receipt',
    description: 'The applied settings matched the reviewed changes.',
  },
}

export function PrivacyCenter({
  controller,
  privacyUi,
  privacyView,
  snapshot,
  webMcpAvailable,
}: PrivacyCenterProps) {
  const [keepCapabilities, setKeepCapabilities] = useState<CapabilityId[]>(() =>
    snapshot.plan ? [...snapshot.plan.input.keepCapabilities] : activeCapabilities(snapshot))
  const [avoidUses, setAvoidUses] = useState<UseId[]>(() =>
    snapshot.plan ? [...snapshot.plan.input.avoidUses] : inactiveUses(snapshot))
  const [actionError, setActionError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const viewHeadingRef = useRef<HTMLHeadingElement>(null)
  const view = privacyView.navigation.view
  const copy = VIEW_COPY[view]
  const planMatchesIntent = snapshot.plan
    ? sameSelection(snapshot.plan.input.keepCapabilities, keepCapabilities)
      && sameSelection(snapshot.plan.input.avoidUses, avoidUses)
    : false

  useEffect(() => {
    viewHeadingRef.current?.focus()
  }, [view])

  const navigate = (next: PrivacyView, processingId?: ProcessingId) => {
    privacyUi.navigate({ view: next, processingId, origin: 'human' })
  }

  const goBack = () => {
    privacyUi.acknowledge()
    if (view === 'receipt') navigate('history')
    else navigate('home')
  }

  const updateProcessing = (definition: ProcessingDefinition, enabled: boolean) => {
    if (definition.locked) return
    privacyUi.revokeAgentPreparation()
    if (snapshot.workflow === 'reviewed') controller.setReviewed(false)
    setKeepCapabilities((current) => definition.capabilities.reduce(
      (next, id) => toggleValue(next, id, enabled),
      current,
    ))
    setAvoidUses((current) => definition.uses.reduce(
      (next, id) => toggleValue(next, id, !enabled),
      current,
    ))
  }

  const stagePlan = () => {
    setActionError(null)
    try {
      if (snapshot.plan && planMatchesIntent) {
        navigate('review')
        return
      }
      controller.stage({ keepCapabilities, avoidUses })
      navigate('review')
    } catch (error) {
      setActionError(errorMessage(error, 'The changes could not be prepared.'))
    }
  }

  const applyPlan = async () => {
    if (!snapshot.plan) return
    setApplying(true)
    setActionError(null)
    try {
      await controller.apply(snapshot.plan.id)
      navigate('receipt')
    } catch (error) {
      setActionError(errorMessage(error, 'The reviewed changes could not be applied.'))
    } finally {
      setApplying(false)
    }
  }

  const resetDemo = async () => {
    setActionError(null)
    try {
      await controller.resetDemo(true)
      privacyUi.revokeAgentPreparation()
      setKeepCapabilities(activeCapabilities(controller.getSnapshot()))
      setAvoidUses([])
      navigate('home')
    } catch (error) {
      setActionError(errorMessage(error, 'Demo data could not be reset.'))
    }
  }

  const settingsView = view === 'home' || view === 'current_setup' || view === 'cleanup'
  const preparedByAgent = Boolean(
    snapshot.plan && privacyView.agentPreparation?.planId === snapshot.plan.id,
  )

  return (
    <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[min(80vw,920px)] data-[side=right]:sm:max-w-none">
      <AgentActivityIndicator activity={privacyView.agentActivity} />
      <SheetHeader className="min-h-[104px] border-b px-5 py-4 pr-14 sm:px-8 sm:pr-40">
        <div className="flex items-start gap-3">
          {!settingsView && (
            <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={goBack}>
              <ArrowLeft />
            </Button>
          )}
          <div className="min-w-0">
            <SheetTitle className="sr-only">Privacy settings panel</SheetTitle>
            <h1 ref={viewHeadingRef} tabIndex={-1} className="font-heading text-xl font-medium text-foreground outline-none">{copy.title}</h1>
            <SheetDescription>{copy.description}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <ScrollArea
        data-testid="privacy-view-content"
        className="h-[calc(100svh-158px)]"
        onClickCapture={() => privacyUi.acknowledge()}
        onKeyDownCapture={() => privacyUi.acknowledge()}
        onScrollCapture={() => privacyUi.acknowledge()}
      >
        <main className="mx-auto w-full max-w-3xl space-y-6 p-5 sm:p-8">
          {settingsView && (
            <SettingsView
              snapshot={snapshot}
              keepCapabilities={keepCapabilities}
              avoidUses={avoidUses}
              onChange={updateProcessing}
              onInspect={(processingId) => navigate('activity', processingId)}
              onHistory={() => navigate('history')}
              onReview={stagePlan}
            />
          )}
          {view === 'activity' && (
            <ActivityDetailView
              controller={controller}
              snapshot={snapshot}
              processingId={privacyView.navigation.processingId ?? 'trip_fulfilment'}
              keepCapabilities={keepCapabilities}
              avoidUses={avoidUses}
              onChange={updateProcessing}
            />
          )}
          {view === 'history' && (
            <HistoryView snapshot={snapshot} onLatestReceipt={() => navigate('receipt')} />
          )}
          {view === 'review' && (
            <ReviewView
              controller={controller}
              snapshot={snapshot}
              planMatchesIntent={planMatchesIntent}
              preparedByAgent={preparedByAgent}
              applying={applying}
              onEdit={() => navigate('home')}
              onApply={() => void applyPlan()}
            />
          )}
          {view === 'receipt' && (
            <ReceiptView receipt={snapshot.record.receipts[0] ?? null} onHome={() => navigate('home')} />
          )}
          {actionError && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Action could not be completed</AlertTitle>
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}
        </main>
      </ScrollArea>

      <SheetFooter className="flex-row items-center justify-between gap-3 border-t bg-background px-5 py-2.5 sm:px-8">
        <p className="text-xs text-muted-foreground">
          {webMcpAvailable ? 'Agent access available' : 'Manual settings'} · Stored in this browser
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm">Reset</Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                This restores all optional settings and permanently deletes the full change history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => void resetDemo()}>Reset data</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetFooter>
    </SheetContent>
  )
}

function SettingsView({
  snapshot,
  keepCapabilities,
  avoidUses,
  onChange,
  onInspect,
  onHistory,
  onReview,
}: {
  snapshot: PrivacyControllerSnapshot
  keepCapabilities: readonly CapabilityId[]
  avoidUses: readonly UseId[]
  onChange(definition: ProcessingDefinition, enabled: boolean): void
  onInspect(id: ProcessingId): void
  onHistory(): void
  onReview(): void
}) {
  const optional = travelCatalog.processing.filter(({ locked }) => !locked)
  const optionalEnabled = optional.filter((definition) =>
    draftEnabled(definition, keepCapabilities, avoidUses)).length
  const changedCount = travelCatalog.processing.filter((definition) =>
    snapshot.record.state.processing[definition.id]
      !== draftEnabled(definition, keepCapabilities, avoidUses)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 text-sm">
        <p className="text-muted-foreground">
          {optionalEnabled} of {optional.length} optional settings on · Revision {snapshot.record.state.revision}
        </p>
        <Button variant="link" className="h-auto px-0" onClick={onHistory}>
          Previous changes ({snapshot.record.receipts.length})
        </Button>
      </div>

      <div className="space-y-5" aria-label="Privacy settings list">
        {SETTING_GROUPS.map(({ title, description, ids }) => (
          <section key={title} className="overflow-hidden rounded-xl border bg-card" aria-labelledby={`settings-${ids[0]}`}>
            <div className="border-b bg-muted/25 px-4 py-3">
              <h2 id={`settings-${ids[0]}`} className="font-heading text-sm font-semibold">{title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="divide-y">
              {ids.map((id) => {
                const definition = travelCatalog.getProcessing(id)
                const enabled = draftEnabled(definition, keepCapabilities, avoidUses)
                const changed = snapshot.record.state.processing[id] !== enabled
                return (
                  <div
                    key={id}
                    data-testid={`setting-row-${id}`}
                    className={changed ? 'flex items-center gap-3 bg-blue-50/60 px-4 py-3 dark:bg-blue-950/20' : 'flex items-center gap-3 px-4 py-3'}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      aria-label={`Open ${definition.label} details`}
                      onClick={() => onInspect(id)}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{definition.label}</span>
                        {changed && <Badge variant="secondary">Will turn {enabled ? 'on' : 'off'}</Badge>}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{definition.purpose}</span>
                    </button>
                    {definition.locked ? (
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">Required</span>
                    ) : (
                      <SettingSwitch label={definition.label} checked={enabled} onChange={(checked) => onChange(definition, checked)} />
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur">
        <p className="text-sm font-medium">
          {changedCount ? `${changedCount} pending ${changedCount === 1 ? 'change' : 'changes'}` : 'No pending changes'}
        </p>
        <Button disabled={changedCount === 0} onClick={onReview}>Review changes</Button>
      </div>
    </div>
  )
}

function SettingSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange(checked: boolean): void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${checked ? 'border-primary bg-primary' : 'border-input bg-muted'}`}
      onClick={() => onChange(!checked)}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-background shadow-sm transition-transform ${checked ? 'left-5' : 'left-1'}`} />
    </button>
  )
}

function ActivityDetailView({
  controller,
  snapshot,
  processingId,
  keepCapabilities,
  avoidUses,
  onChange,
}: {
  controller: PrivacyController
  snapshot: PrivacyControllerSnapshot
  processingId: ProcessingId
  keepCapabilities: readonly CapabilityId[]
  avoidUses: readonly UseId[]
  onChange(definition: ProcessingDefinition, enabled: boolean): void
}) {
  const inspection = controller.inspect(processingId)
  const { definition } = inspection
  const enabled = draftEnabled(definition, keepCapabilities, avoidUses)
  const changed = snapshot.record.state.processing[processingId] !== enabled

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{definition.label}</CardTitle>
          <CardDescription>{definition.purpose}</CardDescription>
          <CardAction>
            {definition.locked
              ? <Badge variant="outline">Required</Badge>
              : <SettingSwitch label={definition.label} checked={enabled} onChange={(checked) => onChange(definition, checked)} />}
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-5">
          {changed && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
              Pending change: this setting will turn {enabled ? 'on' : 'off'} after review and approval.
            </div>
          )}
          <Detail label="Current state" value={inspection.enabled ? 'On' : 'Off'} />
          <Separator />
          <Detail label="Data used" value={definition.data.join(', ')} />
          <Detail label="Declared legal basis" value={basisLabel(definition.declaredLegalBasis)} />
          <Detail label="Control" value={definition.control} />
          <Detail
            label="Dependencies"
            value={definition.dependencies.length
              ? definition.dependencies.map((id) => travelCatalog.getProcessing(id).label).join(', ')
              : 'None'}
          />
          <Detail label="If turned off" value={definition.consequence} />
          <Detail label="Privacy notice reference" value={definition.policyReference} />
        </CardContent>
      </Card>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Waypoint declares this purpose and legal basis. This interface does not determine legal compliance.
      </p>
    </div>
  )
}

function HistoryView({ snapshot, onLatestReceipt }: { snapshot: PrivacyControllerSnapshot; onLatestReceipt(): void }) {
  return (
    <section className="space-y-3" aria-labelledby="receipt-history-heading">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="receipt-history-heading" className="font-heading text-lg font-semibold">Change history</h2>
          <p className="text-sm text-muted-foreground">Up to ten receipts are kept in this browser.</p>
        </div>
        <Badge variant="outline">Current revision {snapshot.record.state.revision}</Badge>
      </div>
      {snapshot.record.receipts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No previous changes</p>
          <p className="mt-1 text-sm text-muted-foreground">Applied changes will appear here.</p>
        </div>
      ) : snapshot.record.receipts.map((receipt, index) => (
        <ReceiptHistoryItem key={receipt.id} receipt={receipt} latest={index === 0} onOpenLatest={onLatestReceipt} />
      ))}
    </section>
  )
}

function ReceiptHistoryItem({
  receipt,
  latest,
  onOpenLatest,
}: {
  receipt: PrivacyReceipt
  latest: boolean
  onOpenLatest(): void
}) {
  return (
    <details className="group rounded-xl border bg-card open:ring-1 open:ring-primary/10">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{formatDate(receipt.issuedAt)}</span>
          <span className="block truncate text-sm text-muted-foreground">{receipt.changes.length} changes · {receipt.id}</span>
        </span>
        {latest && <Badge variant="secondary">Latest</Badge>}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t p-4">
        <ReceiptDetails receipt={receipt} />
        {latest && <Button variant="outline" onClick={onOpenLatest}>Open receipt</Button>}
      </div>
    </details>
  )
}

function ReviewView({
  controller,
  snapshot,
  planMatchesIntent,
  preparedByAgent,
  applying,
  onEdit,
  onApply,
}: {
  controller: PrivacyController
  snapshot: PrivacyControllerSnapshot
  planMatchesIntent: boolean
  preparedByAgent: boolean
  applying: boolean
  onEdit(): void
  onApply(): void
}) {
  const plan = snapshot.plan
  if (!plan || !planMatchesIntent) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="font-medium">These settings changed after preparation.</p>
        <p className="mt-1 text-sm text-muted-foreground">Return to settings and prepare the current draft again.</p>
        <Button className="mt-4" onClick={onEdit}>Return to settings</Button>
      </div>
    )
  }

  if (plan.isNoOp) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>You’re already set</CardTitle>
            <CardDescription>
              {plan.blockedItems.length
                ? 'All optional settings are already off. No changes need approval.'
                : 'The requested settings already match the current setup. There is nothing to approve or apply.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ApprovalStatus preparedByAgent={preparedByAgent} humanReviewed={false} approvalNeeded={false} />
            <Button variant="outline" onClick={onEdit}>Back to settings</Button>
          </CardContent>
        </Card>
        {plan.blockedItems.length > 0 && (
          <RequiredSettingsSummary processingIds={plan.blockedItems.map(({ processingId }) => processingId)} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{plan.changes.length} {plan.changes.length === 1 ? 'change' : 'changes'} ready</CardTitle>
          <CardDescription>Only the settings listed below will change.</CardDescription>
          <CardAction><Button variant="outline" size="sm" onClick={onEdit}>Edit settings</Button></CardAction>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-lg border">
            {plan.changes.map((change) => {
              const consequence = plan.consequences.find(({ processingId }) => processingId === change.processingId)
              return (
                <li key={change.processingId} className="border-l-4 border-l-blue-600 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{change.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{consequence?.message ?? change.reason}</p>
                    </div>
                    <Badge variant={change.after ? 'secondary' : 'outline'}>
                      {change.before ? 'On' : 'Off'} → {change.after ? 'On' : 'Off'}
                    </Badge>
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      {plan.conflicts.map((conflict) => (
        <Alert key={`${conflict.capabilityId}-${conflict.useId}`} variant="destructive">
          <AlertTriangle />
          <AlertTitle>Conflicting request</AlertTitle>
          <AlertDescription>{conflict.message}</AlertDescription>
        </Alert>
      ))}
      {plan.blockedItems.length > 0 && (
        <RequiredSettingsSummary processingIds={plan.blockedItems.map(({ processingId }) => processingId)} />
      )}

      <Card className="ring-2 ring-primary/10">
        <CardHeader>
          <CardTitle>Approval</CardTitle>
          <CardDescription>Agent preparation and human approval are separate and both remain visible.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ApprovalStatus preparedByAgent={preparedByAgent} humanReviewed={snapshot.workflow === 'reviewed'} approvalNeeded />
          <HoldToConfirm
            confirmed={snapshot.workflow === 'reviewed'}
            onConfirm={() => controller.setReviewed(true)}
            onRevoke={() => controller.setReviewed(false)}
          />
          <Button className="w-full" size="lg" disabled={snapshot.workflow !== 'reviewed' || applying} onClick={onApply}>
            {applying ? 'Applying and verifying…' : snapshot.workflow === 'reviewed' ? 'Apply changes' : 'Human approval required'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ApprovalStatus({
  preparedByAgent,
  humanReviewed,
  approvalNeeded,
}: {
  preparedByAgent: boolean
  humanReviewed: boolean
  approvalNeeded: boolean
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" aria-label="Approval status">
      <div className={preparedByAgent ? 'flex items-center gap-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20' : 'flex items-center gap-3 rounded-lg bg-muted/50 p-3'}>
        <StatusMark complete={preparedByAgent} />
        <div>
          <p className="text-sm font-medium">Agent check</p>
          <p className="text-xs text-muted-foreground">{preparedByAgent ? 'Change set prepared' : 'Manual change set'}</p>
        </div>
      </div>
      <div className={humanReviewed ? 'flex items-center gap-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20' : 'flex items-center gap-3 rounded-lg bg-muted/50 p-3'}>
        <StatusMark complete={humanReviewed || !approvalNeeded} />
        <div>
          <p className="text-sm font-medium">Human check</p>
          <p className="text-xs text-muted-foreground">{humanReviewed ? 'Approved' : approvalNeeded ? 'Waiting for you' : 'Not needed'}</p>
        </div>
      </div>
    </div>
  )
}

function StatusMark({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white" aria-hidden="true">
      <Check className="size-4" />
    </span>
  ) : <span className="size-6 shrink-0 rounded-full border-2 border-muted-foreground/35" aria-hidden="true" />
}

function RequiredSettingsSummary({ processingIds }: { processingIds: readonly ProcessingId[] }) {
  const uniqueIds = [...new Set(processingIds)]
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{uniqueIds.length} essential {uniqueIds.length === 1 ? 'setting stays' : 'settings stay'} on</span>
          <span className="block text-sm text-muted-foreground">Required to deliver trips, account security, or service messages.</span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ul className="divide-y border-t">
        {uniqueIds.map((processingId) => {
          const definition = travelCatalog.getProcessing(processingId)
          return (
            <li key={processingId} className="p-4">
              <p className="font-medium">{definition.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{definition.purpose}</p>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

function ReceiptView({ receipt, onHome }: { receipt: PrivacyReceipt | null; onHome(): void }) {
  if (!receipt) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <Clock3 className="mx-auto mb-3 size-6 text-muted-foreground" />
        <p className="font-medium">No verified receipt yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Apply a human-reviewed change to create one.</p>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <Card className="ring-2 ring-emerald-600/15">
        <CardHeader>
          <Badge variant="secondary" className="mb-2 w-fit"><Check data-icon="inline-start" /> Verified</Badge>
          <CardTitle className="text-xl">Privacy settings applied</CardTitle>
          <CardDescription>The stored state was reread and matched the exact human-reviewed target.</CardDescription>
        </CardHeader>
        <CardContent><ReceiptDetails receipt={receipt} /></CardContent>
      </Card>
      <div className="rounded-lg border p-4 text-sm">
        <p className="font-medium">What verified means</p>
        <p className="mt-1 text-muted-foreground">Application readback matched the reviewed target. This is not a signature or legal proof.</p>
      </div>
      <Button onClick={onHome}>Return to privacy settings</Button>
    </div>
  )
}

function ReceiptDetails({ receipt }: { receipt: PrivacyReceipt }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <Detail label="Receipt" value={receipt.id} />
        <Detail label="Plan" value={receipt.planId} />
        <Detail label="Revision" value={`${receipt.beforeRevision} → ${receipt.afterRevision}`} />
        <Detail label="Applied" value={formatDate(receipt.issuedAt)} />
        <Detail label="Human review recorded" value={formatDate(receipt.reviewedAt)} />
        <Detail label="Verification" value={`Readback revision ${receipt.verification.observedRevision}`} />
      </div>
      <Separator />
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Applied changes</p>
        {receipt.changes.length ? (
          <ul className="space-y-2">
            {receipt.changes.map((change) => (
              <li key={change.processingId} className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 p-3">
                <span>{change.label}</span>
                <Badge variant={change.after ? 'secondary' : 'outline'}>{change.before ? 'On' : 'Off'} → {change.after ? 'On' : 'Off'}</Badge>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">No state changes were recorded.</p>}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Final settings</p>
        <div className="flex flex-wrap gap-2">
          {travelCatalog.processing.map((definition) => (
            <Badge key={definition.id} variant={receipt.finalState[definition.id] ? 'secondary' : 'outline'}>
              {definition.label}: {receipt.finalState[definition.id] ? 'On' : 'Off'}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function draftEnabled(
  definition: ProcessingDefinition,
  keepCapabilities: readonly CapabilityId[],
  avoidUses: readonly UseId[],
) {
  if (definition.locked) return true
  return definition.capabilities.every((id) => keepCapabilities.includes(id))
    && definition.uses.every((id) => !avoidUses.includes(id))
}

function toggleValue<T extends string>(current: readonly T[], value: T, checked: boolean): T[] {
  if (checked) return current.includes(value) ? [...current] : [...current, value]
  return current.filter((item) => item !== value)
}

function sameSelection<T extends string>(left: readonly T[], right: readonly T[]) {
  return left.length === right.length && left.every((value) => right.includes(value))
}

function activeCapabilities(snapshot: PrivacyControllerSnapshot): CapabilityId[] {
  return travelCatalog.capabilities
    .filter((capability) => travelCatalog.processing.some((processing) =>
      processing.capabilities.includes(capability.id)
      && snapshot.record.state.processing[processing.id]))
    .map(({ id }) => id)
}

function inactiveUses(snapshot: PrivacyControllerSnapshot): UseId[] {
  return travelCatalog.uses
    .filter((use) => travelCatalog.processing.some((processing) =>
      processing.uses.includes(use.id)
      && !snapshot.record.state.processing[processing.id]))
    .map(({ id }) => id)
}

function basisLabel(basis: 'contract' | 'legitimate_interest' | 'consent') {
  if (basis === 'legitimate_interest') return 'Legitimate interest'
  return basis[0].toUpperCase() + basis.slice(1)
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
