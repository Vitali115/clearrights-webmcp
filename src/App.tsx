import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function App() {
  return (
    <main className="grid min-h-svh place-items-center bg-background text-foreground">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Waypoint Travel</Badge>
          <CardTitle>ClearRights foundation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Privacy controls are being prepared.
        </CardContent>
      </Card>
    </main>
  )
}
