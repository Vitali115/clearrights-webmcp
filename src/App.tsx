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
import { TravelProductPage } from '@/ui/TravelProductPage'
import { ClearRightsExplainerPage } from '@/ui/waypoint/ClearRightsExplainerPage'
import { PersonalControls } from '@/ui/waypoint/PersonalControls'
import { WaypointInfoPage } from '@/ui/waypoint/WaypointInfoPage'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'
import { getWaypointInfoPage } from '@/demo/waypoint/info-pages'
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

type AppRoute =
  | { kind: 'home'; focus: string | null }
  | { kind: 'clearrights' }
  | { kind: 'info'; id: string }

function routeFromLocation(): AppRoute {
  const hash = window.location.hash
  if (hash === '#/privacy' || hash === '#/clearrights') return { kind: 'clearrights' }
  if (hash.startsWith('#/info/')) {
    const id = decodeURIComponent(hash.slice('#/info/'.length).split('?')[0] ?? '')
    if (getWaypointInfoPage(id)) return { kind: 'info', id }
  }
  const focus = hash.startsWith('#/?') ? new URLSearchParams(hash.slice(3)).get('focus') : null
  return { kind: 'home', focus }
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
  const [route, setRoute] = useState<AppRoute>(routeFromLocation)
  const [privacyView, setPrivacyView] = useState(() => privacyUi.getSnapshot())
  const [controlsSnapshot, setControlsSnapshot] = useState(() => controlsUi.getSnapshot())
  const [accessibilitySnapshot, setAccessibilitySnapshot] = useState(() => accessibility.getSnapshot())
  const [siteGuideSnapshot, setSiteGuideSnapshot] = useState(() => siteGuide.getSnapshot())
  const [activitySnapshot, setActivitySnapshot] = useState(() => activity.getSnapshot())
  const bridgedPrivacySequence = useRef<number | null>(null)

  useEffect(() => controller.subscribe(setSnapshot), [controller])
  useEffect(() => {
    if (window.location.hash === '#/privacy') window.history.replaceState(null, '', '#/clearrights')
    const syncRoute = () => {
      if (window.location.hash === '#/privacy') window.history.replaceState(null, '', '#/clearrights')
      setRoute(routeFromLocation())
    }
    window.addEventListener('hashchange', syncRoute)
    window.addEventListener('popstate', syncRoute)
    return () => {
      window.removeEventListener('hashchange', syncRoute)
      window.removeEventListener('popstate', syncRoute)
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
  useEffect(() => {
    if (route.kind === 'home') {
      if (route.focus) document.getElementById(route.focus)?.focus()
      return
    }
    document.querySelector<HTMLElement>('[data-route-focus]')?.focus()
  }, [route])

  const setSheetOpen = (open: boolean) => {
    if (open) controlsUi.openPanel(controlsSnapshot.section, { origin: 'human', targetId: controlsSnapshot.section })
    else controlsUi.close()
  }

  const openPrivacySettings = () => {
    privacyUi.navigate({ view: 'home', origin: 'human' })
    controlsUi.openPanel('privacy', { origin: 'human', targetId: 'privacy' })
  }

  const openPersonalControls = () => {
    controlsUi.openPanel(controlsSnapshot.section, { origin: 'human', targetId: controlsSnapshot.section })
  }

  const navigate = (hash: string) => {
    window.history.pushState(null, '', hash)
    setRoute(routeFromLocation())
  }

  const resetDemo = async () => {
    await controller.resetDemo(true)
    await accessibility.reset()
    privacyUi.revokeAgentPreparation()
    privacyUi.navigate({ view: 'home', origin: 'human' })
    activity.clear()
    controlsUi.close()
    window.history.replaceState(null, '', '#/')
    setRoute({ kind: 'home', focus: null })
  }

  const controlsAction = (
    <Button variant="ghost" className="h-9 rounded-full bg-foreground/5 px-5 hover:bg-foreground/10" onClick={openPersonalControls}>
      Personal controls
    </Button>
  )
  const agentActivityAction = !controlsSnapshot.open
    ? <AgentActivityIndicator activity={controlsSnapshot.agentActivity} placement="page" />
    : null

  const infoPage = route.kind === 'info' ? getWaypointInfoPage(route.id) : null

  return (
    <Sheet open={controlsSnapshot.open} onOpenChange={setSheetOpen}>
      <div
        onClickCapture={() => controlsUi.acknowledge()}
        onKeyDownCapture={() => controlsUi.acknowledge()}
        onScrollCapture={() => controlsUi.acknowledge()}
      >
      {route.kind === 'home' ? (
        <>
          <TravelProductPage
            onExplainPrivacy={() => navigate('#/clearrights')}
            privacyState={snapshot.record.state.processing}
            readingLayout={accessibilitySnapshot.current.readingLayout}
            controlsAction={controlsAction}
            agentActivityAction={agentActivityAction}
          />
          <PrivacyChoiceBanner
            controller={controller}
            pending={snapshot.record.notice.status !== 'recorded'}
            webMcpAvailable={webMcpAvailable}
            onManage={openPrivacySettings}
            onLearn={() => navigate('#/clearrights')}
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
      ) : route.kind === 'clearrights' ? (
        <ClearRightsExplainerPage
          snapshot={snapshot}
          accessibilitySnapshot={accessibilitySnapshot}
          siteGuideSnapshot={siteGuideSnapshot}
          webMcpAvailable={webMcpAvailable}
          controlsAction={controlsAction}
          agentActivityAction={agentActivityAction}
          onBack={() => navigate('#/')}
        />
      ) : infoPage ? (
        <WaypointInfoPage page={infoPage} controlsAction={controlsAction} agentActivityAction={agentActivityAction} onBack={() => navigate('#/')} />
      ) : (
        <TravelProductPage
          onExplainPrivacy={() => navigate('#/clearrights')}
          privacyState={snapshot.record.state.processing}
          readingLayout={accessibilitySnapshot.current.readingLayout}
          controlsAction={controlsAction}
          agentActivityAction={agentActivityAction}
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
