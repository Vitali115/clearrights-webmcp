import { useState, type ReactNode } from 'react'
import type {
  WaypointExperienceViewModel,
  WaypointProductSurfaceId,
} from '@/demo/waypoint/product-effects'
import type {
  WaypointDeveloperPreviewMode,
  WaypointDeveloperPreviewModel,
  WaypointPrivacySandboxState,
} from '@/demo/waypoint/developer-product-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DeveloperSurfaceInspector } from '@/ui/waypoint/DeveloperSurfaceInspector'

interface TravelProductPageProps {
  controlsAction: ReactNode
  agentActivityAction?: ReactNode
  experience: WaypointExperienceViewModel
  effectsPreview: boolean
  developerPreview: WaypointDeveloperPreviewModel | null
  privacyEffectStatus: {
    pendingChanges: number
  }
  showPrivacyEffectSummary: boolean
  onExplainPrivacy(): void
  onOpenControls(): void
  onExitEffectsPreview(): void
  onDeveloperPreviewModeChange(mode: WaypointDeveloperPreviewMode): void
  onDeveloperSandboxChange(setting: keyof WaypointPrivacySandboxState, enabled: boolean): void
}

const trips = [
  { city: 'Lisbon', dates: '12–18 Sep', meta: 'Confirmed', image: '/cards/lisbon.jpg' },
  { city: 'Copenhagen', dates: '03–07 Nov', meta: 'City break', image: '/cards/copenhagen.jpg' },
]

const genericDestinations = [
  { city: 'Porto', note: 'Popular this month', price: 'from €128', image: '/cards/porto.jpg' },
  { city: 'Ljubljana', note: 'Popular this month', price: 'from €104', image: '/cards/ljubljana.jpg' },
  { city: 'Valencia', note: 'Popular this month', price: 'from €119', image: '/cards/valencia.jpg' },
]

const personalisedDestinations = [
  { city: 'Reykjavík', note: 'Matches your coastal saves', price: 'from €176', image: '/cards/reykjavik.jpg' },
  { city: 'Marrakesh', note: 'Based on your design stays', price: 'from €142', image: '/cards/marrakesh.jpg' },
  { city: 'São Miguel', note: 'For your nature shortlist', price: 'from €156', image: '/cards/azores.jpg' },
]

const fieldClassName =
  'h-11 rounded-none border-x-0 border-t-0 border-b border-foreground/15 bg-transparent px-0.5 text-base font-medium shadow-none focus-visible:border-foreground focus-visible:ring-0'

function ArtCard({ image, title, leading, trailing }: { image: string; title: string; leading: string; trailing: string }) {
  return (
    <article className="transition-opacity duration-200 hover:opacity-80">
      <img src={image} alt="" className="aspect-square w-full rounded-xl object-cover" />
      <h3 className="mt-4 text-[1.1rem] font-medium tracking-tight">{title}</h3>
      <p className="mt-2 flex flex-wrap gap-2.5 text-sm font-medium">
        <span>{leading}</span>
        <span className="text-muted-foreground">{trailing}</span>
      </p>
    </article>
  )
}

function SecondaryContent({
  focused,
  discovery,
  effectsPreview,
  onInspect,
  children,
}: {
  focused: boolean
  discovery: WaypointExperienceViewModel['discovery']
  effectsPreview: boolean
  onInspect(surfaceId: WaypointProductSurfaceId): void
  children: ReactNode
}) {
  if (!focused) return children
  return (
    <details
      data-clearrights-surface="secondary-content"
      data-clearrights-result="hidden"
      className="relative mx-5 mb-16 border-y border-foreground/10 sm:mx-8"
    >
      {effectsPreview && <SurfaceInspectButton label="Secondary travel content" onClick={() => onInspect('secondary-content')} />}
      <summary className="cursor-pointer py-5 font-medium">
        Travel ideas · {discovery === 'personalised' ? 'Based on your interests' : 'Generic suggestions'}
      </summary>
      <div className="pt-6">{children}</div>
    </details>
  )
}

export function TravelProductPage({
  controlsAction,
  agentActivityAction,
  experience,
  effectsPreview,
  developerPreview,
  privacyEffectStatus,
  showPrivacyEffectSummary,
  onExplainPrivacy,
  onOpenControls,
  onExitEffectsPreview,
  onDeveloperPreviewModeChange,
  onDeveloperSandboxChange,
}: TravelProductPageProps) {
  const [selectedSurfaceId, setSelectedSurfaceId] = useState<WaypointProductSurfaceId | null>(null)
  const destinations = experience.discovery === 'personalised' ? personalisedDestinations : genericDestinations
  const focused = experience.accessibility.readingLayout === 'focused'
  const selectedEffect = selectedSurfaceId
    ? experience.effects.find(({ surfaceId }) => surfaceId === selectedSurfaceId) ?? null
    : null

  return (
    <main data-effects-preview={effectsPreview ? 'true' : undefined} className="min-h-svh bg-background text-foreground">
      {effectsPreview && developerPreview && (
        <EffectsPreviewBar
          preview={developerPreview}
          onExit={onExitEffectsPreview}
          onModeChange={onDeveloperPreviewModeChange}
          onSandboxChange={onDeveloperSandboxChange}
          selectedSurfaceId={selectedSurfaceId}
          onInspect={setSelectedSurfaceId}
        />
      )}
      {effectsPreview && developerPreview && selectedEffect && (
        <DeveloperSurfaceInspector
          effect={selectedEffect}
          preview={developerPreview}
          onClose={() => setSelectedSurfaceId(null)}
        />
      )}
      <header className="border-b border-foreground/8">
        <div className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8">
          <span className="text-base font-medium tracking-tight">Waypoint</span>
          <nav className="flex shrink-0 items-center gap-1" aria-label="Account navigation">
            <Button variant="ghost" className="hidden h-9 rounded-full px-3.5 sm:inline-flex">Trips</Button>
            <Button variant="ghost" className="hidden h-9 rounded-full px-3.5 md:inline-flex" onClick={onExplainPrivacy}>
              How privacy works
            </Button>
            {agentActivityAction}
            {controlsAction}
          </nav>
        </div>
      </header>

      <section className="mx-auto w-[min(45rem,calc(100%-2.5rem))] pt-16 pb-16 sm:w-[min(45rem,calc(100%-4rem))] sm:pt-20 sm:pb-16">
        <h1 className="font-heading text-[clamp(2.25rem,5vw,3rem)] font-medium tracking-tight leading-[1.1]">
          Where do you want to go next?
        </h1>
        <p className="mt-4 mb-10 max-w-xl text-lg text-muted-foreground">
          Plan a flexible trip while keeping control of how the service uses your data.
        </p>
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(event) => event.preventDefault()}>
          <div className="space-y-2">
            <Label htmlFor="destination" className="text-[13px] font-medium text-muted-foreground">Destination</Label>
            <Input id="destination" className={fieldClassName} placeholder="City or region" defaultValue="Lisbon" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="travel-dates" className="text-[13px] font-medium text-muted-foreground">Travel dates</Label>
            <Input id="travel-dates" className={fieldClassName} defaultValue="12 Sep – 18 Sep" />
          </div>
          <Button type="submit" className="h-9 rounded-full px-5">Search</Button>
        </form>
      </section>

      {!effectsPreview && showPrivacyEffectSummary && (
        <PrivacyEffectSummary
          experience={experience}
          status={privacyEffectStatus}
        />
      )}

      <section className="px-5 pb-16 sm:px-8 sm:pb-20" aria-labelledby="upcoming-trips">
        <h2 id="upcoming-trips" tabIndex={-1} className="mb-7 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Upcoming trips
        </h2>
        <div className="grid gap-x-6 gap-y-12 sm:gap-y-20 md:grid-cols-3">
          {trips.map((trip) => (
            <ArtCard key={trip.city} image={trip.image} title={trip.city} leading={trip.meta} trailing={trip.dates} />
          ))}
        </div>
      </section>

      <section className="border-y border-foreground/10 px-5 py-12 sm:px-8 sm:py-14" aria-labelledby="trip-essentials">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[0.75fr_2.25fr]">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Always available</p>
            <h2 id="trip-essentials" className="mt-3 text-2xl font-medium tracking-tight">Trip essentials</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <EssentialStatus surface="trip-summary" title="Booking ready" body="Your itinerary and passenger details remain available." effectsPreview={effectsPreview} onInspect={setSelectedSurfaceId} />
            <EssentialStatus surface="protection-status" title="Account protected" body="Security checks continue to protect trips and account actions." effectsPreview={effectsPreview} onInspect={setSelectedSurfaceId} />
            <EssentialStatus surface="trip-updates" title="Updates on" body="Confirmations and operational schedule changes can still reach you." effectsPreview={effectsPreview} onInspect={setSelectedSurfaceId} />
          </div>
        </div>
      </section>

      <SecondaryContent focused={focused} discovery={experience.discovery} effectsPreview={effectsPreview} onInspect={setSelectedSurfaceId}>
        <section
          data-clearrights-surface="travel-discovery"
          data-clearrights-result={experience.discovery}
          className="relative px-5 py-16 sm:px-8 sm:py-24"
          aria-labelledby="destination-ideas"
        >
          {effectsPreview && <SurfaceInspectButton label="Travel discovery" onClick={() => setSelectedSurfaceId('travel-discovery')} />}
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-medium text-muted-foreground">
              {experience.discovery === 'personalised' ? 'Personalised discovery' : 'Generic discovery'}
            </p>
            <h2 id="destination-ideas" className="mt-3 text-2xl font-medium tracking-tight">
              {experience.discovery === 'personalised'
                ? 'Ideas shaped by your travel interests'
                : 'Popular places, selected without profile data'}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {experience.discovery === 'personalised'
                ? 'Waypoint is using the represented recommendations setting to tailor this list.'
                : 'Recommendations are off, so everyone sees this same sample selection.'}
            </p>
          </div>
          <div className="grid gap-x-6 gap-y-12 sm:gap-y-20 md:grid-cols-3">
            {destinations.map((destination) => (
              <ArtCard key={destination.city} image={destination.image} title={destination.city} leading={destination.note} trailing={destination.price} />
            ))}
          </div>
        </section>

        {(effectsPreview || experience.nearbyGuide === 'visible' || experience.partnerOffer === 'visible') && (
          <section className="px-5 pb-20 sm:px-8 sm:pb-24" aria-label="Optional travel services">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-6">
              {experience.nearbyGuide === 'visible'
                ? <NearbyGuide effectsPreview={effectsPreview} onInspect={setSelectedSurfaceId} />
                : effectsPreview && <HiddenSurfacePlaceholder surfaceId="nearby-guide" label="Nearby guide" setting="location_suggestions = false" onInspect={setSelectedSurfaceId} />}
              {experience.partnerOffer === 'visible'
                ? <PartnerOffer effectsPreview={effectsPreview} onInspect={setSelectedSurfaceId} />
                : effectsPreview && <HiddenSurfacePlaceholder surfaceId="partner-offer" label="Partner rail offer" setting="partner_advertising = false" onInspect={setSelectedSurfaceId} />}
            </div>
          </section>
        )}
      </SecondaryContent>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground/10 px-5 py-8 text-sm text-muted-foreground sm:px-8">
        <span>Waypoint Travel · fictional product demo</span>
        <nav className="flex flex-wrap gap-5" aria-label="Waypoint footer">
          <button type="button" aria-label="Open privacy settings from footer" className="font-medium text-foreground" onClick={onOpenControls}>Privacy settings</button>
          <button type="button" className="font-medium text-foreground" onClick={onExplainPrivacy}>ClearRights integration</button>
        </nav>
      </footer>
    </main>
  )
}

function PrivacyEffectSummary({
  experience,
  status,
}: {
  experience: WaypointExperienceViewModel
  status: TravelProductPageProps['privacyEffectStatus']
}) {
  return (
    <section
      data-testid="privacy-effect-summary"
      className="border-y border-foreground/10 bg-foreground/[0.02] px-5 py-6 sm:px-8"
      aria-labelledby="waypoint-privacy-effect"
    >
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.4fr] lg:items-center">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">Applied privacy effect</p>
          <h2 id="waypoint-privacy-effect" className="mt-1 text-xl font-medium tracking-tight">What Waypoint is using now</h2>
        </div>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2">
          <EffectValue label="Recommendations" value={experience.discovery === 'personalised' ? 'Personalised' : 'Generic'} />
          <EffectValue label="Nearby guide" value={experience.nearbyGuide === 'visible' ? 'Visible' : 'Hidden'} />
          <EffectValue label="Partner offer" value={experience.partnerOffer === 'visible' ? 'Visible' : 'Hidden'} />
        </dl>
      </div>
      {status.pendingChanges > 0 && (
        <div className="mt-5 border-l-2 border-foreground pl-3 text-sm">
          <p className="font-medium">{status.pendingChanges} {status.pendingChanges === 1 ? 'change' : 'changes'} prepared · Not applied yet</p>
          <p className="mt-1 text-muted-foreground">The product still reflects the applied values shown above.</p>
        </div>
      )}
    </section>
  )
}

function EffectValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-sm bg-background px-3 py-3">
      <dt className="truncate text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
    </div>
  )
}

function EffectsPreviewBar({
  preview,
  onExit,
  onModeChange,
  onSandboxChange,
  selectedSurfaceId,
  onInspect,
}: {
  preview: WaypointDeveloperPreviewModel
  onExit(): void
  onModeChange(mode: WaypointDeveloperPreviewMode): void
  onSandboxChange(setting: keyof WaypointPrivacySandboxState, enabled: boolean): void
  selectedSurfaceId: WaypointProductSurfaceId | null
  onInspect(surfaceId: WaypointProductSurfaceId): void
}) {
  const { experience } = preview
  const hidden = experience.effects.filter(({ result }) => result === 'hidden').map(({ surfaceLabel }) => surfaceLabel)
  const evidence = preview.evidence.kind === 'applied'
    ? `Applied revision ${preview.evidence.revision} · ${preview.evidence.verified ? 'Receipt verified' : 'No matching receipt'}`
    : preview.evidence.kind === 'pending_plan'
      ? `${preview.evidence.planId} · Preview only · Not applied`
      : 'Temporary overrides · Preview only · Not applied'

  return (
    <aside className="sticky top-0 z-30 border-b border-blue-700/20 bg-blue-50 px-5 py-3 text-blue-950 sm:px-8" aria-label="Privacy product effect preview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Privacy effects · {experience.effects.length} declared mappings</p>
          <p className="mt-1 text-xs text-blue-900/70">
            Hidden product surfaces: {hidden.length > 0 ? hidden.join(', ') : 'None'}
          </p>
          <p className="mt-1 text-xs font-medium">{evidence}</p>
        </div>
        <Button variant="outline" className="rounded-full border-blue-950/20 bg-transparent hover:bg-blue-100" onClick={onExit}>
          Exit effects view
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Developer preview source">
        {([
          { id: 'applied', label: 'Applied', disabled: false },
          { id: 'pending', label: 'Pending plan', disabled: !preview.pendingAvailable },
          { id: 'sandbox', label: 'Sandbox', disabled: false },
        ] as const).map(({ id, label, disabled }) => (
          <button
            key={id}
            type="button"
            aria-pressed={preview.mode === id}
            disabled={disabled}
            className="rounded-full border border-blue-950/20 px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-blue-950 aria-pressed:text-blue-50"
            onClick={() => onModeChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {preview.mode === 'sandbox' && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Sandbox privacy settings">
          {([
            ['recommendations', 'Recommendations'],
            ['location_suggestions', 'Location suggestions'],
            ['partner_advertising', 'Partner offers'],
          ] as const).map(([setting, label]) => (
            <button
              key={setting}
              type="button"
              role="switch"
              aria-checked={preview.sandbox[setting]}
              className="rounded-full border border-blue-950/20 bg-white/50 px-3 py-1.5 text-xs font-medium aria-checked:bg-blue-200"
              onClick={() => onSandboxChange(setting, !preview.sandbox[setting])}
            >
              {label}: {preview.sandbox[setting] ? 'On' : 'Off'}
            </button>
          ))}
        </div>
      )}
      <label className="mt-3 flex max-w-sm flex-col gap-1 text-xs font-medium">
        Inspect a mapped surface
        <select
          className="h-9 border border-blue-950/20 bg-white px-3 text-sm text-blue-950"
          value={selectedSurfaceId ?? ''}
          onChange={(event) => {
            if (event.target.value) onInspect(event.target.value as WaypointProductSurfaceId)
          }}
        >
          <option value="">Choose a surface…</option>
          {experience.effects.map(({ surfaceId, surfaceLabel, result }) => (
            <option key={surfaceId} value={surfaceId}>{surfaceLabel} · {result}</option>
          ))}
        </select>
      </label>
    </aside>
  )
}

function EssentialStatus({
  surface,
  title,
  body,
  effectsPreview,
  onInspect,
}: {
  surface: Extract<WaypointProductSurfaceId, 'trip-summary' | 'protection-status' | 'trip-updates'>
  title: string
  body: string
  effectsPreview: boolean
  onInspect(surfaceId: WaypointProductSurfaceId): void
}) {
  return (
    <article data-clearrights-surface={surface} data-clearrights-result="required" className="relative border-t border-foreground/15 pt-4">
      {effectsPreview && <SurfaceInspectButton label={title} onClick={() => onInspect(surface)} />}
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Required service</p>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  )
}

function NearbyGuide({ effectsPreview, onInspect }: { effectsPreview: boolean; onInspect(surfaceId: WaypointProductSurfaceId): void }) {
  return (
    <article data-clearrights-surface="nearby-guide" data-clearrights-result="visible" className="relative min-h-72 border border-foreground/10 p-6">
      {effectsPreview && <SurfaceInspectButton label="Nearby guide" onClick={() => onInspect('nearby-guide')} />}
      <p className="text-sm font-medium text-muted-foreground">Nearby guide</p>
      <h2 className="mt-3 text-2xl font-medium tracking-tight">Around your Lisbon stay</h2>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
        Available because location suggestions are on in this demo. Browser location permission remains separate.
      </p>
      <ul className="mt-8 grid gap-0 sm:grid-cols-3">
        {['Alfama viewpoints', 'Riverside walks', 'Neighbourhood cafés'].map((place) => (
          <li key={place} className="border-t border-foreground/10 py-4 text-sm font-medium sm:pr-4">{place}</li>
        ))}
      </ul>
    </article>
  )
}

function PartnerOffer({ effectsPreview, onInspect }: { effectsPreview: boolean; onInspect(surfaceId: WaypointProductSurfaceId): void }) {
  return (
    <article data-clearrights-surface="partner-offer" data-clearrights-result="visible" className="relative flex min-h-72 flex-col border border-foreground/10 p-4">
      {effectsPreview && <SurfaceInspectButton label="Partner rail offer" onClick={() => onInspect('partner-offer')} />}
      <img src="/cards/rail-pass.jpg" alt="" className="aspect-[16/9] w-full rounded-lg object-cover" />
      <div className="grid flex-1 gap-6 p-2 pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Partner offer</p>
          <h2 className="mt-3 text-2xl font-medium tracking-tight">A flexible rail pass for your saved city trips</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Shown because partner advertising is active. The demo does not contact a real advertising network.
          </p>
        </div>
        <Button variant="outline" className="rounded-full">View offer</Button>
      </div>
    </article>
  )
}

function HiddenSurfacePlaceholder({
  surfaceId,
  label,
  setting,
  onInspect,
}: {
  surfaceId: Extract<WaypointProductSurfaceId, 'nearby-guide' | 'partner-offer'>
  label: string
  setting: string
  onInspect(surfaceId: WaypointProductSurfaceId): void
}) {
  return (
    <article
      data-clearrights-surface={surfaceId}
      data-clearrights-result="hidden"
      className="relative flex min-h-48 items-center justify-center border border-dashed border-blue-800/30 bg-blue-50/50 p-6 text-center text-blue-950"
    >
      <SurfaceInspectButton label={label} onClick={() => onInspect(surfaceId)} />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-2 text-xs text-blue-900/70">Hidden in the product</p>
        <p className="mt-1 font-mono text-xs">{setting}</p>
      </div>
    </article>
  )
}

function SurfaceInspectButton({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button
      type="button"
      className="absolute right-2 top-2 z-10 rounded-full border border-blue-800/25 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-950 shadow-sm"
      aria-label={`Inspect ${label}`}
      onClick={onClick}
    >
      Inspect
    </button>
  )
}
