import { useEffect, useState } from 'react'
import type { PrivacyController, PrivacyViewCoordinator } from '@/application'
import { Button } from '@/components/ui/button'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import { PrivacyCenter } from '@/ui/PrivacyCenter'
import { PrivacyChoiceBanner } from '@/ui/PrivacyChoiceBanner'
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

  const openPrivacySettings = () => {
    privacyUi.navigate({ view: 'home', origin: 'human' })
    setPrivacyOpen(true)
  }

  return (
    <Sheet open={privacyOpen} onOpenChange={setSheetOpen}>
      <TravelProductPage
        privacyAction={(
          <SheetTrigger asChild>
            <Button variant="ghost" className="h-9 rounded-full bg-foreground/5 px-5 hover:bg-foreground/10">
              Privacy settings
            </Button>
          </SheetTrigger>
        )}
      />
      <PrivacyChoiceBanner
        controller={controller}
        pending={snapshot.record.notice.status === 'pending'}
        webMcpAvailable={webMcpAvailable}
        onManage={openPrivacySettings}
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
