import type { ReactNode } from 'react'
import type { AccessibilitySnapshot, SiteGuideSnapshot } from '@/domain'
import type { PrivacyControllerSnapshot } from '@/application'
import { Button } from '@/components/ui/button'
import { travelCatalog } from '@/demo/travel-catalog'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'
import type { WaypointExperienceViewModel } from '@/demo/waypoint/product-effects'
import { waypointSiteGuideCatalog } from '@/demo/waypoint/site-guide-catalog'
import { ProductEffectsInspector } from './ProductEffectsInspector'

export function ClearRightsExplainerPage({
  snapshot,
  accessibilitySnapshot,
  siteGuideSnapshot,
  experience,
  webMcpAvailable,
  controlsAction,
  agentActivityAction,
  onBack,
  onOpenPreview,
}: {
  snapshot: PrivacyControllerSnapshot
  accessibilitySnapshot: AccessibilitySnapshot
  siteGuideSnapshot: SiteGuideSnapshot
  experience: WaypointExperienceViewModel
  webMcpAvailable: boolean
  controlsAction: ReactNode
  agentActivityAction?: ReactNode
  onBack(): void
  onOpenPreview(): void
}) {
  const toolCount = snapshot.workflow === 'reviewed' ? 9 : 8
  const optional = travelCatalog.processing.filter(({ control }) => control.mode !== 'required')
  const optionalEnabled = optional.filter(({ id }) => snapshot.record.state.processing[id]).length

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
          <p className="text-sm font-medium text-muted-foreground">Built with ClearRights</p>
          <h1
            tabIndex={-1}
            data-route-focus
            className="mt-4 max-w-5xl font-heading text-[clamp(2.5rem,7vw,5rem)] font-medium leading-[0.98] tracking-[-0.045em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ClearRights developer integration
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            ClearRights is the headless SDK. Waypoint Travel is the host product that supplies catalogs, storage, adapters, UI, and product effects.
          </p>
          <p className="mt-5 max-w-3xl font-medium">A fictional travel application used to demonstrate ClearRights integrations.</p>
        </section>

        <section className="border-y border-foreground/10" aria-labelledby="live-integration-status">
          <div className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-10 sm:w-[min(64rem,calc(100%-4rem))]">
            <h2 id="live-integration-status" className="text-sm font-medium text-muted-foreground">Live integration status</h2>
            <dl className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4">
              <Status label="WebMCP" value={webMcpAvailable ? `${toolCount} tools registered` : 'Unavailable · manual fallback active'} />
              <Status label="Privacy" value={`${optionalEnabled} of ${optional.length} optional on · revision ${snapshot.record.state.revision}`} />
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

        <section className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-16 sm:w-[min(64rem,calc(100%-4rem))] sm:py-20" aria-labelledby="modules-heading">
          <h2 id="modules-heading" className="text-2xl font-medium tracking-tight">Three modules, three policies</h2>
          <div className="mt-8 grid border-t border-foreground/10 lg:grid-cols-3">
            <Module
              name="ClearRights Privacy"
              contract="inspect → stage → human hold → apply → readback → receipt"
              body="A deterministic planner and a strong approval boundary. Required, opt-in, and opt-out controls are catalog data rather than UI assumptions."
            />
            <Module
              name="Accessibility Preferences"
              contract="inspect → set → readback → Undo"
              body="Immediate local preferences for text, contrast, motion, and reading layout. This is not an accessibility overlay or a compliance claim."
            />
            <Module
              name="ClearRights Site Guide"
              contract="select declared destination → navigate"
              body="A curated destination catalog with safe same-origin routes and known panel targets. It performs no crawling and accepts no arbitrary URL."
            />
          </div>
        </section>

        <section className="border-y border-foreground/10 bg-foreground/[0.025]" aria-labelledby="catalog-heading">
          <div className="mx-auto grid w-[min(64rem,calc(100%-2.5rem))] gap-10 py-16 sm:w-[min(64rem,calc(100%-4rem))] lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Developer-authored catalogs</p>
              <h2 id="catalog-heading" className="mt-3 text-2xl font-medium tracking-tight">Product facts become structured context.</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Waypoint declares labels, summaries, consequences, factual background, limitations, available preference options, and safe destinations. The UI can stay concise while an agent inspects the complete structured definition.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Developer context has <strong className="text-foreground">contentProvenance: site_developer</strong>. It is untrusted descriptive data, never an instruction for the agent to execute.
              </p>
            </div>
            <pre className="overflow-x-auto border border-foreground/10 bg-background p-5 text-[13px] leading-relaxed"><code>{`definePrivacyCatalog({
  processing: [{
    id: "recommendations",
    control: { mode: "opt_in", mutable: true },
    description: { summary, details },
    consequences: { whenEnabled, whenDisabled },
    developerContext: { factualBackground, limitations },
  }],
});

defineAccessibilityCatalog({ primitives: [/* options */] });
defineSiteGuideCatalog({ destinations: [/* safe targets */] });`}</code></pre>
          </div>
        </section>

        <section className="mx-auto grid w-[min(64rem,calc(100%-2.5rem))] gap-10 py-16 sm:w-[min(64rem,calc(100%-4rem))] sm:py-20 lg:grid-cols-2" aria-labelledby="adapters-heading">
          <div>
            <h2 id="adapters-heading" className="text-2xl font-medium tracking-tight">Active adapters and scope</h2>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>Privacy: versioned local repository plus <code>local_demo</code> enforcement and post-apply readback.</li>
              <li>Accessibility: separate local repository plus DOM data attributes and full readback.</li>
              <li>Site Guide: visible hash navigation controlled by the Waypoint host.</li>
              <li>Activity: session-only timeline, capped at 25 user-readable events.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-medium tracking-tight">Production integration boundary</h2>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              A host can replace the adapters with a CMP, CRM, feature-flag service, consent backend, or product data pipeline. It remains responsible for authentication, authorisation, transactions, error recovery, retention, and the legal accuracy of its catalog.
            </p>
          </div>
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
        Waypoint Travel is fictional. ClearRights is demonstrated through local, inspectable adapters and makes no promise of legal compliance.
      </footer>
    </main>
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

function Module({ name, contract, body }: { name: string; contract: string; body: string }) {
  return (
    <article className="border-b border-foreground/10 py-7 lg:border-r lg:pr-7 lg:not-first:pl-7 lg:last:border-r-0">
      <h3 className="text-lg font-medium tracking-tight">{name}</h3>
      <p className="mt-3 font-mono text-xs leading-relaxed text-foreground">{contract}</p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  )
}
