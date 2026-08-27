import { useEffect, useState, type KeyboardEvent } from 'react'
import type {
  ActivityCoordinator,
  ActivitySnapshot,
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
import { AccessibilityPanel } from './AccessibilityPanel'
import { ActivityPanel } from './ActivityPanel'
import { SiteGuidePanel } from './SiteGuidePanel'

const primarySections = ['privacy', 'accessibility', 'site_guide'] as const

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
  webMcpAvailable: boolean
  onReset(): Promise<void>
}) {
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const section = controlsSnapshot.section

  useEffect(() => {
    if (controlsSnapshot.agentActivity?.status === 'opened' && controlsSnapshot.agentActivity.kind === 'panel') {
      document.getElementById('controls-section-title')?.focus()
    }
  }, [controlsSnapshot.agentActivity, controlsSnapshot.focusRequest])

  const openSection = (next: PersonalControlsSection) => {
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
        <SheetTitle className="text-lg">Waypoint Personal Controls</SheetTitle>
        <SheetDescription>Privacy · Accessibility · Site guide</SheetDescription>
        <div role="tablist" aria-label="Personal Controls sections" className="mt-4 flex flex-wrap gap-1" onKeyDown={onTabKeyDown}>
          {primarySections.map((item) => (
            <Button
              key={item}
              id={`controls-tab-${item}`}
              role="tab"
              aria-selected={section === item}
              aria-controls="personal-controls-panel"
              variant={section === item ? 'secondary' : 'ghost'}
              className="rounded-full capitalize"
              onClick={() => openSection(item)}
            >
              {item === 'site_guide' ? 'Site guide' : item}
            </Button>
          ))}
          <Button
            id="controls-tab-activity"
            role="tab"
            aria-selected={section === 'activity'}
            aria-controls="personal-controls-panel"
            variant={section === 'activity' ? 'secondary' : 'ghost'}
            className="ml-auto rounded-full"
            onClick={() => openSection('activity')}
          >
            Activity{activitySnapshot.events.length ? ` (${activitySnapshot.events.length})` : ''}
          </Button>
        </div>
      </SheetHeader>

      <div
        id="personal-controls-panel"
        role="tabpanel"
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
        {section === 'privacy' && (
          <PrivacyCenter
            controller={controller}
            privacyUi={privacyUi}
            privacyView={privacyView}
            snapshot={privacySnapshot}
            activity={activity}
          />
        )}
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
          />
        )}
        {section === 'activity' && <ActivityPanel snapshot={activitySnapshot} />}
      </div>

      <SheetFooter className="flex-row items-center justify-between gap-3 border-t border-foreground/10 bg-background px-5 py-2.5 sm:px-8">
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
                This resets privacy, receipts, accessibility preferences, Undo, and session Activity, then returns to Waypoint home.
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
      </SheetFooter>
    </SheetContent>
  )
}
