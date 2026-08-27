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
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  webMcpAvailable,
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
  webMcpAvailable: boolean
  onReset(): Promise<void>
}) {
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const focusContentRequest = useRef<PersonalControlsSection | null>(null)
  const section = controlsSnapshot.section
  const secondarySection = section === 'accessibility' || section === 'site_guide'

  useEffect(() => {
    if (!controlsSnapshot.open) return
    const agentOpenedPanel = controlsSnapshot.agentActivity?.status === 'opened'
      && controlsSnapshot.agentActivity.kind === 'panel'
    if (focusContentRequest.current !== section && !agentOpenedPanel) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionTitleIds[section])?.focus()
      focusContentRequest.current = null
    })
    return () => window.cancelAnimationFrame(frame)
  }, [controlsSnapshot.agentActivity, controlsSnapshot.focusRequest, controlsSnapshot.open, section])

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
    <SheetContent className="gap-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:w-[min(80vw,920px)] data-[side=right]:sm:max-w-none">
      <AgentActivityIndicator activity={controlsSnapshot.agentActivity} />
      <SheetHeader className="border-b border-foreground/10 px-5 py-4 pr-32 sm:px-8 sm:pr-36">
        <SheetTitle className="text-lg">Waypoint Privacy Settings</SheetTitle>
        <SheetDescription>Review Waypoint data use, approve exact changes, and inspect verified activity.</SheetDescription>
        {secondarySection ? (
          <Button
            variant="ghost"
            className="mt-4 h-auto w-fit rounded-full px-3 py-1.5 text-muted-foreground"
            onClick={() => openSection('privacy', true)}
          >
            Back to Privacy
          </Button>
        ) : (
          <div role="tablist" aria-label="Privacy settings sections" className="mt-4 flex gap-1" onKeyDown={onTabKeyDown}>
            {primarySections.map((item) => (
              <Button
                key={item}
                id={`controls-tab-${item}`}
                role="tab"
                aria-selected={section === item}
                aria-controls="personal-controls-panel"
                variant={section === item ? (item === 'privacy' ? 'default' : 'secondary') : 'ghost'}
                className={item === 'privacy' ? 'min-w-32 rounded-full' : 'ml-auto rounded-full text-muted-foreground'}
                onClick={() => openSection(item)}
              >
                {item === 'activity' && activitySnapshot.events.length
                  ? `Activity (${activitySnapshot.events.length})`
                  : item === 'privacy' ? 'Privacy' : 'Activity'}
              </Button>
            ))}
          </div>
        )}
      </SheetHeader>

      <div
        id="personal-controls-panel"
        role={secondarySection ? undefined : 'tabpanel'}
        aria-labelledby={secondarySection ? undefined : `controls-tab-${section}`}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        onClickCapture={() => {
          controlsUi.acknowledge()
          if (section === 'privacy') privacyUi.acknowledge()
        }}
        onKeyDownCapture={() => {
          controlsUi.acknowledge()
          if (section === 'privacy') privacyUi.acknowledge()
        }}
        onScrollCapture={() => {
          controlsUi.acknowledge()
          if (section === 'privacy') privacyUi.acknowledge()
        }}
      >
        <div className={section === 'privacy' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'} aria-hidden={section === 'privacy' ? undefined : true}>
          <PrivacyCenter
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
        <div className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-medium text-foreground">Additional agent-ready controls</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Optional ClearRights modules demonstrated by Waypoint.</p>
          </div>
          <nav aria-label="Additional agent-ready controls" className="flex flex-wrap gap-1">
            <Button
              variant={section === 'accessibility' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full"
              aria-current={section === 'accessibility' ? 'page' : undefined}
              onClick={() => openSection('accessibility', true)}
            >
              Display preferences
            </Button>
            <Button
              variant={section === 'site_guide' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-full"
              aria-current={section === 'site_guide' ? 'page' : undefined}
              onClick={() => openSection('site_guide', true)}
            >
              Site guide
            </Button>
          </nav>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-foreground/10 px-5 py-2.5 sm:px-8">
          <p className="text-xs font-medium text-muted-foreground">
            Built with ClearRights · {webMcpAvailable ? 'Agent tools available' : 'Manual controls'}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">Reset</Button>
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
    </SheetContent>
  )
}
