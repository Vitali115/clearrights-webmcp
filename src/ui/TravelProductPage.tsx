import type { ReactNode } from 'react'
import type { ProcessingState } from '@/domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TravelProductPageProps {
  privacyAction: ReactNode
  privacyState: ProcessingState
  onExplainPrivacy(): void
}

const trips = [
  { city: 'Lisbon', dates: '12–18 Sep', meta: 'Confirmed', image: '/cards/lisbon.jpg' },
  { city: 'Copenhagen', dates: '03–07 Nov', meta: 'City break', image: '/cards/copenhagen.jpg' },
]

const destinations = [
  { city: 'Porto', note: 'Riverside stays', price: 'from €128', image: '/cards/porto.jpg' },
  { city: 'Ljubljana', note: 'Green city breaks', price: 'from €104', image: '/cards/ljubljana.jpg' },
  { city: 'Valencia', note: 'Sun and design', price: 'from €119', image: '/cards/valencia.jpg' },
]

const fieldClassName =
  'h-11 rounded-none border-x-0 border-t-0 border-b border-foreground/15 bg-transparent px-0.5 text-base font-medium shadow-none focus-visible:border-foreground focus-visible:ring-0'

function ArtCard({
  image,
  title,
  leading,
  trailing,
}: {
  image: string
  title: string
  leading: string
  trailing: string
}) {
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

export function TravelProductPage({ privacyAction, privacyState, onExplainPrivacy }: TravelProductPageProps) {
  const recommendationsEnabled = privacyState.recommendations
  const locationEnabled = privacyState.location_suggestions
  const partnerOffersEnabled = privacyState.partner_advertising
  const optionalEnabled = [recommendationsEnabled, locationEnabled, partnerOffersEnabled].filter(Boolean).length

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b border-foreground/8">
        <div className="flex h-16 items-center justify-between gap-3 px-5 sm:px-8">
          <span className="text-base font-medium tracking-tight">Waypoint</span>
          <nav className="flex shrink-0 items-center gap-1" aria-label="Account navigation">
            <Button variant="ghost" className="hidden h-9 rounded-full px-3.5 sm:inline-flex">
              Trips
            </Button>
            <Button variant="ghost" className="hidden h-9 rounded-full px-3.5 md:inline-flex" onClick={onExplainPrivacy}>
              How privacy works
            </Button>
            {privacyAction}
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
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="space-y-2">
            <Label htmlFor="destination" className="text-[13px] font-medium text-muted-foreground">
              Destination
            </Label>
            <Input id="destination" className={fieldClassName} placeholder="City or region" defaultValue="Lisbon" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="travel-dates" className="text-[13px] font-medium text-muted-foreground">
              Travel dates
            </Label>
            <Input id="travel-dates" className={fieldClassName} defaultValue="12 Sep – 18 Sep" />
          </div>
          <Button type="submit" className="h-9 rounded-full px-5">
            Search
          </Button>
        </form>
      </section>

      <section className="px-5 pb-16 sm:px-8 sm:pb-20" aria-labelledby="upcoming-trips">
        <h2 id="upcoming-trips" className="mb-7 text-sm font-medium text-muted-foreground">
          Upcoming trips
        </h2>
        <div className="grid gap-x-6 gap-y-12 sm:gap-y-20 md:grid-cols-3">
          {trips.map((trip) => (
            <ArtCard
              key={trip.city}
              image={trip.image}
              title={trip.city}
              leading={trip.meta}
              trailing={trip.dates}
            />
          ))}
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-24" aria-labelledby="destination-ideas">
        <h2 id="destination-ideas" className="mb-7 text-sm font-medium text-muted-foreground">
          {recommendationsEnabled ? 'Suggestions based on your travel interests' : 'Popular destinations'}
        </h2>
        <div className="grid gap-x-6 gap-y-12 sm:gap-y-20 md:grid-cols-3">
          {destinations.map((destination) => (
            <ArtCard
              key={destination.city}
              image={destination.image}
              title={destination.city}
              leading={destination.note}
              trailing={destination.price}
            />
          ))}
        </div>
      </section>

      {locationEnabled && (
        <section className="border-y border-foreground/10 px-5 py-12 sm:px-8" aria-labelledby="nearby-lisbon">
          <div className="grid gap-7 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Location suggestions on</p>
              <h2 id="nearby-lisbon" className="mt-3 text-2xl font-medium tracking-tight">Near your Lisbon trip</h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                These suggestions use the destination context and precise-location setting represented by the local demo adapter.
              </p>
            </div>
            <ul className="grid gap-0 sm:grid-cols-3">
              {['Alfama viewpoints', 'Riverside walks', 'Neighbourhood cafés'].map((place) => (
                <li key={place} className="border-t border-foreground/10 py-4 text-sm font-medium sm:pr-4">{place}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {partnerOffersEnabled && (
        <section className="px-5 py-14 sm:px-8" aria-labelledby="partner-offer">
          <div className="grid gap-5 border border-foreground/10 p-6 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Personalised partner offer</p>
              <h2 id="partner-offer" className="mt-3 text-2xl font-medium tracking-tight">A flexible rail pass for your saved city trips</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Shown because Partner advertising is active in this local demo.
              </p>
            </div>
            <Button variant="outline" className="rounded-full">View offer</Button>
          </div>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 px-5 pb-16 text-sm font-medium text-muted-foreground sm:px-8">
        <span>Privacy information is declared by the demo service · {optionalEnabled} of 3 optional data uses active.</span>
        <button type="button" className="text-foreground" onClick={onExplainPrivacy}>How privacy works</button>
      </footer>
    </main>
  )
}
