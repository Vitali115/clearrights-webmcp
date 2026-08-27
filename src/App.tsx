import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type {
  ActivityCoordinator,
  PersonalControlsSection,
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
import { PersonalControls } from '@/ui/waypoint/PersonalControls'
import { WaypointInfoPage } from '@/ui/waypoint/WaypointInfoPage'
import { waypointAccessibilityCatalog } from '@/demo/waypoint/accessibility-catalog'
import { getWaypointInfoPage } from '@/demo/waypoint/info-pages'
import { selectWaypointExperience } from '@/demo/waypoint/product-effects'
import { waypointSiteGuideCatalog } from '@/demo/waypoint/site-guide-catalog'

const ClearRightsExplainerPage = lazy(async () => {
  const module = await import('@/ui/waypoint/ClearRightsExplainerPage')
  return { default: module.ClearRightsExplainerPage }
})

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
  | { kind: 'home'; focus: string | null; effects: boolean }
  | { kind: 'clearrights' }
  | { kind: 'info'; id: string }

function routeFromLocation(): AppRoute {
  const hash = window.location.hash
  if (hash === '#/privacy' || hash === '#/clearrights') return { kind: 'clearrights' }
  if (hash.startsWith('#/info/')) {
    const id = decodeURIComponent(hash.slice('#/info/'.length).split('?')[0] ?? '')
    if (getWaypointInfoPage(id)) return { kind: 'info', id }
  }
  const parameters = hash.startsWith('#/?') ? new URLSearchParams(hash.slice(3)) : new URLSearchParams()
  return { kind: 'home', focus: parameters.get('focus'), effects: parameters.get('effects') === '1' }
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
    openControlsSection('privacy')
  }

  const openControlsSection = (section: PersonalControlsSection) => {
    if (section === 'privacy') {
      privacyUi.navigate({ view: 'home', origin: 'human' })
    }
    controlsUi.openPanel(section, { origin: 'human', targetId: section })
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
    setRoute({ kind: 'home', focus: null, effects: false })
  }

  const exitEffectsPreview = () => {
    window.history.replaceState(null, '', '#/')
    setRoute(routeFromLocation())
  }

  const controlsAction = (
    <Button variant="ghost" className="h-9 rounded-full bg-foreground/5 px-5 hover:bg-foreground/10" onClick={openPersonalControls}>
      Privacy settings
    </Button>
  )
  const agentActivityAction = !controlsSnapshot.open
    ? <AgentActivityIndicator activity={controlsSnapshot.agentActivity} placement="page" />
    : null

  const infoPage = route.kind === 'info' ? getWaypointInfoPage(route.id) : null
  const experience = selectWaypointExperience({
    privacyState: snapshot.record.state.processing,
    privacyRevision: snapshot.record.state.revision,
    privacyReceipt: snapshot.record.receipts[0] ?? null,
    accessibility: accessibilitySnapshot,
  })

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
            onOpenControls={openPersonalControls}
            experience={experience}
            effectsPreview={route.effects}
            onExitEffectsPreview={exitEffectsPreview}
            controlsAction={controlsAction}
            agentActivityAction={agentActivityAction}
          />
          {!route.effects && <PrivacyChoiceBanner
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
          />}
        </>
      ) : route.kind === 'clearrights' ? (
        <Suspense fallback={<main className="min-h-svh bg-background p-8 text-sm text-muted-foreground" role="status">Loading ClearRights integration…</main>}>
          <ClearRightsExplainerPage
            snapshot={snapshot}
            accessibilitySnapshot={accessibilitySnapshot}
            siteGuideSnapshot={siteGuideSnapshot}
            experience={experience}
            webMcpAvailable={webMcpAvailable}
            controlsAction={controlsAction}
            agentActivityAction={agentActivityAction}
            onBack={() => navigate('#/')}
            onOpenControls={openControlsSection}
            onOpenPreview={() => navigate('#/?effects=1')}
          />
        </Suspense>
      ) : infoPage ? (
        <WaypointInfoPage page={infoPage} controlsAction={controlsAction} agentActivityAction={agentActivityAction} onBack={() => navigate('#/')} />
      ) : (
        <TravelProductPage
          onExplainPrivacy={() => navigate('#/clearrights')}
          onOpenControls={openPersonalControls}
          experience={experience}
          effectsPreview={false}
          onExitEffectsPreview={exitEffectsPreview}
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
