import type { SiteGuidePanelSection } from '@clearrights/sdk/site-guide'

export type PersonalControlsSection = SiteGuidePanelSection | 'site_guide'
export type AgentSurfaceKind = 'panel' | 'route'

export interface ControlsAgentActivity {
  sequence: number
  kind: AgentSurfaceKind
  targetId: string
  message: string
  status: 'opened' | 'engaged'
}

export interface PersonalControlsSnapshot {
  open: boolean
  section: PersonalControlsSection
  focusRequest: number
  agentActivity: ControlsAgentActivity | null
}

export interface SurfaceContext {
  origin: 'human' | 'agent'
  targetId: string
  message?: string
}

export interface PersonalControlsCoordinator {
  getSnapshot(): PersonalControlsSnapshot
  subscribe(listener: (snapshot: PersonalControlsSnapshot) => void): () => void
  openPanel(section: PersonalControlsSection, context: SurfaceContext): void
  reportRoute(context: SurfaceContext): void
  close(): void
  acknowledge(): void
}

export function createPersonalControlsCoordinator(): PersonalControlsCoordinator {
  let sequence = 0
  let snapshot: PersonalControlsSnapshot = {
    open: false,
    section: 'privacy',
    focusRequest: 0,
    agentActivity: null,
  }
  const listeners = new Set<(snapshot: PersonalControlsSnapshot) => void>()
  const publish = (next: PersonalControlsSnapshot) => {
    snapshot = clone(next)
    const publicSnapshot = clone(snapshot)
    for (const listener of listeners) listener(publicSnapshot)
  }
  const activityFor = (kind: AgentSurfaceKind, context: SurfaceContext) => context.origin === 'agent'
    ? {
        sequence: ++sequence,
        kind,
        targetId: context.targetId,
        message: context.message ?? `The agent opened ${context.targetId}.`,
        status: 'opened' as const,
      }
    : snapshot.agentActivity

  return {
    getSnapshot: () => clone(snapshot),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    openPanel(section, context) {
      publish({
        open: true,
        section,
        focusRequest: snapshot.focusRequest + 1,
        agentActivity: activityFor('panel', context),
      })
    },
    reportRoute(context) {
      publish({
        ...snapshot,
        open: false,
        focusRequest: snapshot.focusRequest + 1,
        agentActivity: activityFor('route', context),
      })
    },
    close() {
      if (!snapshot.open) return
      publish({ ...snapshot, open: false })
    },
    acknowledge() {
      if (snapshot.agentActivity?.status !== 'opened') return
      publish({
        ...snapshot,
        agentActivity: { ...snapshot.agentActivity, status: 'engaged' },
      })
    },
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
