import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type {
  WaypointExperienceViewModel,
  WaypointProductEffectSource,
} from '@/demo/waypoint/product-effects'
import { cn } from '@/lib/utils'

type ProductEffectFilter = 'all' | WaypointProductEffectSource

const filters: Array<{ id: ProductEffectFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'accessibility', label: 'Accessibility' },
]

export function ProductEffectsInspector({
  experience,
  appliedRevision,
  pendingPlan,
  onOpenPreview,
}: {
  experience: WaypointExperienceViewModel
  appliedRevision: number
  pendingPlan: { id: string; status: 'staged' | 'reviewed'; changeCount: number } | null
  onOpenPreview(): void
}) {
  const [filter, setFilter] = useState<ProductEffectFilter>('privacy')
  const visibleEffects = filter === 'all'
    ? experience.effects
    : experience.effects.filter(({ source }) => source === filter)

  return (
    <section className="border-y border-foreground/10 bg-foreground/[0.025]" aria-labelledby="product-effects-heading">
      <div className="mx-auto w-[min(64rem,calc(100%-2.5rem))] py-16 sm:w-[min(64rem,calc(100%-4rem))] sm:py-20">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Live host mapping</p>
            <h2 id="product-effects-heading" className="mt-3 text-2xl font-medium tracking-tight">Product effects</h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Waypoint maps ClearRights snapshots to named product surfaces once. React receives this final view model rather than reading storage or SDK identifiers inside product components.
            </p>
            <p className="mt-3 text-sm font-medium">Showing applied privacy revision {appliedRevision}.</p>
          </div>
          <Button className="w-fit rounded-full" onClick={onOpenPreview}>Open live product preview</Button>
        </div>

        {pendingPlan && (
          <div role="status" className="mt-8 border border-foreground/15 bg-background p-4 text-sm leading-relaxed">
            <p className="font-medium">Pending draft is not shown in this product preview</p>
            <p className="mt-1 text-muted-foreground">
              {pendingPlan.changeCount} {pendingPlan.changeCount === 1 ? 'change' : 'changes'} in {pendingPlan.id} remain {pendingPlan.status}. The product effects below continue to use revision {appliedRevision} until the exact draft is human-approved and applied.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2" aria-label="Filter product effects">
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                filter === id
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-foreground/15 bg-background hover:border-foreground/40',
              )}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-foreground/10">
          {visibleEffects.map((effect) => (
            <article
              key={effect.id}
              data-testid="product-effect-row"
              className="grid gap-4 border-b border-foreground/10 py-6 md:grid-cols-[1.05fr_1fr_0.75fr]"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{effect.source}</p>
                <h3 className="mt-2 font-medium">{effect.settingLabel}</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{effect.settingId} = {effect.runtimeValue}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Waypoint surface</p>
                <p className="mt-2 font-medium">{effect.surfaceLabel}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{effect.technicalCopy}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Current result</p>
                <p className="mt-2 font-medium capitalize">{effect.result}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {effect.adapterId} · {effect.adapterScope}<br />
                  {effect.verification.verified
                    ? effect.verification.kind === 'privacy_receipt'
                      ? `Verified receipt: ${effect.verification.receiptId} · ${effect.verification.value}`
                      : `DOM readback: ${effect.verification.value}`
                    : 'No receipt verifies this applied revision'}
                </p>
              </div>
            </article>
          ))}
        </div>

        <details className="mt-8 border border-foreground/10 bg-background">
          <summary className="cursor-pointer px-5 py-4 font-medium">Current experience view model</summary>
          <pre className="max-h-96 overflow-auto border-t border-foreground/10 p-5 text-xs leading-relaxed"><code>{JSON.stringify({
            essentials: experience.essentials,
            discovery: experience.discovery,
            nearbyGuide: experience.nearbyGuide,
            partnerOffer: experience.partnerOffer,
            accessibility: experience.accessibility,
            hiddenSurfaceIds: experience.hiddenSurfaceIds,
          }, null, 2)}</code></pre>
        </details>
      </div>
    </section>
  )
}
