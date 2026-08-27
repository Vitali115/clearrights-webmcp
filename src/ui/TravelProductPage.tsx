import type { ReactNode } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowRight,
  CalendarDays,
  Compass,
  MapPin,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

interface TravelProductPageProps {
  privacyAction: ReactNode
}

const trips = [
  { city: 'Lisbon', dates: '12–18 Sep', detail: 'Hotel and airport transfer confirmed', tone: 'bg-amber-100 text-amber-950' },
  { city: 'Copenhagen', dates: '03–07 Nov', detail: 'Flexible city break for two', tone: 'bg-sky-100 text-sky-950' },
]

const destinations = [
  { city: 'Porto', note: 'Riverside stays', price: 'from €128' },
  { city: 'Ljubljana', note: 'Green city breaks', price: 'from €104' },
  { city: 'Valencia', note: 'Sun and design', price: 'from €119' },
]

export function TravelProductPage({ privacyAction }: TravelProductPageProps) {
  return (
    <main className="min-h-svh bg-muted/30 text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:h-16 sm:px-6 sm:py-0">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="size-4" aria-hidden="true" />
            </div>
            <span className="font-heading text-lg font-semibold tracking-tight">Waypoint</span>
            <Badge variant="secondary" className="hidden sm:inline-flex">Travel demo</Badge>
          </div>
          <nav className="flex shrink-0 items-center gap-2" aria-label="Account navigation">
            <Button variant="ghost" className="hidden sm:inline-flex">Trips</Button>
            {privacyAction}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        <section className="overflow-hidden rounded-3xl bg-primary px-8 py-12 text-primary-foreground shadow-sm">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-5">
              <Sparkles data-icon="inline-start" /> Thoughtful European escapes
            </Badge>
            <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Where do you want to go next?
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-foreground/75">
              Plan a flexible trip while keeping control of how the service uses your data.
            </p>
          </div>
          <Card className="mt-8 max-w-4xl bg-background text-foreground">
            <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="destination" className="pl-9" placeholder="City or region" defaultValue="Lisbon" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="travel-dates">Travel dates</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="travel-dates" className="pl-9" defaultValue="12 Sep – 18 Sep" />
                </div>
              </div>
              <Button size="lg"><Search data-icon="inline-start" /> Search trips</Button>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="upcoming-trips">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ready when you are</p>
              <h2 id="upcoming-trips" className="font-heading text-2xl font-semibold tracking-tight">Upcoming trips</h2>
            </div>
            <Button variant="ghost">View all <ArrowRight data-icon="inline-end" /></Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {trips.map((trip) => (
              <Card key={trip.city}>
                <CardHeader>
                  <div className={`mb-3 grid size-12 place-items-center rounded-xl ${trip.tone}`}>
                    <Compass className="size-5" aria-hidden="true" />
                  </div>
                  <CardTitle>{trip.city}</CardTitle>
                  <CardDescription>{trip.dates}</CardDescription>
                  <CardAction><Badge variant="outline">Confirmed</Badge></CardAction>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{trip.detail}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="destination-ideas">
          <div className="mb-4">
            <p className="text-sm font-medium text-muted-foreground">A little inspiration</p>
            <h2 id="destination-ideas" className="font-heading text-2xl font-semibold tracking-tight">Destination ideas</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {destinations.map((destination) => (
              <Card key={destination.city} size="sm">
                <CardHeader>
                  <CardTitle>{destination.city}</CardTitle>
                  <CardDescription>{destination.note}</CardDescription>
                  <CardAction><Badge variant="secondary">{destination.price}</Badge></CardAction>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <footer className="flex items-center gap-2 border-t py-6 text-sm text-muted-foreground">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Privacy information and legal bases are declared by the demo service.
        </footer>
      </div>
    </main>
  )
}
