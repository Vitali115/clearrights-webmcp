import type { ProcessingId } from '@/domain'

export const PRIVACY_VIEWS = [
  'home',
  'current_setup',
  'activity',
  'cleanup',
  'review',
  'history',
  'receipt',
] as const

export type PrivacyView = (typeof PRIVACY_VIEWS)[number]
export type NavigationOrigin = 'human' | 'agent'
export type AgentActivityStatus = 'opened' | 'engaged'

export interface PrivacyNavigation {
  view: PrivacyView
  origin: NavigationOrigin
  processingId: ProcessingId | null
}

export interface AgentActivity {
  sequence: number
  view: PrivacyView
  message: string
  status: AgentActivityStatus
}

export interface AgentPreparation {
  planId: string
}

export interface PrivacyViewSnapshot {
  navigation: PrivacyNavigation
  agentActivity: AgentActivity | null
  agentPreparation: AgentPreparation | null
}

export type PrivacyNavigationRequest = {
  view: PrivacyView
  processingId?: ProcessingId | null
} & ({
  origin: 'human'
} | {
  origin: 'agent'
  message: string
  preparedPlanId?: string
})

export interface PrivacyViewCoordinator {
  getSnapshot(): PrivacyViewSnapshot
  subscribe(listener: (snapshot: PrivacyViewSnapshot) => void): () => void
  navigate(request: PrivacyNavigationRequest): void
  acknowledge(): void
  revokeAgentPreparation(): void
}

export function createPrivacyViewCoordinator(): PrivacyViewCoordinator {
  let sequence = 0
  let snapshot: PrivacyViewSnapshot = {
    navigation: {
      view: 'home',
      origin: 'human',
      processingId: null,
    },
    agentActivity: null,
    agentPreparation: null,
  }
  const listeners = new Set<(snapshot: PrivacyViewSnapshot) => void>()

  const publish = (next: PrivacyViewSnapshot) => {
    snapshot = clone(next)
    for (const listener of listeners) listener(clone(snapshot))
  }

  return {
    getSnapshot: () => clone(snapshot),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    navigate(request) {
      const navigation: PrivacyNavigation = {
        view: request.view,
        origin: request.origin,
        processingId: request.processingId ?? null,
      }
      publish({
        navigation,
        agentActivity: request.origin === 'agent'
          ? {
              sequence: ++sequence,
              view: request.view,
              message: request.message,
              status: 'opened',
            }
          : snapshot.agentActivity,
        agentPreparation: request.origin === 'agent' && request.preparedPlanId
          ? { planId: request.preparedPlanId }
          : snapshot.agentPreparation,
      })
    },
    acknowledge() {
      if (snapshot.agentActivity?.status !== 'opened') return
      publish({
        ...snapshot,
        agentActivity: {
          ...snapshot.agentActivity,
          status: 'engaged',
        },
      })
    },
    revokeAgentPreparation() {
      if (!snapshot.agentPreparation) return
      publish({
        ...snapshot,
        agentPreparation: null,
      })
    },
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
