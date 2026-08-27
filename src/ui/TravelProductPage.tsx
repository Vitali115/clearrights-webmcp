import type { ReactNode } from 'react'
import type { WaypointExperienceViewModel } from '@/demo/waypoint/product-effects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TravelProductPageProps {
  controlsAction: ReactNode
  agentActivityAction?: ReactNode
  experience: WaypointExperienceViewModel
  effectsPreview: boolean
  onExplainPrivacy(): void
  onOpenControls(): void
  onExitEffectsPreview(): void
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
  children,
}: {
  focused: boolean
  discovery: WaypointExperienceViewModel['discovery']
  children: ReactNode
}) {
  if (!focused) return children
  return (
    <details
      data-clearrights-surface="secondary-content"
      data-clearrights-result="hidden"
      className="mx-5 mb-16 border-y border-foreground/10 sm:mx-8"
    >
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
  onExplainPrivacy,
  onOpenControls,
  onExitEffectsPreview,
}: TravelProductPageProps) {
  const destinations = experience.discovery === 'personalised' ? personalisedDestinations : genericDestinations
  const focused = experience.accessibility.readingLayout === 'focused'

  return (
    <main data-effects-preview={effectsPreview ? 'true' : undefined} className="min-h-svh bg-background text-foreground">
      {effectsPreview && <EffectsPreviewBar experience={experience} onExit={onExitEffectsPreview} />}
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
            <EssentialStatus surface="trip-summary" title="Booking ready" body="Your itinerary and passenger details remain available." />
            <EssentialStatus surface="protection-status" title="Account protected" body="Security checks continue to protect trips and account actions." />
            <EssentialStatus surface="trip-updates" title="Updates on" body="Confirmations and operational schedule changes can still reach you." />
          </div>
        </div>
      </section>

      <SecondaryContent focused={focused} discovery={experience.discovery}>
        <section
          data-clearrights-surface="travel-discovery"
          data-clearrights-result={experience.discovery}
          className="px-5 py-16 sm:px-8 sm:py-24"
          aria-labelledby="destination-ideas"
        >
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

        {(experience.nearbyGuide === 'visible' || experience.partnerOffer === 'visible') && (
          <section className="px-5 pb-20 sm:px-8 sm:pb-24" aria-label="Optional travel services">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-6">
              {experience.nearbyGuide === 'visible' && <NearbyGuide />}
              {experience.partnerOffer === 'visible' && <PartnerOffer />}
            </div>
          </section>
        )}
      </SecondaryContent>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground/10 px-5 py-8 text-sm text-muted-foreground sm:px-8">
        <span>Waypoint Travel · fictional product demo</span>
        <nav className="flex flex-wrap gap-5" aria-label="Waypoint footer">
          <button type="button" aria-label="Open personal controls from footer" className="font-medium text-foreground" onClick={onOpenControls}>Personal controls</button>
          <button type="button" className="font-medium text-foreground" onClick={onExplainPrivacy}>ClearRights integration</button>
        </nav>
      </footer>
    </main>
  )
}

function EffectsPreviewBar({ experience, onExit }: { experience: WaypointExperienceViewModel; onExit(): void }) {
  const hidden = experience.effects.filter(({ result }) => result === 'hidden').map(({ surfaceLabel }) => surfaceLabel)

  return (
    <aside className="sticky top-0 z-30 border-b border-blue-700/20 bg-blue-50 px-5 py-3 text-blue-950 sm:px-8" aria-label="Developer product effect preview">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Developer preview · {experience.effects.length} declared mappings</p>
          <p className="mt-1 text-xs text-blue-900/70">
            Hidden product surfaces: {hidden.length > 0 ? hidden.join(', ') : 'None'}
          </p>
        </div>
        <Button variant="outline" className="rounded-full border-blue-950/20 bg-transparent hover:bg-blue-100" onClick={onExit}>
          Exit preview
        </Button>
      </div>
    </aside>
  )
}

function EssentialStatus({ surface, title, body }: { surface: string; title: string; body: string }) {
  return (
    <article data-clearrights-surface={surface} data-clearrights-result="required" className="border-t border-foreground/15 pt-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Required service</p>
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  )
}

function NearbyGuide() {
  return (
    <article data-clearrights-surface="nearby-guide" data-clearrights-result="visible" className="min-h-72 border border-foreground/10 p-6">
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

function PartnerOffer() {
  return (
    <article data-clearrights-surface="partner-offer" data-clearrights-result="visible" className="flex min-h-72 flex-col border border-foreground/10 p-4">
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
