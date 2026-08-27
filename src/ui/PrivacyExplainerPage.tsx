import type { PrivacyControllerSnapshot } from '@/application'
import { Button } from '@/components/ui/button'
import { travelCatalog } from '@/demo/travel-catalog'
import { CopyAgentInstructionsButton } from './CopyAgentInstructionsButton'

interface PrivacyExplainerPageProps {
  snapshot: PrivacyControllerSnapshot
  webMcpAvailable: boolean
  onBack(): void
  onOpenSettings(): void
}

const workflow = [
  {
    title: 'Inspect',
    description: 'The page exposes declared purposes, data, dependencies, consequences, and current state as structured tools.',
  },
  {
    title: 'Prepare',
    description: 'The agent asks the deterministic planner for a plan. The exact plan ID and changes become visible in the page.',
  },
  {
    title: 'Human review',
    description: 'The person reads the effects and completes the separate hold control. Agent activity never counts as approval.',
  },
  {
    title: 'Apply and verify',
    description: 'The SDK adapter applies the target and is read back before a scoped receipt is issued.',
  },
]

export function PrivacyExplainerPage({
  snapshot,
  webMcpAvailable,
  onBack,
  onOpenSettings,
}: PrivacyExplainerPageProps) {
  const optional = travelCatalog.processing.filter(({ locked }) => !locked)
  const optionalEnabled = optional.filter(({ id }) => snapshot.record.state.processing[id]).length

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b border-foreground/10">
        <div className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8">
          <button type="button" className="font-medium tracking-tight" onClick={onBack}>Waypoint</button>
          <nav className="flex items-center gap-1" aria-label="Privacy information navigation">
            <Button variant="ghost" className="h-9 rounded-full px-4" onClick={onBack}>Back to travel</Button>
            <Button className="h-9 rounded-full px-5" onClick={onOpenSettings}>Privacy settings</Button>
          </nav>
        </div>
      </header>

      <article>
        <section className="mx-auto w-[min(60rem,calc(100%-2.5rem))] py-16 sm:w-[min(60rem,calc(100%-4rem))] sm:py-24">
          <p className="text-sm font-medium text-muted-foreground">Waypoint privacy architecture</p>
          <h1 className="mt-4 max-w-4xl font-heading text-[clamp(2.5rem,7vw,5rem)] font-medium leading-[0.98] tracking-[-0.045em]">
            Privacy choices, readable by people and agents.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            One catalog powers the banner, settings, WebMCP tools, human review, SDK adapter, and receipts. The demo is local, but the integration boundary is real and explicit.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Button className="h-9 rounded-full px-5" onClick={onOpenSettings}>Open privacy settings</Button>
            <CopyAgentInstructionsButton className="h-9 rounded-full px-4" />
          </div>
        </section>

        <section className="border-y border-foreground/10" aria-labelledby="live-status-heading">
          <div className="mx-auto w-[min(60rem,calc(100%-2.5rem))] py-10 sm:w-[min(60rem,calc(100%-4rem))]">
            <h2 id="live-status-heading" className="text-sm font-medium text-muted-foreground">Live demo status</h2>
            <dl className="mt-5 grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
              <Status label="Agent access" value={webMcpAvailable ? 'WebMCP detected' : 'Manual only'} />
              <Status label="Settings" value={`${travelCatalog.processing.length} declared uses`} />
              <Status label="Optional state" value={`${optionalEnabled} of ${optional.length} on`} />
              <Status label="Decision record" value={`Revision ${snapshot.record.state.revision} · ${snapshot.record.notice.status}`} />
            </dl>
          </div>
        </section>

        <section className="mx-auto w-[min(60rem,calc(100%-2.5rem))] py-16 sm:w-[min(60rem,calc(100%-4rem))] sm:py-24" aria-labelledby="workflow-heading">
          <h2 id="workflow-heading" className="text-2xl font-medium tracking-tight">One controlled workflow</h2>
          <ol className="mt-8 grid gap-0 md:grid-cols-2">
            {workflow.map((step, index) => (
              <li key={step.title} className="border-t border-foreground/10 py-6 md:px-6 md:first:pl-0 md:nth-[2]:pr-0 md:nth-[3]:pl-0 md:last:pr-0">
                <p className="text-xs font-medium text-muted-foreground">0{index + 1}</p>
                <h3 className="mt-3 text-lg font-medium tracking-tight">{step.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-foreground/10 bg-foreground/[0.025]" aria-labelledby="developer-heading">
          <div className="mx-auto grid w-[min(60rem,calc(100%-2.5rem))] gap-10 py-16 sm:w-[min(60rem,calc(100%-4rem))] sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">For developers</p>
              <h2 id="developer-heading" className="mt-3 text-2xl font-medium tracking-tight">Connect decisions to your stack.</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The ClearRights SDK package owns catalog validation, deterministic planning, approval state, adapter readback, and scoped receipts. The host application supplies persistence and enforcement.
              </p>
            </div>
            <pre className="overflow-x-auto border border-foreground/10 bg-background p-5 text-[13px] leading-relaxed"><code>{`const privacy = await createPrivacyRuntime({
  catalog,
  repository,
  enforcement: {
    id: "your-privacy-stack",
    scope: "external",
    apply: applyPrivacyTarget,
    readCurrentState: readPrivacyTarget,
  },
});`}</code></pre>
          </div>
        </section>

        <section className="mx-auto grid w-[min(60rem,calc(100%-2.5rem))] gap-10 py-16 sm:w-[min(60rem,calc(100%-4rem))] sm:py-24 lg:grid-cols-2" aria-labelledby="boundaries-heading">
          <div>
            <h2 id="boundaries-heading" className="text-2xl font-medium tracking-tight">What is real here</h2>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>Structured WebMCP inspection and deterministic plan preparation.</li>
              <li>Human approval gated separately from agent activity.</li>
              <li>A local enforcement adapter with post-apply readback.</li>
              <li>Versioned browser records and the latest ten receipts.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-medium tracking-tight">What the demo does not claim</h2>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>No legal compliance determination or legal signature.</li>
              <li>No person or agent identity proof.</li>
              <li>No backend, cross-device synchronisation, CMP, or external data-pipeline enforcement.</li>
              <li>No atomic transaction across independent production systems.</li>
            </ul>
          </div>
        </section>
      </article>

      <footer className="border-t border-foreground/10 px-5 py-8 text-sm text-muted-foreground sm:px-8">
        Waypoint is a fictional travel service. ClearRights is demonstrated as a local SDK integration.
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
