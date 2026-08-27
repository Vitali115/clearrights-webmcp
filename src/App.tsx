import { useEffect, useRef, useState } from 'react'
import type {
  ActivityCoordinator,
  PersonalControlsCoordinator,
  PrivacyController,
  PrivacyViewCoordinator,
} from '@/application'
import type { AccessibilityRuntime, SiteGuideRuntime } from '@/domain'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { AgentActivityIndicator } from '@/ui/AgentActivityIndicator'
import { PrivacyChoiceBanner } from '@/ui/PrivacyChoiceBanner'
import { PrivacyExplainerPage } from '@/ui/PrivacyExplainerPage'
import { TravelProductPage } from '@/ui/TravelProductPage'
import { PersonalControls } from '@/ui/waypoint/PersonalControls'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'
import { waypointSiteGuideCatalog } from '@/demo/waypoint/site-guide-catalog'

interface AppProps {
  controller: PrivacyController
  privacyUi: PrivacyViewCoordinator
  controlsUi: PersonalControlsCoordinator
  accessibility: AccessibilityRuntime
  siteGuide: SiteGuideRuntime
  activity: ActivityCoordinator
  webMcpAvailable: boolean
}

type AppPage = 'travel' | 'privacy'

function pageFromLocation(): AppPage {
  return window.location.hash === '#/privacy' ? 'privacy' : 'travel'
}

export default function App({
  controller,
  privacyUi,
  controlsUi,
  accessibility,
  siteGuide,
  activity,
  webMcpAvailable,
}: AppProps) {
  const [snapshot, setSnapshot] = useState(() => controller.getSnapshot())
  const [page, setPage] = useState<AppPage>(pageFromLocation)
  const [privacyView, setPrivacyView] = useState(() => privacyUi.getSnapshot())
  const [controlsSnapshot, setControlsSnapshot] = useState(() => controlsUi.getSnapshot())
  const [accessibilitySnapshot, setAccessibilitySnapshot] = useState(() => accessibility.getSnapshot())
  const [siteGuideSnapshot, setSiteGuideSnapshot] = useState(() => siteGuide.getSnapshot())
  const [activitySnapshot, setActivitySnapshot] = useState(() => activity.getSnapshot())
  const bridgedPrivacySequence = useRef<number | null>(null)

  useEffect(() => controller.subscribe(setSnapshot), [controller])
  useEffect(() => {
    const syncPage = () => setPage(pageFromLocation())
    window.addEventListener('hashchange', syncPage)
    window.addEventListener('popstate', syncPage)
    return () => {
      window.removeEventListener('hashchange', syncPage)
      window.removeEventListener('popstate', syncPage)
    }
  }, [])
  useEffect(() => {
    return privacyUi.subscribe((next) => {
      setPrivacyView(next)
      if (
        next.navigation.origin === 'agent'
        && next.agentActivity?.status === 'opened'
        && bridgedPrivacySequence.current !== next.agentActivity.sequence
      ) {
        bridgedPrivacySequence.current = next.agentActivity.sequence
        controlsUi.openPanel('privacy', {
          origin: 'agent',
          targetId: `privacy-${next.navigation.view}`,
          message: next.agentActivity.message,
        })
      }
    })
  }, [controlsUi, privacyUi])
  useEffect(() => controlsUi.subscribe(setControlsSnapshot), [controlsUi])
  useEffect(() => accessibility.subscribe(setAccessibilitySnapshot), [accessibility])
  useEffect(() => siteGuide.subscribe(setSiteGuideSnapshot), [siteGuide])
  useEffect(() => activity.subscribe(setActivitySnapshot), [activity])

  const setSheetOpen = (open: boolean) => {
    if (open) controlsUi.openPanel(controlsSnapshot.section, { origin: 'human', targetId: controlsSnapshot.section })
    else controlsUi.close()
  }

  const openPrivacySettings = () => {
    privacyUi.navigate({ view: 'home', origin: 'human' })
    controlsUi.openPanel('privacy', { origin: 'human', targetId: 'privacy' })
  }

  const navigatePage = (next: AppPage) => {
    const hash = next === 'privacy' ? '#/privacy' : '#/'
    window.history.pushState(null, '', hash)
    setPage(next)
  }

  const resetDemo = async () => {
    await controller.resetDemo(true)
    await accessibility.reset()
    privacyUi.revokeAgentPreparation()
    privacyUi.navigate({ view: 'home', origin: 'human' })
    activity.clear()
    controlsUi.close()
    window.history.replaceState(null, '', '#/')
    setPage('travel')
  }

  return (
    <Sheet open={controlsSnapshot.open} onOpenChange={setSheetOpen}>
      {!controlsSnapshot.open && <AgentActivityIndicator activity={controlsSnapshot.agentActivity} placement="page" />}
      <div
        onClickCapture={() => controlsUi.acknowledge()}
        onKeyDownCapture={() => controlsUi.acknowledge()}
        onScrollCapture={() => controlsUi.acknowledge()}
      >
      {page === 'travel' ? (
        <>
          <TravelProductPage
            onExplainPrivacy={() => navigatePage('privacy')}
            privacyState={snapshot.record.state.processing}
            readingLayout={accessibilitySnapshot.current.readingLayout}
            controlsAction={(
              <Button variant="ghost" className="h-9 rounded-full bg-foreground/5 px-5 hover:bg-foreground/10" onClick={() => controlsUi.openPanel('privacy', { origin: 'human', targetId: 'privacy' })}>
                Personal controls
              </Button>
            )}
          />
          <PrivacyChoiceBanner
            controller={controller}
            pending={snapshot.record.notice.status !== 'recorded'}
            webMcpAvailable={webMcpAvailable}
            onManage={openPrivacySettings}
            onLearn={() => navigatePage('privacy')}
            onApplied={() => {
              privacyUi.revokeAgentPreparation()
              activity.record({
                source: 'human',
                module: 'privacy',
                action: 'direct_choice',
                outcome: 'succeeded',
                summary: 'You recorded a direct privacy choice.',
                targetId: controller.getReceipt()?.id,
              })
            }}
          />
        </>
      ) : (
        <PrivacyExplainerPage
          snapshot={snapshot}
          webMcpAvailable={webMcpAvailable}
          onBack={() => navigatePage('travel')}
          onOpenSettings={openPrivacySettings}
        />
      )}
      </div>
      <PersonalControls
        key={`controls-${snapshot.plan?.id ?? snapshot.record.state.revision}`}
        controller={controller}
        privacyUi={privacyUi}
        privacyView={privacyView}
        privacySnapshot={snapshot}
        controlsUi={controlsUi}
        controlsSnapshot={controlsSnapshot}
        accessibility={accessibility}
        accessibilityCatalog={waypointAccessibilityCatalog}
        accessibilitySnapshot={accessibilitySnapshot}
        siteGuide={siteGuide}
        siteGuideCatalog={waypointSiteGuideCatalog}
        siteGuideSnapshot={siteGuideSnapshot}
        activity={activity}
        activitySnapshot={activitySnapshot}
        webMcpAvailable={webMcpAvailable}
        onReset={resetDemo}
      />
    </Sheet>
  )
}
