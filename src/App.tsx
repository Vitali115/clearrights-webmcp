import { useEffect, useRef, useState } from 'react'
import type { PrivacyController } from '@/application'
import { Button } from '@/components/ui/button'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import { ShieldCheck } from 'lucide-react'
import { PrivacyCenter } from '@/ui/PrivacyCenter'
import { TravelProductPage } from '@/ui/TravelProductPage'

interface AppProps {
  controller: PrivacyController
  webMcpAvailable: boolean
}

export default function App({ controller, webMcpAvailable }: AppProps) {
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot())
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const previousWorkflow = useRef(snapshot.workflow)

  useEffect(() => controller.subscribe(setSnapshot), [controller])

  useEffect(() => {
    if (snapshot.workflow === 'staged' && previousWorkflow.current !== 'staged') {
      setPrivacyOpen(true)
    }
    previousWorkflow.current = snapshot.workflow
  }, [snapshot.workflow])

  return (
    <Sheet open={privacyOpen} onOpenChange={setPrivacyOpen}>
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
        snapshot={snapshot}
        webMcpAvailable={webMcpAvailable}
      />
    </Sheet>
  )
}
