import { useEffect, useState } from 'react'
import type { PrivacyController, PrivacyViewCoordinator } from '@/application'
import { Button } from '@/components/ui/button'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import { ShieldCheck } from 'lucide-react'
import { PrivacyCenter } from '@/ui/PrivacyCenter'
import { TravelProductPage } from '@/ui/TravelProductPage'

interface AppProps {
  controller: PrivacyController
  privacyUi: PrivacyViewCoordinator
  webMcpAvailable: boolean
}

export default function App({ controller, privacyUi, webMcpAvailable }: AppProps) {
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot())
  const [privacyView, setPrivacyView] = useState(() => privacyUi.getSnapshot())
  const [privacyOpen, setPrivacyOpen] = useState(
    () => privacyUi.getSnapshot().navigation.origin === 'agent',
  )

  useEffect(() => controller.subscribe(setSnapshot), [controller])
  useEffect(() => {
    return privacyUi.subscribe((next) => {
      setPrivacyView(next)
      if (next.navigation.origin === 'agent') setPrivacyOpen(true)
    })
  }, [privacyUi])

  const setSheetOpen = (open: boolean) => {
    setPrivacyOpen(open)
    if (open && privacyView.agentActivity?.status !== 'opened') {
      privacyUi.navigate({ view: 'home', origin: 'human' })
    }
  }

  return (
    <Sheet open={privacyOpen} onOpenChange={setSheetOpen}>
      <TravelProductPage
        privacyAction={(
          <SheetTrigger asChild>
            <Button variant="outline">
              <ShieldCheck data-icon="inline-start" /> Privacy Center
            </Button>
          </SheetTrigger>
        )}
      />
      <PrivacyCenter
        key={snapshot.plan?.id ?? `idle-${snapshot.record.state.revision}`}
        controller={controller}
        privacyUi={privacyUi}
        privacyView={privacyView}
        snapshot={snapshot}
        webMcpAvailable={webMcpAvailable}
      />
    </Sheet>
  )
}
