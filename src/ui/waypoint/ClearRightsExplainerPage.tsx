import { useEffect, useRef, type ReactNode } from 'react'
import type { AccessibilitySnapshot, SiteGuideSnapshot } from '@/domain'
import type { ObservedPrivacySignals, PersonalControlsSection, PrivacyControllerSnapshot } from '@/application'
import { Button } from '@/components/ui/button'
import { travelCatalog } from '@/demo/travel-catalog'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'
import type { WaypointExperienceViewModel } from '@/demo/waypoint/product-effects'
import type { PrivacyTrustTrace } from '@/demo/waypoint/privacy-trust-trace'
import { waypointSiteGuideCatalog } from '@/demo/waypoint/site-guide-catalog'
import { ProductEffectsInspector } from './ProductEffectsInspector'

export function ClearRightsExplainerPage({
  snapshot,
  accessibilitySnapshot,
  siteGuideSnapshot,
  observedPrivacySignals,
  privacyTrustTrace,
  experience,
  webMcpAvailable,
  controlsAction,
  agentActivityAction,
  onBack,
  onOpenControls,
  onOpenPreview,
}: {
  snapshot: PrivacyControllerSnapshot
  accessibilitySnapshot: AccessibilitySnapshot
  siteGuideSnapshot: SiteGuideSnapshot
  observedPrivacySignals: ObservedPrivacySignals
  privacyTrustTrace: PrivacyTrustTrace
  experience: WaypointExperienceViewModel
  webMcpAvailable: boolean
  controlsAction: ReactNode
  agentActivityAction?: ReactNode
  onBack(): void
  onOpenControls(section: PersonalControlsSection): void
  onOpenPreview(): void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const toolCount = snapshot.workflow === 'reviewed' ? 9 : 8
  const optional = travelCatalog.processing.filter(({ control }) => control.mode !== 'required')
  const optionalEnabled = optional.filter(({ id }) => snapshot.record.state.processing[id]).length

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b border-foreground/10">
        <div className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8">
          <button type="button" className="font-medium tracking-tight" onClick={onBack}>Waypoint</button>
          <nav className="flex items-center gap-1" aria-label="ClearRights integration navigation">
            <Button variant="ghost" className="h-9 rounded-full px-4" onClick={onBack}>Back</Button>
            {agentActivityAction}
            {controlsAction}
          </nav>
        </div>
      </header>

      <article>
        <section className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-14 sm:w-[min(64rem,calc(100%-4rem))] sm:py-20">
          <p className="text-sm font-medium text-muted-foreground">ClearRights Privacy · WebMCP reference implementation</p>
          <h1
            ref={headingRef}
            tabIndex={-1}
            data-route-focus
            className="mt-4 max-w-5xl font-heading text-[clamp(2.5rem,7vw,5rem)] font-medium leading-[0.98] tracking-[-0.045em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ClearRights Privacy
          </h1>
          <p className="mt-7 max-w-4xl text-3xl font-medium tracking-tight">
            Agent-ready privacy changes. Human-approved. Verified by the host.
          </p>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            A developer declares privacy controls once. A compatible agent can inspect them and prepare an exact plan, a person reviews that plan, and the host applies and reads the result back through an explicit adapter.
          </p>
          <p className="mt-5 max-w-3xl font-medium">
            Waypoint Travel is the fictional host that proves the full workflow. Accessibility Preferences and Site Guide remain available as secondary examples of the same agent-ready architecture.
          </p>
        </section>

        <section className="border-y border-foreground/10" aria-labelledby="two-minute-demo-heading">
          <div className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-14 sm:w-[min(64rem,calc(100%-4rem))] sm:py-16">
            <p className="text-sm font-medium text-muted-foreground">Try the running integration</p>
            <h2 id="two-minute-demo-heading" className="mt-3 text-3xl font-medium tracking-tight">The two-minute demo</h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Use one privacy journey from inspection to verified receipt. In an ordinary browser, open Privacy settings and complete the same workflow manually.
            </p>
            <div className="mt-9 grid border-t border-foreground/10 lg:grid-cols-3">
              <DemoStep
                number="1"
                title="Inspect the current setup"
                prompt="Show me what privacy processing is active and which settings are required."
                note="The agent reads the same developer-declared catalog and applied state used by the visible settings UI."
                actionLabel="Open privacy settings"
                onAction={() => onOpenControls('privacy')}
              />
              <DemoStep
                number="2"
                title="Prepare a precise plan"
                prompt="Keep booking and account security, but disable personalised recommendations, location suggestions and partner offers."
                note="The deterministic planner opens the exact review. Apply remains unavailable until the person completes the hold."
                actionLabel="Review privacy controls"
                onAction={() => onOpenControls('privacy')}
              />
              <DemoStep
                number="3"
                title="Apply and verify"
                prompt="Apply the exact plan I approved and show me the verified receipt."
                note="After the hold, the dynamic apply tool commits only that plan, reads the adapter state back, and returns a scoped receipt."
                actionLabel="Open receipt history"
                onAction={() => onOpenControls('privacy')}
              />
            </div>
          </div>
        </section>

        <PrivacyTrustTraceSection trace={privacyTrustTrace} />

        <section className="border-y border-foreground/10 bg-foreground/[0.025]" aria-labelledby="integration-flow-heading">
          <div className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-14 sm:w-[min(64rem,calc(100%-4rem))] sm:py-16">
            <p className="text-sm font-medium text-muted-foreground">The integration contract</p>
            <h2 id="integration-flow-heading" className="mt-3 max-w-3xl text-3xl font-medium tracking-tight">
              From a declared privacy control to verified product behavior.
            </h2>
            <div className="mt-10 grid border-t border-foreground/10 md:grid-cols-5">
              <IntegrationStep number="01" title="Declare" body="Describe each privacy activity, control mode, consequence, dependency, and source in a host-owned catalog." />
              <IntegrationStep number="02" title="Inspect" body="Let people and agents read the same catalog and the same applied state." />
              <IntegrationStep number="03" title="Prepare" body="Create a deterministic plan and expose every effect before approval." />
              <IntegrationStep number="04" title="Approve" body="Keep the apply capability unavailable until a person reviews the exact plan." />
              <IntegrationStep number="05" title="Verify" body="Apply through the host adapter, read state back, and issue a scoped receipt." />
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-[min(64rem,calc(100%-2.5rem))] gap-12 py-16 sm:w-[min(64rem,calc(100%-4rem))] sm:py-20 lg:grid-cols-2" aria-labelledby="responsibilities-heading">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Responsibility boundary</p>
            <h2 id="responsibilities-heading" className="mt-3 text-2xl font-medium tracking-tight">ClearRights supplies the rules.</h2>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>Validated, framework-independent catalogs and domain models.</li>
              <li>Deterministic planning and domain-specific approval policies.</li>
              <li>Runtime snapshots, subscriptions, adapter ports, and failure-closed checks.</li>
              <li>Structured inputs from which the host can generate UI and WebMCP schemas.</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Host responsibility</p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight">Your product supplies the effects.</h2>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>Factually and legally accurate catalog content.</li>
              <li>Persistence, enforcement, navigation, authentication, and recovery.</li>
              <li>The customer UI and the mapping from snapshots to product surfaces.</li>
              <li>Production integrations such as CMP, backend, feature flags, or data pipelines.</li>
            </ul>
          </div>
        </section>

        <section className="border-y border-foreground/10" aria-labelledby="implementation-heading">
          <div className="mx-auto grid w-[min(64rem,calc(100%-2.5rem))] gap-10 py-16 sm:w-[min(64rem,calc(100%-4rem))] lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Minimal host integration</p>
              <h2 id="implementation-heading" className="mt-3 text-2xl font-medium tracking-tight">A small, explicit host boundary.</h2>
              <ol className="mt-7 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <li><strong className="text-foreground">1.</strong> Define the privacy catalog as developer-authored data.</li>
                <li><strong className="text-foreground">2.</strong> Implement repository and enforcement ports for the host.</li>
                <li><strong className="text-foreground">3.</strong> Create one privacy runtime during bootstrap.</li>
                <li><strong className="text-foreground">4.</strong> Register WebMCP tools against that same controller.</li>
                <li><strong className="text-foreground">5.</strong> Subscribe to the applied snapshot and derive product effects.</li>
              </ol>
            </div>
            <pre className="overflow-x-auto border border-foreground/10 bg-foreground/[0.025] p-5 text-[13px] leading-relaxed"><code>{`import { definePrivacyCatalog, createPrivacyRuntime }\n  from "@clearrights/sdk/privacy";\n\nconst privacy = await createPrivacyRuntime({\n  catalog: privacyCatalog,\n  repository: privacyRepository,\n  enforcement: privacyAdapter,\n  clock,\n  idGenerator,\n});\n\nprivacy.subscribe((snapshot) => {\n  renderProduct(selectExperience(snapshot.record.state));\n});`}</code></pre>
          </div>
        </section>

        <section className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-16 sm:w-[min(64rem,calc(100%-4rem))] sm:py-20" aria-labelledby="modules-heading">
          <p className="text-sm font-medium text-muted-foreground">Additional modules</p>
          <h2 id="modules-heading" className="mt-3 text-2xl font-medium tracking-tight">The architecture extends without weakening the privacy approval policy.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">These modules remain fully functional, but they are supporting examples rather than the primary submission path.</p>
          <div className="mt-8 grid border-t border-foreground/10 lg:grid-cols-2">
            <Module
              name="Accessibility Preferences"
              contract="inspect → set → readback → Undo"
              body="Immediate local preferences for text, color scheme, contrast, motion, and reading layout. This is not an accessibility overlay or a compliance claim."
            />
            <Module
              name="ClearRights Site Guide"
              contract="select declared destination → navigate"
              body="A curated destination catalog with safe same-origin routes and known panel targets. It performs no crawling and accepts no arbitrary URL."
            />
          </div>
        </section>

        <section className="border-y border-foreground/10 bg-foreground/[0.025]" aria-labelledby="waypoint-files-heading">
          <div className="mx-auto grid w-[min(64rem,calc(100%-2.5rem))] gap-10 py-16 sm:w-[min(64rem,calc(100%-4rem))] lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Use Waypoint as the reference host</p>
              <h2 id="waypoint-files-heading" className="mt-3 text-2xl font-medium tracking-tight">Every layer has a concrete implementation.</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Catalog text has <strong className="text-foreground">contentProvenance: site_developer</strong>. It remains descriptive data rather than an instruction for the agent. Product components consume a host view model instead of reading SDK IDs or storage directly.
              </p>
            </div>
            <dl className="grid border-t border-foreground/10 text-sm">
              <FileReference label="Catalogs" value="src/demo/waypoint/*-catalog.ts" />
              <FileReference label="Host adapters" value="src/adapters/{storage,enforcement,accessibility,navigation}/" />
              <FileReference label="Bootstrap" value="src/adapters/browser/bootstrap.ts" />
              <FileReference label="WebMCP mapping" value="src/adapters/webmcp/" />
              <FileReference label="Product effects" value="src/demo/waypoint/product-effects.ts" />
              <FileReference label="Host UI" value="src/ui/waypoint/" />
            </dl>
          </div>
        </section>

        <section className="border-b border-foreground/10" aria-labelledby="live-integration-status">
          <div className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-10 sm:w-[min(64rem,calc(100%-4rem))]">
            <p className="text-sm font-medium text-muted-foreground">Evidence from this running host</p>
            <h2 id="live-integration-status" className="mt-3 text-2xl font-medium tracking-tight">Live integration status</h2>
            <dl className="mt-5 grid sm:grid-cols-2 lg:grid-cols-5">
              <Status label="WebMCP" value={webMcpAvailable ? `${toolCount} tools registered` : 'Unavailable · manual fallback active'} />
              <Status label="Privacy" value={`${optionalEnabled} of ${optional.length} optional on · revision ${snapshot.record.state.revision}`} />
              <Status label="Browser signal" value={gpcLabel(observedPrivacySignals)} />
              <Status label="Accessibility" value={`${waypointAccessibilityCatalog.primitives.length} preferences · revision ${accessibilitySnapshot.revision} · ${accessibilitySnapshot.undoAvailable ? 'Undo available' : 'No Undo'}`} />
              <Status label="Site Guide" value={`${waypointSiteGuideCatalog.destinations.length} declared · ${siteGuideSnapshot.currentDestinationId ?? 'no current destination'}`} />
            </dl>
          </div>
        </section>

        <ProductEffectsInspector
          experience={experience}
          appliedRevision={snapshot.record.state.revision}
          pendingPlan={snapshot.plan && (snapshot.workflow === 'staged' || snapshot.workflow === 'reviewed')
            ? {
                id: snapshot.plan.id,
                status: snapshot.workflow,
                changeCount: snapshot.plan.changes.length,
              }
            : null}
          onOpenPreview={onOpenPreview}
        />

        <section className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-16 sm:w-[min(64rem,calc(100%-4rem))] sm:py-20" aria-labelledby="adapters-heading">
          <p className="text-sm font-medium text-muted-foreground">From local proof to production boundary</p>
          <h2 id="adapters-heading" className="mt-3 text-2xl font-medium tracking-tight">Every real effect belongs to an explicit host adapter.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Waypoint uses local adapters so the full workflow is runnable without accounts or credentials. A production host replaces those ports with its authoritative systems while keeping the planner, approval gate, tool schemas, and readback contract.
          </p>
          <div className="mt-9 border-t border-foreground/10 text-sm">
            <AdapterMapping
              port="PrivacyRepository"
              demo="Versioned localStorage record"
              production="CMP or consent backend decision record"
              evidence="Read revision and complete processing state"
            />
            <AdapterMapping
              port="PrivacyEnforcementAdapter.apply"
              demo="Waypoint local enforcement state"
              production="CMP decisions, feature flags, or data-pipeline commands"
              evidence="Operation ID and exact target state"
            />
            <AdapterMapping
              port="readCurrentState"
              demo="Local adapter readback"
              production="Authoritative CMP/backend query"
              evidence="Fail closed when any processing value differs"
            />
            <AdapterMapping
              port="PrivacyReceipt"
              demo="Last ten receipts in this browser"
              production="Scoped audit or receipt store"
              evidence="Catalog, notice, before/after, adapter, and readback"
            />
            <AdapterMapping
              port="Privacy signal reader"
              demo="navigator.globalPrivacyControl"
              production="Browser signal plus server-side Sec-GPC handling"
              evidence="Observed only; never treated as blanket consent"
            />
            <AdapterMapping
              port="Product-effect selector"
              demo="Waypoint React view model"
              production="Product components, feature services, or API responses"
              evidence="Only the applied snapshot reaches product surfaces"
            />
          </div>
          <p className="mt-7 max-w-4xl text-xs leading-relaxed text-muted-foreground">
            Documented integration targets include{' '}
            <a className="underline underline-offset-4" href="https://developer.onetrust.com/onetrust/reference/getconsentgrouplistusingget" target="_blank" rel="noreferrer">OneTrust consent groups</a>
            {' '}and{' '}
            <a className="underline underline-offset-4" href="https://docs.usercentrics.com/cmp_in_app_sdk/latest/api/usercentrics-core/" target="_blank" rel="noreferrer">Usercentrics decisions</a>.
            {' '}They are examples of systems that an authorised host adapter could call; no vendor integration, certification, or trademark asset is bundled here.
          </p>
        </section>

        <section className="border-t border-foreground/10" aria-labelledby="limits-heading">
          <div className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-16 sm:w-[min(64rem,calc(100%-4rem))] sm:py-20">
            <h2 id="limits-heading" className="text-2xl font-medium tracking-tight">Trust boundaries and demo limits</h2>
            <ul className="mt-6 grid gap-3 text-sm leading-relaxed text-muted-foreground md:grid-cols-2">
              <li>No compliance determination, legal advice, identity proof, signature, or medical inference.</li>
              <li>No backend, account, cross-device sync, CMP, CRM, or production data-pipeline enforcement.</li>
              <li>No DSAR workflow, geography selector, automatic DOM remediation, or site crawling.</li>
              <li>No prompt, raw tool payload, PII, or agent reasoning stored in Activity.</li>
            </ul>
          </div>
        </section>
      </article>

      <footer className="border-t border-foreground/10 px-5 py-8 text-sm text-muted-foreground sm:px-8">
        Built with ClearRights · Waypoint Travel is fictional. The local demo makes no promise of legal compliance.
      </footer>
    </main>
  )
}

function PrivacyTrustTraceSection({ trace }: { trace: PrivacyTrustTrace }) {
  const stages = [
    {
      title: 'Declared by Waypoint',
      complete: true,
      value: `Catalog ${trace.declared.catalogVersion}`,
      detail: `Notice ${trace.declared.noticeVersion}`,
    },
    {
      title: 'Prepared by agent',
      complete: trace.prepared.status === 'agent_prepared',
      value: trace.prepared.status === 'agent_prepared'
        ? 'Agent-prepared plan'
        : trace.prepared.status === 'human_direct'
          ? 'Direct human choice'
          : trace.prepared.planId
            ? 'Manual draft · no agent preparation'
            : 'Waiting for a plan',
      detail: trace.prepared.planId ?? 'No plan ID',
    },
    {
      title: 'Reviewed by human',
      complete: trace.reviewed.status !== 'pending',
      value: trace.reviewed.status === 'human_reviewed'
        ? 'Human review recorded'
        : trace.reviewed.status === 'not_required'
          ? 'Direct action · hold not required'
          : 'Waiting for human review',
      detail: trace.reviewed.method ?? 'No approval method',
    },
    {
      title: 'Applied by adapter',
      complete: trace.applied.status === 'applied',
      value: trace.applied.status === 'applied'
        ? `Revision ${trace.applied.revision}`
        : 'Nothing applied in this trace',
      detail: trace.applied.adapterId ?? 'No adapter evidence',
    },
    {
      title: 'Readback matched',
      complete: trace.verified.status === 'readback_matched',
      value: trace.verified.status === 'readback_matched'
        ? 'Verified against applied state'
        : 'No matching receipt yet',
      detail: trace.verified.method
        ? `${trace.verified.method} · ${trace.verified.scope}`
        : 'No verification evidence',
    },
  ]

  return (
    <section className="border-b border-foreground/10 bg-foreground/[0.025]" aria-labelledby="privacy-trust-trace-heading">
      <div className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-14 sm:w-[min(64rem,calc(100%-4rem))] sm:py-16">
        <p className="text-sm font-medium text-muted-foreground">Evidence from the current browser state</p>
        <h2 id="privacy-trust-trace-heading" className="mt-3 text-3xl font-medium tracking-tight">Privacy trust trace</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Every completed step below is derived from a catalog version, plan origin, human review timestamp, applied receipt, or adapter readback. It is never inferred from page navigation alone.
        </p>
        <ol className="mt-9 grid border-t border-foreground/10 md:grid-cols-5">
          {stages.map((stage, index) => (
            <li key={stage.title} data-testid="privacy-trust-stage" className="border-b border-foreground/10 py-6 md:border-r md:pr-5 md:not-first:pl-5 md:last:border-r-0">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                <span className={`size-2 rounded-full ${stage.complete ? 'bg-foreground' : 'border border-foreground/30'}`} aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-medium">{stage.title}</h3>
              <p className="mt-3 text-sm leading-relaxed">{stage.value}</p>
              <p className="mt-2 break-all font-mono text-xs leading-relaxed text-muted-foreground">{stage.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function DemoStep({
  number,
  title,
  prompt,
  note,
  actionLabel,
  onAction,
}: {
  number: string
  title: string
  prompt: string
  note: string
  actionLabel: string
  onAction(): void
}) {
  return (
    <article className="flex flex-col border-b border-foreground/10 py-7 lg:border-r lg:pr-7 lg:not-first:pl-7 lg:last:border-r-0">
      <p className="font-mono text-xs text-muted-foreground">0{number}</p>
      <h3 className="mt-3 text-lg font-medium tracking-tight">{title}</h3>
      <blockquote className="mt-5 border-l-2 border-foreground pl-4 text-sm leading-relaxed">“{prompt}”</blockquote>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{note}</p>
      <Button variant="outline" className="mt-6 self-start" onClick={onAction}>{actionLabel}</Button>
    </article>
  )
}

function IntegrationStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <article className="border-b border-foreground/10 py-6 md:border-r md:pr-5 md:not-first:pl-5 md:last:border-r-0">
      <p className="font-mono text-xs text-muted-foreground">{number}</p>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  )
}

function FileReference({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 border-b border-foreground/10 py-4 sm:grid-cols-[9rem_1fr]">
      <dt className="font-medium">{label}</dt>
      <dd><code className="break-all text-muted-foreground">{value}</code></dd>
    </div>
  )
}

function AdapterMapping({
  port,
  demo,
  production,
  evidence,
}: {
  port: string
  demo: string
  production: string
  evidence: string
}) {
  return (
    <article className="grid gap-4 border-b border-foreground/10 py-5 md:grid-cols-[1fr_1fr_1.15fr_1.15fr]">
      <div><p className="font-mono text-xs text-muted-foreground">ClearRights port</p><p className="mt-2 font-medium">{port}</p></div>
      <div><p className="text-xs text-muted-foreground">Waypoint proof</p><p className="mt-2">{demo}</p></div>
      <div><p className="text-xs text-muted-foreground">Production target</p><p className="mt-2">{production}</p></div>
      <div><p className="text-xs text-muted-foreground">Required evidence</p><p className="mt-2">{evidence}</p></div>
    </article>
  )
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-foreground/10 py-4 sm:pr-5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-2 font-medium">{value}</dd>
    </div>
  )
}

function gpcLabel(signals: ObservedPrivacySignals) {
  if (signals.globalPrivacyControl.interpretation === 'opt_out_observed') return 'GPC opt-out observed · informational only'
  if (signals.globalPrivacyControl.interpretation === 'no_opt_out_observed') return 'No GPC opt-out observed · informational only'
  return 'GPC unavailable · informational only'
}

function Module({ name, contract, body }: { name: string; contract: string; body: string }) {
  return (
    <article className="border-b border-foreground/10 py-7 lg:border-r lg:pr-7 lg:not-first:pl-7 lg:last:border-r-0">
      <h3 className="text-lg font-medium tracking-tight">{name}</h3>
      <p className="mt-3 font-mono text-xs leading-relaxed text-foreground">{contract}</p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  )
}
