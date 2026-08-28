import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type {
  ActivityCoordinator,
  ActivitySnapshot,
  ObservedPrivacySignals,
  PersonalControlsCoordinator,
  PersonalControlsSection,
  PersonalControlsSnapshot,
  PrivacyController,
  PrivacyControllerSnapshot,
  PrivacyView,
  PrivacyViewCoordinator,
  PrivacyViewSnapshot,
} from '@/application'
import type {
  AccessibilityCatalog,
  AccessibilityRuntime,
  AccessibilitySnapshot,
  SiteGuideCatalog,
  SiteGuideRuntime,
  SiteGuideSnapshot,
} from '@/domain'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ArrowLeft, XIcon } from 'lucide-react'
import { AgentActivityIndicator } from '@/ui/AgentActivityIndicator'
import { PrivacyCenter } from '@/ui/PrivacyCenter'
import { waypointRelatedPrivacyDestinationIds } from '@/demo/waypoint/site-guide-catalog'
import { AccessibilityPanel } from './AccessibilityPanel'
import { ActivityPanel } from './ActivityPanel'
import { SiteGuidePanel } from './SiteGuidePanel'

const primarySections = ['privacy', 'activity'] as const
const sectionTitleIds: Record<PersonalControlsSection, string> = {
  privacy: 'privacy-section-title',
  accessibility: 'display-preferences-title',
  site_guide: 'related-privacy-pages-title',
  activity: 'activity-section-title',
}

const PRIVACY_VIEW_TITLE: Record<PrivacyView, string> = {
  home: 'Privacy settings',
  current_setup: 'Privacy settings',
  cleanup: 'Privacy settings',
  activity: 'Setting details',
  review: 'Review changes',
  history: 'Previous changes',
  receipt: 'Verified receipt',
}

const SECTION_TITLE: Record<Exclude<PersonalControlsSection, 'privacy'>, string> = {
  accessibility: 'Display preferences',
  site_guide: 'Related privacy pages',
  activity: 'Activity',
}

export function PersonalControls({
  controller,
  privacyUi,
  privacyView,
  privacySnapshot,
  controlsUi,
  controlsSnapshot,
  accessibility,
  accessibilityCatalog,
  accessibilitySnapshot,
  siteGuide,
  siteGuideCatalog,
  siteGuideSnapshot,
  activity,
  activitySnapshot,
  observedPrivacySignals,
  onReset,
}: {
  controller: PrivacyController
  privacyUi: PrivacyViewCoordinator
  privacyView: PrivacyViewSnapshot
  privacySnapshot: PrivacyControllerSnapshot
  controlsUi: PersonalControlsCoordinator
  controlsSnapshot: PersonalControlsSnapshot
  accessibility: AccessibilityRuntime
  accessibilityCatalog: AccessibilityCatalog
  accessibilitySnapshot: AccessibilitySnapshot
  siteGuide: SiteGuideRuntime
  siteGuideCatalog: SiteGuideCatalog
  siteGuideSnapshot: SiteGuideSnapshot
  activity: ActivityCoordinator
  activitySnapshot: ActivitySnapshot
  observedPrivacySignals: ObservedPrivacySignals
  onReset(): Promise<void>
}) {
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const focusContentRequest = useRef<PersonalControlsSection | null>(null)
  const section = controlsSnapshot.section
  const secondarySection = section === 'accessibility' || section === 'site_guide'
  const privacySettingsView = privacyView.navigation.view === 'home'
    || privacyView.navigation.view === 'current_setup'
    || privacyView.navigation.view === 'cleanup'
  const showAdditionalModules = section !== 'privacy' || privacySettingsView
  const privacyViewKind = privacyView.navigation.view
  const headerTitle = section === 'privacy' ? PRIVACY_VIEW_TITLE[privacyViewKind] : SECTION_TITLE[section]
  const showBack = section === 'privacy' ? !privacySettingsView : secondarySection

  useEffect(() => {
    if (!controlsSnapshot.open) return
    const agentOpenedPanel = controlsSnapshot.agentActivity?.status === 'opened'
      && controlsSnapshot.agentActivity.kind === 'panel'
    if (focusContentRequest.current !== section && !agentOpenedPanel) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionTitleIds[section])?.focus({ preventScroll: true })
      focusContentRequest.current = null
    })
    return () => window.cancelAnimationFrame(frame)
  }, [controlsSnapshot.agentActivity, controlsSnapshot.focusRequest, controlsSnapshot.open, section])

  useEffect(() => {
    document.getElementById(sectionTitleIds.privacy)?.focus({ preventScroll: true })
  }, [privacyViewKind])

  const openSection = (next: PersonalControlsSection, focusContent = false) => {
    focusContentRequest.current = focusContent ? next : null
    controlsUi.acknowledge()
    controlsUi.openPanel(next, { origin: 'human', targetId: next })
  }

  const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const focusedSection = (event.target as HTMLElement).id.replace('controls-tab-', '')
    const current = primarySections.indexOf(focusedSection as (typeof primarySections)[number])
    if (current < 0) return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const next = primarySections[(current + direction + primarySections.length) % primarySections.length]!
    openSection(next)
    document.getElementById(`controls-tab-${next}`)?.focus()
  }

  const onHeaderBack = () => {
    if (secondarySection) {
      openSection('privacy', true)
      return
    }
    privacyUi.acknowledge()
    privacyUi.navigate({
      view: privacyViewKind === 'receipt' ? 'history' : 'home',
      origin: 'human',
    })
  }

  const reset = async () => {
    setResetting(true)
    setResetError(null)
    try {
      await onReset()
    } catch (cause) {
      setResetError(cause instanceof Error ? cause.message : 'Demo data could not be reset.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <SheetContent
      showCloseButton={false}
      className="gap-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[min(80vw,920px)] data-[side=right]:sm:max-w-none"
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        onClickCapture={(event) => {
          if (isAgentIndicatorEvent(event)) return
          controlsUi.acknowledge()
          if (section === 'privacy') privacyUi.acknowledge()
        }}
        onKeyDownCapture={(event) => {
          if (isAgentIndicatorEvent(event)) return
          controlsUi.acknowledge()
          if (section === 'privacy') privacyUi.acknowledge()
        }}
        onWheelCapture={(event) => {
          if (isAgentIndicatorEvent(event)) return
          controlsUi.acknowledge()
          if (section === 'privacy') privacyUi.acknowledge()
        }}
        onTouchMoveCapture={(event) => {
          if (isAgentIndicatorEvent(event)) return
          controlsUi.acknowledge()
          if (section === 'privacy') privacyUi.acknowledge()
        }}
      >
      <SheetHeader className="flex-row items-center gap-2 space-y-0 border-b border-foreground/10 p-0 px-4 h-12 sm:px-5">
        {showBack ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            aria-label={secondarySection ? 'Back to Privacy' : 'Back'}
            onClick={onHeaderBack}
          >
            <ArrowLeft />
          </Button>
        ) : null}
        <SheetTitle className="sr-only">Waypoint Privacy Settings</SheetTitle>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <h1
            id={sectionTitleIds[section]}
            tabIndex={-1}
            className="min-w-0 truncate font-heading text-base font-medium tracking-tight text-foreground outline-none"
          >
            {headerTitle}
          </h1>
          <AgentActivityIndicator activity={controlsSnapshot.agentActivity} />
        </div>
        <SheetDescription className="sr-only">Review data use, then apply the exact plan.</SheetDescription>
        {!secondarySection && (
          <div role="tablist" aria-label="Privacy settings sections" className="flex shrink-0 items-center gap-1" onKeyDown={onTabKeyDown}>
            {primarySections.map((item) => (
              <Button
                key={item}
                id={`controls-tab-${item}`}
                role="tab"
                aria-selected={section === item}
                aria-controls="personal-controls-panel"
                variant={section === item ? (item === 'privacy' ? 'default' : 'secondary') : 'ghost'}
                className="h-7 rounded-full px-3"
                onClick={() => openSection(item)}
              >
                {item === 'activity' && activitySnapshot.events.length
                  ? `Activity (${activitySnapshot.events.length})`
                  : item === 'privacy' ? 'Privacy' : 'Activity'}
              </Button>
            ))}
          </div>
        )}
        <SheetClose asChild>
          <Button variant="ghost" size="icon-sm" className="rounded-full" aria-label="Close">
            <XIcon />
          </Button>
        </SheetClose>
      </SheetHeader>

      <div
        id="personal-controls-panel"
        role={secondarySection ? undefined : 'tabpanel'}
        aria-labelledby={secondarySection ? undefined : `controls-tab-${section}`}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <div className={section === 'privacy' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'} aria-hidden={section === 'privacy' ? undefined : true}>
          <PrivacyCenter
            key={privacySnapshot.plan?.id ?? `revision-${privacySnapshot.record.state.revision}`}
            controller={controller}
            privacyUi={privacyUi}
            privacyView={privacyView}
            snapshot={privacySnapshot}
            observedPrivacySignals={observedPrivacySignals}
            activity={activity}
          />
        </div>
        {section === 'accessibility' && (
          <AccessibilityPanel
            runtime={accessibility}
            catalog={accessibilityCatalog}
            snapshot={accessibilitySnapshot}
            activity={activity}
          />
        )}
        {section === 'site_guide' && (
          <SiteGuidePanel
            runtime={siteGuide}
            catalog={siteGuideCatalog}
            snapshot={siteGuideSnapshot}
            activity={activity}
            destinationIds={waypointRelatedPrivacyDestinationIds}
          />
        )}
        {section === 'activity' && <ActivityPanel snapshot={activitySnapshot} />}
      </div>

      <SheetFooter className="block gap-0 border-t border-foreground/10 bg-background p-0">
        <div className="flex items-center gap-1 px-4 py-2 sm:px-5">
          {showAdditionalModules && (
            <nav aria-label="Additional controls" className="flex min-w-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-sm font-medium text-muted-foreground aria-current:text-foreground"
                aria-current={section === 'accessibility' ? 'page' : undefined}
                onClick={() => openSection('accessibility', true)}
              >
                Display preferences
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-sm font-medium text-muted-foreground aria-current:text-foreground"
                aria-current={section === 'site_guide' ? 'page' : undefined}
                onClick={() => openSection('site_guide', true)}
              >
                Site guide
              </Button>
            </nav>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto h-8 shrink-0 rounded-full px-3 text-sm font-medium text-muted-foreground">Reset</Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This resets privacy, receipts, display preferences, Undo, and session Activity, then returns to Waypoint home.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {resetError && <p role="alert" className="text-sm text-destructive">{resetError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" disabled={resetting} onClick={() => void reset()}>
                  {resetting ? 'Resetting…' : 'Reset data'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetFooter>
      </div>
    </SheetContent>
  )
}

function isAgentIndicatorEvent(event: { target: EventTarget | null }) {
  return event.target instanceof Element && Boolean(event.target.closest('[data-agent-indicator]'))
}
