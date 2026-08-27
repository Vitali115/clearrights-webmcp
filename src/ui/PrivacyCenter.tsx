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
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AlertTriangle, ArrowLeft, ChevronDown } from 'lucide-react'
import { AgentActivityIndicator } from './AgentActivityIndicator'
import { HoldToConfirm } from './HoldToConfirm'

interface PrivacyCenterProps {
  controller: PrivacyController
  privacyUi: PrivacyViewCoordinator
  privacyView: PrivacyViewSnapshot
  snapshot: PrivacyControllerSnapshot
  webMcpAvailable: boolean
}

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
    description: 'Two facts, then apply. Only the settings listed below will change.',
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
    <SheetContent className="gap-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:w-[min(80vw,920px)] data-[side=right]:sm:max-w-none">
      <AgentActivityIndicator activity={privacyView.agentActivity} />
      <SheetHeader className="border-b border-foreground/10 px-5 py-5 pr-14 sm:px-8 sm:pr-40">
        <div className="flex items-start gap-3">
          {!settingsView && (
            <Button variant="ghost" size="icon-sm" className="mt-0.5 rounded-full" aria-label="Back" onClick={goBack}>
              <ArrowLeft />
            </Button>
          )}
          <div className="min-w-0">
            <SheetTitle className="sr-only">Privacy settings panel</SheetTitle>
            <h1 ref={viewHeadingRef} tabIndex={-1} className="font-heading text-[22px] font-medium tracking-tight text-foreground outline-none">{copy.title}</h1>
            <SheetDescription className="mt-1.5 font-medium">{copy.description}</SheetDescription>
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
        <main className="mx-auto w-full max-w-3xl space-y-8 p-5 sm:px-8 sm:py-7">
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

      <SheetFooter className="flex-row items-center justify-between gap-3 border-t border-foreground/10 bg-background px-5 py-2.5 sm:px-8">
        <p className="text-xs font-medium text-muted-foreground">
          {webMcpAvailable ? 'Agent access available' : 'Manual settings'} · Stored in this browser
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">Reset</Button>
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
    <div>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-muted-foreground">
        <p>
          {optionalEnabled} of {optional.length} optional settings on · Revision {snapshot.record.state.revision}
        </p>
        <Button variant="ghost" className="h-auto px-0 text-foreground" onClick={onHistory}>
          Previous changes ({snapshot.record.receipts.length})
        </Button>
      </div>

      <div aria-label="Privacy settings list">
        {travelCatalog.sections.map((section) => {
          const ids = travelCatalog.processing
            .filter(({ sectionId }) => sectionId === section.id)
            .map(({ id }) => id)
          return (
          <section key={section.id} className="mb-9" aria-labelledby={`settings-${section.id}`}>
            <h2 id={`settings-${section.id}`} className="text-[13px] font-medium text-muted-foreground">{section.label}</h2>
            <p className="mt-1 mb-1 text-[13px] text-muted-foreground">{section.description}</p>
            {ids.map((id) => {
              const definition = travelCatalog.getProcessing(id)
              const enabled = draftEnabled(definition, keepCapabilities, avoidUses)
              const changed = snapshot.record.state.processing[id] !== enabled
              return (
                <div
                  key={id}
                  data-testid={`setting-row-${id}`}
                  className="grid grid-cols-[1fr_auto] items-start gap-x-6 gap-y-2 border-t border-foreground/10 py-[18px]"
                >
                  <button
                    type="button"
                    className="min-w-0 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    aria-label={`Open ${definition.label} details`}
                    onClick={() => onInspect(id)}
                  >
                    <span className="block text-base font-medium tracking-tight">{definition.label}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{definition.purpose}</span>
                  </button>
                  <div className="flex flex-col items-end gap-1.5 pt-0.5">
                    {changed && (
                      <span className="text-xs font-medium">Will turn {enabled ? 'on' : 'off'}</span>
                    )}
                    {definition.locked ? (
                      <span className="text-xs font-medium text-muted-foreground">Required</span>
                    ) : (
                      <SettingSwitch label={definition.label} checked={enabled} onChange={(checked) => onChange(definition, checked)} />
                    )}
                  </div>
                </div>
              )
            })}
          </section>
          )
        })}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-4 flex items-center justify-between gap-3 bg-gradient-to-t from-background from-70% to-transparent px-5 pt-8 pb-1 sm:-mx-8 sm:px-8">
        <p className="text-sm font-medium">
          {changedCount ? `${changedCount} pending ${changedCount === 1 ? 'change' : 'changes'}` : 'No pending changes'}
        </p>
        <Button className="h-9 rounded-full px-5" disabled={changedCount === 0} onClick={onReview}>Review changes</Button>
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
      className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${checked ? 'bg-foreground' : 'bg-muted-foreground/25'}`}
      onClick={() => onChange(!checked)}
    >
      <span className={`absolute top-[3px] size-5 rounded-full bg-background transition-transform ${checked ? 'left-[22px]' : 'left-[3px]'}`} />
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
    <div>
      <div className="mb-8 grid grid-cols-[1fr_auto] items-start gap-6 border-b border-foreground/10 pb-6">
        <div>
          <p className="text-[1.35rem] font-medium tracking-tight">{definition.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{definition.purpose}</p>
        </div>
        {definition.locked
          ? <span className="text-xs font-medium text-muted-foreground">Required</span>
          : <SettingSwitch label={definition.label} checked={enabled} onChange={(checked) => onChange(definition, checked)} />}
      </div>
      {changed && (
        <p className="mb-6 text-sm font-medium">
          Pending change: this setting will turn {enabled ? 'on' : 'off'} after review and approval.
        </p>
      )}
      <div className="space-y-5">
        <Detail label="Current state" value={inspection.enabled ? 'On' : 'Off'} />
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
      </div>
      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        Waypoint declares this purpose and legal basis. This interface does not determine legal compliance.
      </p>
    </div>
  )
}

function HistoryView({ snapshot, onLatestReceipt }: { snapshot: PrivacyControllerSnapshot; onLatestReceipt(): void }) {
  return (
    <section aria-labelledby="receipt-history-heading">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h2 id="receipt-history-heading" className="font-heading text-base font-medium tracking-tight">Change history</h2>
          <p className="mt-1 text-sm text-muted-foreground">Up to ten receipts are kept in this browser.</p>
        </div>
        <p className="text-sm font-medium text-muted-foreground">Current revision {snapshot.record.state.revision}</p>
      </div>
      {snapshot.record.receipts.length === 0 ? (
        <div className="border-t border-foreground/10 py-8">
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
    <details className="group border-t border-foreground/10">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{formatDate(receipt.issuedAt)}</span>
          <span className="block truncate text-sm text-muted-foreground">{receipt.changes.length} changes · {receipt.id}</span>
        </span>
        {latest && <span className="text-xs font-medium">Latest</span>}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 pb-5">
        <ReceiptDetails receipt={receipt} />
        {latest && <Button variant="ghost" className="h-9 rounded-full px-5" onClick={onOpenLatest}>Open receipt</Button>}
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
      <div className="border-t border-foreground/10 py-8">
        <p className="font-medium">These settings changed after preparation.</p>
        <p className="mt-1 text-sm text-muted-foreground">Return to settings and prepare the current draft again.</p>
        <Button className="mt-5 h-9 rounded-full px-5" onClick={onEdit}>Return to settings</Button>
      </div>
    )
  }

  if (plan.isNoOp) {
    return (
      <div>
        <p className="text-[1.1rem] font-medium tracking-tight">You’re already set</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {plan.blockedItems.length
            ? 'All optional settings are already off. No changes need approval.'
            : 'The requested settings already match the current setup. There is nothing to approve or apply.'}
        </p>
        <div className="mt-6">
          <ApprovalStatus preparedByAgent={preparedByAgent} humanReviewed={false} approvalNeeded={false} />
        </div>
        <Button variant="ghost" className="mt-6 h-9 rounded-full px-5" onClick={onEdit}>Back to settings</Button>
        {plan.blockedItems.length > 0 && (
          <div className="mt-8">
            <RequiredSettingsSummary processingIds={plan.blockedItems.map(({ processingId }) => processingId)} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-4">
        <div>
          <p className="text-[1.1rem] font-medium tracking-tight">
            {plan.changes.length} {plan.changes.length === 1 ? 'change' : 'changes'} ready
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Only the settings listed below will change.</p>
        </div>
        <Button variant="ghost" className="h-9 shrink-0 rounded-full px-4" onClick={onEdit}>Edit settings</Button>
      </div>

      <ul>
        {plan.changes.map((change) => {
          const consequence = plan.consequences.find(({ processingId }) => processingId === change.processingId)
          return (
            <li key={change.processingId} className="border-t border-foreground/10 py-5">
              <p className="font-medium tracking-tight">{change.label}</p>
              <p className="mt-1.5 text-sm font-medium">
                {change.before ? 'On' : 'Off'} → {change.after ? 'On' : 'Off'}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{consequence?.message ?? change.reason}</p>
            </li>
          )
        })}
      </ul>

      {plan.conflicts.map((conflict) => (
        <Alert key={`${conflict.capabilityId}-${conflict.useId}`} variant="destructive" className="mt-4">
          <AlertTriangle />
          <AlertTitle>Conflicting request</AlertTitle>
          <AlertDescription>{conflict.message}</AlertDescription>
        </Alert>
      ))}
      {plan.blockedItems.length > 0 && (
        <div className="mt-4">
          <RequiredSettingsSummary processingIds={plan.blockedItems.map(({ processingId }) => processingId)} />
        </div>
      )}

      <div className="mt-8">
        <p className="mb-4 text-[13px] font-medium text-muted-foreground">Two stamps. Both stay on this review.</p>
        <ApprovalStatus preparedByAgent={preparedByAgent} humanReviewed={snapshot.workflow === 'reviewed'} approvalNeeded />
        <HoldToConfirm
          confirmed={snapshot.workflow === 'reviewed'}
          onConfirm={() => controller.setReviewed(true)}
          onRevoke={() => controller.setReviewed(false)}
        />
        <Button
          className="mt-6 h-9 w-full rounded-full"
          disabled={snapshot.workflow !== 'reviewed' || applying}
          onClick={onApply}
        >
          {applying ? 'Applying and verifying…' : snapshot.workflow === 'reviewed' ? 'Apply changes' : 'Human approval required'}
        </Button>
      </div>
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
    <div className="grid gap-4 overflow-visible sm:grid-cols-2" aria-label="Approval status">
      <Stamp
        title="Agent check"
        complete={preparedByAgent}
        status={preparedByAgent ? 'Change set prepared' : 'Manual change set'}
      >
        {preparedByAgent
          ? 'The page tool prepared this exact change set. It is a recorded preparation, not a signature.'
          : 'This change set was prepared in the page, not by the agent tool.'}
      </Stamp>
      <Stamp
        title="Human check"
        complete={humanReviewed || !approvalNeeded}
        status={humanReviewed ? 'Approved' : approvalNeeded ? 'Waiting for you' : 'Not needed'}
      >
        {humanReviewed
          ? 'A 1.2 second hold recorded that you reviewed this plan.'
          : approvalNeeded
            ? 'Hold for 1.2 seconds to record that you reviewed this plan. Early release does not confirm.'
            : 'Human approval is not needed for this plan.'}
      </Stamp>
    </div>
  )
}

function Stamp({
  title,
  complete,
  status,
  children,
}: {
  title: string
  complete: boolean
  status: string
  children: string
}) {
  return (
    <div className={`flex min-h-48 flex-col justify-between rounded-sm border p-4 ${complete ? 'border-foreground' : 'border-foreground/20'}`}>
      <p className="text-sm font-medium">{title}</p>
      <span
        className={`mx-auto size-14 rounded-full ${complete ? 'bg-foreground' : 'border-2 border-foreground/25'}`}
        aria-hidden="true"
      />
      <div>
        <p className={`text-sm font-medium ${complete ? 'text-foreground' : 'text-muted-foreground'}`}>{status}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

function RequiredSettingsSummary({ processingIds }: { processingIds: readonly ProcessingId[] }) {
  const uniqueIds = [...new Set(processingIds)]
  return (
    <details className="group border-t border-foreground/10">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{uniqueIds.length} essential {uniqueIds.length === 1 ? 'setting stays' : 'settings stay'} on</span>
          <span className="block text-sm text-muted-foreground">Required to deliver trips, account security, or service messages.</span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ul>
        {uniqueIds.map((processingId) => {
          const definition = travelCatalog.getProcessing(processingId)
          return (
            <li key={processingId} className="border-t border-foreground/10 py-4">
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
      <div className="border-t border-foreground/10 py-8">
        <p className="font-medium">No verified receipt yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Apply a human-reviewed change to create one.</p>
      </div>
    )
  }
  return (
    <div>
      <p className="text-sm font-medium">Verified</p>
      <p className="mt-2 text-[1.35rem] font-medium tracking-tight">Privacy settings applied</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The stored state was reread and matched the exact human-reviewed target.
      </p>
      <div className="mt-8">
        <ReceiptDetails receipt={receipt} />
      </div>
      <div className="mt-8 border-t border-foreground/10 pt-5 text-sm">
        <p className="font-medium">What verified means</p>
        <p className="mt-1 text-muted-foreground">Application readback matched the reviewed target. This is not a signature or legal proof.</p>
      </div>
      <Button className="mt-6 h-9 rounded-full px-5" onClick={onHome}>Return to privacy settings</Button>
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
      <div className="border-t border-foreground/10 pt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Applied changes</p>
        {receipt.changes.length ? (
          <ul className="space-y-2">
            {receipt.changes.map((change) => (
              <li key={change.processingId} className="flex items-center justify-between gap-3 border-t border-foreground/10 py-3">
                <span>{change.label}</span>
                <span className="text-sm font-medium">{change.before ? 'On' : 'Off'} → {change.after ? 'On' : 'Off'}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">No state changes were recorded.</p>}
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Final settings</p>
        <ul>
          {travelCatalog.processing.map((definition) => (
            <li key={definition.id} className="flex justify-between gap-3 border-t border-foreground/10 py-2 text-sm">
              <span>{definition.label}</span>
              <span className="font-medium text-muted-foreground">{receipt.finalState[definition.id] ? 'On' : 'Off'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
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
