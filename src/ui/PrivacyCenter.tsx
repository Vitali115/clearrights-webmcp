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
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleMinus,
  Clock3,
  FileCheck2,
  History,
  Info,
  LockKeyhole,
  MapPin,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { AgentActivityIndicator } from './AgentActivityIndicator'

interface PrivacyCenterProps {
  controller: PrivacyController
  privacyUi: PrivacyViewCoordinator
  privacyView: PrivacyViewSnapshot
  snapshot: PrivacyControllerSnapshot
  webMcpAvailable: boolean
}

const SETUP_GROUPS: ReadonlyArray<{
  title: string
  description: string
  icon: typeof ShieldCheck
  ids: readonly ProcessingId[]
}> = [
  {
    title: 'Essential trip services',
    description: 'Booking, account protection, and essential trip messages.',
    icon: ShieldCheck,
    ids: ['trip_fulfilment', 'account_security', 'transactional_updates'],
  },
  {
    title: 'Personalisation',
    description: 'Destination and itinerary recommendations.',
    icon: Sparkles,
    ids: ['recommendations'],
  },
  {
    title: 'Location',
    description: 'Nearby suggestions during a trip.',
    icon: MapPin,
    ids: ['location_suggestions'],
  },
  {
    title: 'Partner offers',
    description: 'Offers tailored by selected travel partners.',
    icon: SlidersHorizontal,
    ids: ['partner_advertising'],
  },
]

const VIEW_COPY: Record<PrivacyView, { title: string; description: string }> = {
  home: {
    title: 'Privacy Center',
    description: 'Understand and adjust how Waypoint uses data in this travel demo.',
  },
  current_setup: {
    title: 'Current privacy setup',
    description: 'Review every active and inactive processing activity.',
  },
  activity: {
    title: 'Activity details',
    description: 'See the service-declared purpose, data, dependencies, and effect.',
  },
  cleanup: {
    title: 'Privacy cleanup',
    description: 'Choose the optional experiences you want to keep.',
  },
  review: {
    title: 'Review your changes',
    description: 'Understand every consequence before providing human approval.',
  },
  history: {
    title: 'Previous changes',
    description: 'Inspect up to ten verified privacy receipts, newest first.',
  },
  receipt: {
    title: 'Verified receipt',
    description: 'Confirm what was applied after persisted-state readback.',
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
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const viewHeadingRef = useRef<HTMLHeadingElement>(null)
  const activityReturnView = useRef<'current_setup' | 'cleanup'>('current_setup')
  const view = privacyView.navigation.view
  const copy = VIEW_COPY[view]
  const planMatchesIntent = snapshot.plan
    ? sameSelection(snapshot.plan.input.keepCapabilities, keepCapabilities)
      && sameSelection(snapshot.plan.input.avoidUses, avoidUses)
    : false

  useEffect(() => {
    if (view === 'activity' && privacyView.navigation.origin === 'agent') {
      activityReturnView.current = 'current_setup'
    }
    viewHeadingRef.current?.focus()
  }, [privacyView.navigation.origin, view])

  const navigate = (next: PrivacyView, processingId?: ProcessingId) => {
    privacyUi.navigate({ view: next, processingId, origin: 'human' })
  }

  const goBack = () => {
    privacyUi.acknowledge()
    if (view === 'activity') navigate(activityReturnView.current)
    else if (view === 'review') navigate('cleanup')
    else if (view === 'receipt') navigate('history')
    else navigate('home')
  }

  const inspectActivity = (processingId: ProcessingId, returnView: 'current_setup' | 'cleanup') => {
    activityReturnView.current = returnView
    navigate('activity', processingId)
  }

  const updateProcessing = (definition: ProcessingDefinition, enabled: boolean) => {
    if (definition.locked) return
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
      controller.stage({ keepCapabilities, avoidUses })
      navigate('review')
    } catch (error) {
      setActionError(errorMessage(error, 'The plan could not be prepared.'))
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
      setActionError(errorMessage(error, 'The reviewed plan could not be applied.'))
    } finally {
      setApplying(false)
    }
  }

  const resetDemo = async () => {
    setActionError(null)
    try {
      await controller.resetDemo(true)
      setKeepCapabilities(activeCapabilities(controller.getSnapshot()))
      setAvoidUses([])
      navigate('home')
    } catch (error) {
      setActionError(errorMessage(error, 'Demo data could not be reset.'))
    }
  }

  return (
    <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[min(80vw,920px)] data-[side=right]:sm:max-w-none">
      <AgentActivityIndicator activity={privacyView.agentActivity} />
      <SheetHeader className="min-h-[132px] border-b px-5 py-5 pr-14 sm:px-8 sm:pr-52">
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <Badge variant="secondary"><ShieldCheck data-icon="inline-start" /> ClearRights</Badge>
          <Badge variant="outline">
            <Bot data-icon="inline-start" /> {webMcpAvailable ? 'Agent tools ready' : 'Manual mode'}
          </Badge>
        </div>
        <div className="mt-2 flex items-start gap-3">
          {view !== 'home' && (
            <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={goBack}>
              <ArrowLeft />
            </Button>
          )}
          <div className="min-w-0">
            <SheetTitle className="sr-only">Privacy Center</SheetTitle>
            <h1 ref={viewHeadingRef} tabIndex={-1} className="font-heading text-xl font-medium text-foreground outline-none">{copy.title}</h1>
            <SheetDescription>{copy.description}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <ScrollArea
        data-testid="privacy-view-content"
        className="h-[calc(100svh-190px)]"
        onClickCapture={() => privacyUi.acknowledge()}
        onKeyDownCapture={() => privacyUi.acknowledge()}
        onScrollCapture={() => privacyUi.acknowledge()}
      >
        <main className="mx-auto w-full max-w-3xl space-y-6 p-5 sm:p-8">
          {view === 'home' && (
            <HomeView
              receiptCount={snapshot.record.receipts.length}
              showHowItWorks={showHowItWorks}
              onToggleHowItWorks={() => setShowHowItWorks((current) => !current)}
              onNavigate={navigate}
            />
          )}
          {view === 'current_setup' && (
            <CurrentSetupView snapshot={snapshot} onInspect={(id) => inspectActivity(id, 'current_setup')} />
          )}
          {view === 'activity' && (
            <ActivityDetailView
              controller={controller}
              processingId={privacyView.navigation.processingId ?? 'trip_fulfilment'}
            />
          )}
          {view === 'history' && (
            <HistoryView
              snapshot={snapshot}
              onCurrentSetup={() => navigate('current_setup')}
              onLatestReceipt={() => navigate('receipt')}
            />
          )}
          {view === 'cleanup' && (
            <CleanupView
              snapshot={snapshot}
              keepCapabilities={keepCapabilities}
              avoidUses={avoidUses}
              onChange={updateProcessing}
              onInspect={(id) => inspectActivity(id, 'cleanup')}
              onReview={stagePlan}
            />
          )}
          {view === 'review' && (
            <ReviewView
              controller={controller}
              snapshot={snapshot}
              planMatchesIntent={planMatchesIntent}
              applying={applying}
              onEdit={() => navigate('cleanup')}
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

      <SheetFooter className="flex-row items-center justify-between gap-3 border-t bg-background px-5 py-3 sm:px-8">
        <p className="max-w-xl text-xs text-muted-foreground">
          Service-declared demo information. ClearRights does not provide legal advice or determine compliance.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm"><RotateCcw data-icon="inline-start" /> <span className="hidden sm:inline">Reset demo data</span></Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                This restores all optional processing, clears the workflow, and permanently deletes the full receipt history.
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

function HomeView({
  receiptCount,
  showHowItWorks,
  onToggleHowItWorks,
  onNavigate,
}: {
  receiptCount: number
  showHowItWorks: boolean
  onToggleHowItWorks(): void
  onNavigate(view: PrivacyView): void
}) {
  return (
    <>
      <Card className="border-0 bg-slate-950 text-white ring-0">
        <CardHeader className="gap-3 sm:p-6">
          <Badge className="w-fit border-white/15 bg-white/10 text-white">Guided privacy</Badge>
          <CardTitle className="max-w-xl text-2xl">A calmer way to check your travel privacy setup.</CardTitle>
          <CardDescription className="max-w-xl text-slate-300">
            Walk through optional uses, see what each change affects, and approve only after a clear final review.
          </CardDescription>
        </CardHeader>
        <CardContent className="sm:px-6">
          <Button variant="secondary" size="lg" onClick={() => onNavigate('cleanup')}>
            Start privacy cleanup <ArrowRight data-icon="inline-end" />
          </Button>
        </CardContent>
      </Card>

      <nav aria-label="Privacy Center sections" className="grid gap-3">
        <NavigationCard
          icon={SlidersHorizontal}
          title="Current privacy setup"
          description="See what is on, what is off, and what Waypoint says each activity does."
          onClick={() => onNavigate('current_setup')}
        />
        <NavigationCard
          icon={History}
          title="Previous changes"
          description={receiptCount ? `${receiptCount} verified ${receiptCount === 1 ? 'receipt' : 'receipts'} available.` : 'No verified changes yet.'}
          onClick={() => onNavigate('history')}
        />
        <NavigationCard
          icon={Info}
          title="How ClearRights works"
          description="Understand planning, human approval, and verification."
          expanded={showHowItWorks}
          onClick={onToggleHowItWorks}
        />
      </nav>

      {showHowItWorks && (
        <Card>
          <CardHeader>
            <CardTitle>Agent-guided, human-approved</CardTitle>
            <CardDescription>ClearRights separates preparation from approval.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <NumberedStep number="1" title="Inspect" description="Read service-declared processing and current states." />
            <NumberedStep number="2" title="Review" description="See changes, conflicts, blocked items, and consequences." />
            <NumberedStep number="3" title="Approve" description="A person confirms before apply; readback creates the receipt." />
          </CardContent>
        </Card>
      )}
    </>
  )
}

function NavigationCard({
  icon: Icon,
  title,
  description,
  expanded,
  onClick,
}: {
  icon: typeof ShieldCheck
  title: string
  description: string
  expanded?: boolean
  onClick(): void
}) {
  return (
    <Button
      variant="outline"
      className="h-auto w-full justify-start gap-4 whitespace-normal rounded-xl p-4 text-left"
      aria-expanded={expanded}
      onClick={onClick}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted"><Icon className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm font-normal text-muted-foreground">{description}</span>
      </span>
      {expanded === undefined ? <ArrowRight className="text-muted-foreground" /> : <ChevronDown className={expanded ? 'rotate-180 text-muted-foreground' : 'text-muted-foreground'} />}
    </Button>
  )
}

function CurrentSetupView({
  snapshot,
  onInspect,
}: {
  snapshot: PrivacyControllerSnapshot
  onInspect(id: ProcessingId): void
}) {
  return (
    <div className="space-y-6">
      <CurrentSetupSummary snapshot={snapshot} />
      {SETUP_GROUPS.map(({ title, description, icon: Icon, ids }) => (
        <section key={title} className="space-y-3" aria-labelledby={`setup-${ids[0]}`}>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"><Icon className="size-4" /></span>
            <div>
              <h2 id={`setup-${ids[0]}`} className="font-heading text-base font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="grid gap-2 pl-0 sm:pl-12">
            {ids.map((id) => {
              const definition = travelCatalog.getProcessing(id)
              const enabled = snapshot.record.state.processing[id]
              return (
                <Button
                  key={id}
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal p-3 text-left"
                  onClick={() => onInspect(id)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{definition.label}</span>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      Declared basis: {basisLabel(definition.declaredLegalBasis)}
                    </span>
                  </span>
                  <Badge variant={enabled ? 'secondary' : 'outline'}>
                    {definition.locked && <LockKeyhole data-icon="inline-start" />}
                    {enabled ? 'On' : 'Off'}
                  </Badge>
                  <ArrowRight className="text-muted-foreground" />
                </Button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function CurrentSetupSummary({ snapshot }: { snapshot: PrivacyControllerSnapshot }) {
  const optional = travelCatalog.processing.filter(({ locked }) => !locked)
  const enabled = optional.filter(({ id }) => snapshot.record.state.processing[id]).length
  return (
    <Card className="bg-muted/40">
      <CardHeader>
        <CardTitle>Current setup</CardTitle>
        <CardDescription>This is your active preference state, separate from previous change receipts.</CardDescription>
        <CardAction><Badge variant="outline">Revision {snapshot.record.state.revision}</Badge></CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge variant="secondary">3 essential services on</Badge>
        <Badge variant="outline">{enabled} of {optional.length} optional experiences on</Badge>
      </CardContent>
    </Card>
  )
}

function ActivityDetailView({
  controller,
  processingId,
}: {
  controller: PrivacyController
  processingId: ProcessingId
}) {
  const inspection = controller.inspect(processingId)
  const { definition } = inspection
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{definition.label}</CardTitle>
          <CardDescription>{definition.purpose}</CardDescription>
          <CardAction>
            <Badge variant={inspection.enabled ? 'secondary' : 'outline'}>
              {definition.locked && <LockKeyhole data-icon="inline-start" />}
              {inspection.enabled ? 'On' : 'Off'}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-5">
          <Detail label="Data used" value={definition.data.join(', ')} />
          <Separator />
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
      <Alert>
        <Info />
        <AlertTitle>Service-declared information</AlertTitle>
        <AlertDescription>
          ClearRights displays the purpose and legal basis declared by Waypoint; it does not independently determine legal compliance.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function HistoryView({
  snapshot,
  onCurrentSetup,
  onLatestReceipt,
}: {
  snapshot: PrivacyControllerSnapshot
  onCurrentSetup(): void
  onLatestReceipt(): void
}) {
  return (
    <div className="space-y-6">
      <Button variant="outline" className="h-auto w-full justify-start gap-3 p-4 text-left" onClick={onCurrentSetup}>
        <SlidersHorizontal className="size-5" />
        <span className="flex-1">
          <span className="block font-medium">Current privacy setup</span>
          <span className="block text-sm font-normal text-muted-foreground">View the configuration active now at revision {snapshot.record.state.revision}.</span>
        </span>
        <ArrowRight />
      </Button>
      <section className="space-y-3" aria-labelledby="receipt-history-heading">
        <div>
          <h2 id="receipt-history-heading" className="font-heading text-lg font-semibold">Previous changes</h2>
          <p className="text-sm text-muted-foreground">Verified receipts are retained newest-first, up to ten.</p>
        </div>
        {snapshot.record.receipts.length === 0 ? (
          <Card className="border-dashed bg-muted/20 py-10 text-center">
            <CardContent>
              <Clock3 className="mx-auto mb-3 size-6 text-muted-foreground" />
              <p className="font-medium">No previous changes</p>
              <p className="mt-1 text-sm text-muted-foreground">Your first applied cleanup will appear here.</p>
            </CardContent>
          </Card>
        ) : snapshot.record.receipts.map((receipt, index) => (
          <ReceiptHistoryItem
            key={receipt.id}
            receipt={receipt}
            latest={index === 0}
            onOpenLatest={onLatestReceipt}
          />
        ))}
      </section>
    </div>
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
        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{formatDate(receipt.issuedAt)}</span>
          <span className="block truncate text-sm text-muted-foreground">{receipt.changes.length} changes · {receipt.id}</span>
        </span>
        {latest && <Badge variant="secondary">Latest</Badge>}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t p-4">
        <ReceiptDetails receipt={receipt} />
        {latest && <Button variant="outline" onClick={onOpenLatest}>Open receipt <ArrowRight data-icon="inline-end" /></Button>}
      </div>
    </details>
  )
}

function CleanupView({
  snapshot,
  keepCapabilities,
  avoidUses,
  onChange,
  onInspect,
  onReview,
}: {
  snapshot: PrivacyControllerSnapshot
  keepCapabilities: readonly CapabilityId[]
  avoidUses: readonly UseId[]
  onChange(definition: ProcessingDefinition, enabled: boolean): void
  onInspect(id: ProcessingId): void
  onReview(): void
}) {
  const changedCount = travelCatalog.processing.filter((definition) =>
    snapshot.record.state.processing[definition.id] !== draftEnabled(definition, keepCapabilities, avoidUses)).length
  return (
    <div className="space-y-6">
      <Alert>
        <Sparkles />
        <AlertTitle>Your choices stay in this session until review</AlertTitle>
        <AlertDescription>Essential activities remain visible and locked. Optional choices can be changed before the final review.</AlertDescription>
      </Alert>
      {SETUP_GROUPS.map(({ title, description, ids }) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ids.map((id) => {
              const definition = travelCatalog.getProcessing(id)
              const enabled = draftEnabled(definition, keepCapabilities, avoidUses)
              return (
                <Field key={id} orientation="horizontal" className="items-start">
                  <Checkbox
                    id={`cleanup-${id}`}
                    checked={enabled}
                    disabled={definition.locked}
                    onCheckedChange={(checked) => onChange(definition, checked === true)}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor={`cleanup-${id}`}>{definition.label}</FieldLabel>
                    <FieldDescription>{definition.purpose}</FieldDescription>
                    <Button variant="link" size="xs" className="mt-1 h-auto px-0" onClick={() => onInspect(id)}>View details</Button>
                  </FieldContent>
                  <Badge variant={definition.locked ? 'outline' : enabled ? 'secondary' : 'outline'}>
                    {definition.locked ? 'Required' : enabled ? 'On' : 'Off'}
                  </Badge>
                </Field>
              )
            })}
          </CardContent>
        </Card>
      ))}
      <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
        <p className="text-sm text-muted-foreground">{changedCount ? `${changedCount} draft ${changedCount === 1 ? 'change' : 'changes'}` : 'No draft changes'}</p>
        <Button size="lg" onClick={onReview}>Review changes <ArrowRight data-icon="inline-end" /></Button>
      </div>
    </div>
  )
}

function ReviewView({
  controller,
  snapshot,
  planMatchesIntent,
  applying,
  onEdit,
  onApply,
}: {
  controller: PrivacyController
  snapshot: PrivacyControllerSnapshot
  planMatchesIntent: boolean
  applying: boolean
  onEdit(): void
  onApply(): void
}) {
  const plan = snapshot.plan
  if (!plan || !planMatchesIntent) {
    return (
      <Card className="border-dashed py-10 text-center">
        <CardContent>
          <p className="font-medium">This draft needs to be prepared again.</p>
          <p className="mt-1 text-sm text-muted-foreground">Return to cleanup and review the latest choices.</p>
          <Button className="mt-4" onClick={onEdit}>Return to cleanup</Button>
        </CardContent>
      </Card>
    )
  }

  if (plan.isNoOp) {
    return (
      <Card className="py-10 text-center">
        <CardContent>
          <CheckCircle2 className="mx-auto mb-3 size-8 text-emerald-600" />
          <h2 className="font-heading text-xl font-semibold">You’re already set</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Your draft already matches the current privacy setup, so there is nothing to approve or apply.</p>
          <Button variant="outline" className="mt-5" onClick={onEdit}>Back to choices</Button>
        </CardContent>
      </Card>
    )
  }

  const turningOff = plan.changes.filter(({ after }) => !after)
  const turningOn = plan.changes.filter(({ after }) => after)
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{plan.changes.length} {plan.changes.length === 1 ? 'change' : 'changes'} ready</CardTitle>
          <CardDescription>Plan {plan.id} · based on revision {plan.baseRevision}</CardDescription>
          <CardAction><Button variant="outline" size="sm" onClick={onEdit}>Edit choices</Button></CardAction>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <ChangeGroup title="Turning off" changes={turningOff} empty="Nothing will be turned off." />
          <ChangeGroup title="Turning on" changes={turningOn} empty="Nothing will be turned on." />
        </CardContent>
      </Card>

      {plan.consequences.length > 0 && (
        <section className="space-y-2" aria-labelledby="consequences-heading">
          <h2 id="consequences-heading" className="font-heading font-semibold">What this changes for you</h2>
          {plan.consequences.map((consequence) => (
            <Alert key={`${consequence.processingId}-${consequence.kind}`}>
              <CircleMinus />
              <AlertTitle>{travelCatalog.getProcessing(consequence.processingId).label}</AlertTitle>
              <AlertDescription>{consequence.message}</AlertDescription>
            </Alert>
          ))}
        </section>
      )}
      {plan.conflicts.map((conflict) => (
        <Alert key={`${conflict.capabilityId}-${conflict.useId}`} variant="destructive">
          <AlertTriangle />
          <AlertTitle>Conflicting request</AlertTitle>
          <AlertDescription>{conflict.message}</AlertDescription>
        </Alert>
      ))}
      {plan.blockedItems.map((blocked) => (
        <Alert key={`${blocked.processingId}-${blocked.useId}`} variant="destructive">
          <LockKeyhole />
          <AlertTitle>This required activity cannot be changed</AlertTitle>
          <AlertDescription>{blocked.message}</AlertDescription>
        </Alert>
      ))}

      <Card className="ring-2 ring-primary/10">
        <CardHeader>
          <CardTitle>Human confirmation</CardTitle>
          <CardDescription>Agent activity never selects this checkbox and never counts as approval.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field orientation="horizontal">
            <Checkbox
              id="human-review"
              checked={snapshot.workflow === 'reviewed'}
              onCheckedChange={(checked) => controller.setReviewed(checked === true)}
            />
            <FieldContent>
              <FieldLabel htmlFor="human-review">I reviewed this plan and understand its effects.</FieldLabel>
              <FieldDescription>Changing the draft after this confirmation revokes review and disables apply.</FieldDescription>
            </FieldContent>
          </Field>
          <Button className="w-full" size="lg" disabled={snapshot.workflow !== 'reviewed' || applying} onClick={onApply}>
            <FileCheck2 data-icon="inline-start" />
            {applying ? 'Applying and verifying…' : snapshot.workflow === 'reviewed' ? 'Apply changes' : 'Confirm review to apply'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ChangeGroup({
  title,
  changes,
  empty,
}: {
  title: string
  changes: readonly { processingId: ProcessingId; label: string; reason: string }[]
  empty: string
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {changes.length ? (
        <ul className="space-y-2">
          {changes.map((change) => <li key={change.processingId} className="rounded-lg bg-muted/60 p-3"><span className="font-medium">{change.label}</span><span className="mt-1 block text-xs text-muted-foreground">{change.reason}</span></li>)}
        </ul>
      ) : <p className="text-sm text-muted-foreground">{empty}</p>}
    </div>
  )
}

function ReceiptView({ receipt, onHome }: { receipt: PrivacyReceipt | null; onHome(): void }) {
  if (!receipt) {
    return (
      <Card className="border-dashed py-10 text-center">
        <CardContent>
          <Clock3 className="mx-auto mb-3 size-7 text-muted-foreground" />
          <p className="font-medium">No verified receipt yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Apply a human-reviewed cleanup to create one.</p>
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="space-y-5">
      <Card className="ring-2 ring-emerald-600/15">
        <CardHeader>
          <Badge variant="secondary" className="mb-2 w-fit"><CheckCircle2 data-icon="inline-start" /> Verified receipt</Badge>
          <CardTitle className="text-xl">Privacy preferences applied</CardTitle>
          <CardDescription>Persisted state was reread and matched the exact human-reviewed target.</CardDescription>
        </CardHeader>
        <CardContent><ReceiptDetails receipt={receipt} /></CardContent>
      </Card>
      <Alert>
        <Info />
        <AlertTitle>What “verified” means</AlertTitle>
        <AlertDescription>Application readback matched the reviewed target. This receipt is not a signature or legal proof.</AlertDescription>
      </Alert>
      <Button onClick={onHome}>Return to Privacy Center home</Button>
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
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Final setup</p>
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

function NumberedStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div>
      <span className="mb-2 flex size-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">{number}</span>
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
