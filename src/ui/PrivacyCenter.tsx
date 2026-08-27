import { useState } from 'react'
import type { PrivacyController, PrivacyControllerSnapshot } from '@/application'
import type { CapabilityId, ProcessingId, UseId } from '@/domain'
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
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
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  CircleMinus,
  FileCheck2,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'

interface PrivacyCenterProps {
  controller: PrivacyController
  snapshot: PrivacyControllerSnapshot
  webMcpAvailable: boolean
}

export function PrivacyCenter({
  controller,
  snapshot,
  webMcpAvailable,
}: PrivacyCenterProps) {
  const [selectedId, setSelectedId] = useState<ProcessingId>('trip_fulfilment')
  const [keepCapabilities, setKeepCapabilities] = useState<CapabilityId[]>(() =>
    snapshot.plan ? [...snapshot.plan.input.keepCapabilities] : activeCapabilities(snapshot))
  const [avoidUses, setAvoidUses] = useState<UseId[]>(() =>
    snapshot.plan ? [...snapshot.plan.input.avoidUses] : [])
  const [actionError, setActionError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const inspection = controller.inspect(selectedId)

  const revokeReviewForChangedIntent = () => {
    if (snapshot.workflow === 'reviewed') controller.setReviewed(false)
  }

  const updateCapability = (id: CapabilityId, checked: boolean) => {
    revokeReviewForChangedIntent()
    setKeepCapabilities((current) => toggleValue(current, id, checked))
  }

  const updateUse = (id: UseId, checked: boolean) => {
    revokeReviewForChangedIntent()
    setAvoidUses((current) => toggleValue(current, id, checked))
  }

  const stagePlan = () => {
    setActionError(null)
    try {
      controller.stage({ keepCapabilities, avoidUses })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The plan could not be staged.')
    }
  }

  const applyPlan = async () => {
    if (!snapshot.plan) return
    setApplying(true)
    setActionError(null)
    try {
      await controller.apply(snapshot.plan.id)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The reviewed plan could not be applied.')
    } finally {
      setApplying(false)
    }
  }

  const resetDemo = async () => {
    setActionError(null)
    try {
      await controller.resetDemo(true)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Demo data could not be reset.')
    }
  }

  return (
    <SheetContent className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:w-[min(80vw,1120px)] data-[side=right]:sm:max-w-none">
      <SheetHeader className="border-b px-6 py-5">
        <div className="flex items-center gap-2 pr-8">
          <Badge variant="secondary"><ShieldCheck data-icon="inline-start" /> ClearRights</Badge>
          <Badge variant="outline">
            <Bot data-icon="inline-start" /> {webMcpAvailable ? 'Agent tools ready' : 'Manual mode'}
          </Badge>
          <Badge variant="outline" aria-live="polite">{snapshot.workflow}</Badge>
        </div>
        <SheetTitle className="text-xl">Privacy Center</SheetTitle>
        <SheetDescription>
          Inspect service-declared processing and preview every effect before a preference changes.
        </SheetDescription>
      </SheetHeader>

      <ScrollArea className="h-[calc(100svh-186px)]">
        <div className="grid min-h-full gap-6 p-6 lg:grid-cols-[minmax(300px,0.8fr)_minmax(440px,1.2fr)]">
          <section className="space-y-5" aria-labelledby="processing-heading">
            <div>
              <h2 id="processing-heading" className="font-heading text-lg font-semibold">Processing activities</h2>
              <p className="text-sm text-muted-foreground">Required activities are locked by the service.</p>
            </div>
            {(['required', 'optional'] as const).map((group) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                <ItemGroup className="gap-2">
                  {travelCatalog.processing.filter((item) => item.group === group).map((item) => {
                    const enabled = snapshot.record.state.processing[item.id]
                    return (
                      <Item key={item.id} asChild variant={selectedId === item.id ? 'muted' : 'outline'} size="sm">
                        <Button
                          variant="ghost"
                          className="h-auto w-full justify-start whitespace-normal text-left"
                          onClick={() => setSelectedId(item.id)}
                        >
                          <ItemMedia variant="icon">
                            {item.locked ? <LockKeyhole /> : enabled ? <Check /> : <CircleMinus />}
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{item.label}</ItemTitle>
                            <ItemDescription>
                              Legal basis declared by the service: {basisLabel(item.declaredLegalBasis)}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            <Badge variant={item.locked ? 'outline' : enabled ? 'secondary' : 'outline'}>
                              {item.locked ? 'Locked' : enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </ItemActions>
                        </Button>
                      </Item>
                    )
                  })}
                </ItemGroup>
              </div>
            ))}

            <Card size="sm">
              <CardHeader>
                <CardTitle>{inspection.definition.label}</CardTitle>
                <CardDescription>{inspection.definition.purpose}</CardDescription>
                <CardAction>
                  <Badge variant={inspection.enabled ? 'secondary' : 'outline'}>
                    {inspection.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <Detail label="Data" value={inspection.definition.data.join(', ')} />
                <Separator />
                <Detail label="Declared legal basis" value={basisLabel(inspection.definition.declaredLegalBasis)} />
                <Detail label="Control" value={inspection.definition.control} />
                <Detail
                  label="Dependencies"
                  value={inspection.definition.dependencies.length
                    ? inspection.definition.dependencies.map((id) => travelCatalog.getProcessing(id).label).join(', ')
                    : 'None'}
                />
                <Detail label="If disabled" value={inspection.definition.consequence} />
                <Detail label="Policy reference" value={inspection.definition.policyReference} />
              </CardContent>
            </Card>
          </section>

          <section className="space-y-5" aria-labelledby="plan-heading">
            <div>
              <h2 id="plan-heading" className="font-heading text-lg font-semibold">Privacy plan</h2>
              <p className="text-sm text-muted-foreground">Keep capabilities you value and mark uses you want to avoid.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Planning intent</CardTitle>
                <CardDescription>The planner uses exact selections, not natural-language interpretation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FieldSet>
                  <FieldLegend>Keep capabilities</FieldLegend>
                  <FieldGroup data-slot="checkbox-group">
                    {travelCatalog.capabilities.map((capability) => (
                      <Field key={capability.id} orientation="horizontal">
                        <Checkbox
                          id={`keep-${capability.id}`}
                          checked={keepCapabilities.includes(capability.id)}
                          onCheckedChange={(checked) => updateCapability(capability.id, checked === true)}
                        />
                        <FieldContent>
                          <FieldLabel htmlFor={`keep-${capability.id}`}>{capability.label}</FieldLabel>
                          <FieldDescription>{capability.description}</FieldDescription>
                        </FieldContent>
                      </Field>
                    ))}
                  </FieldGroup>
                </FieldSet>

                <Separator />

                <FieldSet>
                  <FieldLegend>Uses to avoid</FieldLegend>
                  <FieldGroup data-slot="checkbox-group">
                    {travelCatalog.uses.map((use) => (
                      <Field key={use.id} orientation="horizontal">
                        <Checkbox
                          id={`avoid-${use.id}`}
                          checked={avoidUses.includes(use.id)}
                          onCheckedChange={(checked) => updateUse(use.id, checked === true)}
                        />
                        <FieldContent>
                          <FieldLabel htmlFor={`avoid-${use.id}`}>{use.label}</FieldLabel>
                          <FieldDescription>{use.description}</FieldDescription>
                        </FieldContent>
                      </Field>
                    ))}
                  </FieldGroup>
                </FieldSet>

                <Button onClick={stagePlan}>Stage privacy plan <ArrowRight data-icon="inline-end" /></Button>
              </CardContent>
            </Card>

            {snapshot.plan && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Before and after</CardTitle>
                    <CardDescription>
                      {snapshot.plan.isNoOp ? 'The reviewed target already matches current preferences.' : `${snapshot.plan.changes.length} preference changes prepared.`}
                    </CardDescription>
                    <CardAction><Badge variant="outline">{snapshot.plan.id}</Badge></CardAction>
                  </CardHeader>
                  <CardContent>
                    {snapshot.plan.changes.length === 0 ? (
                      <Badge variant="secondary"><Check data-icon="inline-start" /> No changes</Badge>
                    ) : (
                      <ItemGroup className="gap-2">
                        {snapshot.plan.changes.map((change) => (
                          <Item key={change.processingId} variant="outline" size="sm">
                            <ItemContent>
                              <ItemTitle>{change.label}</ItemTitle>
                              <ItemDescription>{change.reason}</ItemDescription>
                            </ItemContent>
                            <ItemActions className="gap-1">
                              <Badge variant="outline">{change.before ? 'On' : 'Off'}</Badge>
                              <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                              <Badge variant={change.after ? 'secondary' : 'outline'}>{change.after ? 'On' : 'Off'}</Badge>
                            </ItemActions>
                          </Item>
                        ))}
                      </ItemGroup>
                    )}
                  </CardContent>
                </Card>

                {snapshot.plan.consequences.map((consequence) => (
                  <Alert key={`${consequence.processingId}-${consequence.kind}`}>
                    <CircleMinus />
                    <AlertTitle>Consequence</AlertTitle>
                    <AlertDescription>{consequence.message}</AlertDescription>
                  </Alert>
                ))}
                {snapshot.plan.conflicts.map((conflict) => (
                  <Alert key={`${conflict.capabilityId}-${conflict.useId}`} variant="destructive">
                    <AlertTriangle />
                    <AlertTitle>Conflict</AlertTitle>
                    <AlertDescription>{conflict.message}</AlertDescription>
                  </Alert>
                ))}
                {snapshot.plan.blockedItems.map((blocked) => (
                  <Alert key={`${blocked.processingId}-${blocked.useId}`} variant="destructive">
                    <LockKeyhole />
                    <AlertTitle>Required processing is blocked from change</AlertTitle>
                    <AlertDescription>{blocked.message}</AlertDescription>
                  </Alert>
                ))}

                {snapshot.workflow !== 'applied' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Human review</CardTitle>
                      <CardDescription>Only this visible checkbox can unlock the apply action.</CardDescription>
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
                          <FieldDescription>Changing the intent or clearing this box revokes review.</FieldDescription>
                        </FieldContent>
                      </Field>
                      <Button
                        className="w-full"
                        disabled={snapshot.workflow !== 'reviewed' || applying}
                        onClick={() => void applyPlan()}
                      >
                        <FileCheck2 data-icon="inline-start" />
                        {applying ? 'Applying and verifying…' : snapshot.workflow === 'reviewed' ? 'Apply reviewed plan' : 'Review plan to apply'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {snapshot.workflow === 'applied' && snapshot.record.latestReceipt && (
              <Card className="ring-2 ring-primary/15">
                <CardHeader>
                  <Badge variant="secondary" className="mb-2 w-fit"><CheckCircle2 data-icon="inline-start" /> Verified receipt</Badge>
                  <CardTitle>Privacy preferences applied</CardTitle>
                  <CardDescription>Persisted state was reread and matched the reviewed target.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Detail label="Receipt" value={snapshot.record.latestReceipt.id} />
                  <Detail label="Plan" value={snapshot.record.latestReceipt.planId} />
                  <Detail label="Revision" value={`${snapshot.record.latestReceipt.beforeRevision} → ${snapshot.record.latestReceipt.afterRevision}`} />
                  <Detail label="Issued" value={new Date(snapshot.record.latestReceipt.issuedAt).toLocaleString('en-GB')} />
                  <Separator />
                  <p className="text-xs text-muted-foreground">
                    Verified means application readback matched the target. It is not a signature or legal proof.
                  </p>
                </CardContent>
              </Card>
            )}

            {actionError && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Action could not be completed</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
          </section>
        </div>
      </ScrollArea>

      <SheetFooter className="flex-row items-center justify-between border-t bg-background px-6 py-3">
        <p className="max-w-xl text-xs text-muted-foreground">
          Service-declared information for this demo. ClearRights does not provide legal advice or determine GDPR compliance.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm"><RotateCcw data-icon="inline-start" /> Reset demo data</Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                This restores all optional processing, removes the staged plan, and deletes the latest receipt.
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function toggleValue<T extends string>(current: readonly T[], value: T, checked: boolean): T[] {
  if (checked) return current.includes(value) ? [...current] : [...current, value]
  return current.filter((item) => item !== value)
}

function activeCapabilities(snapshot: PrivacyControllerSnapshot): CapabilityId[] {
  return travelCatalog.capabilities
    .filter((capability) => travelCatalog.processing.some((processing) =>
      processing.capabilities.includes(capability.id)
      && snapshot.record.state.processing[processing.id]))
    .map(({ id }) => id)
}

function basisLabel(basis: 'contract' | 'legitimate_interest' | 'consent') {
  if (basis === 'legitimate_interest') return 'Legitimate interest'
  return basis[0].toUpperCase() + basis.slice(1)
}
