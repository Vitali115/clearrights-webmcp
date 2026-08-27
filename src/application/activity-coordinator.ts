import { z } from 'zod'

export const ACTIVITY_STORAGE_KEY = 'waypoint.activity.v1'
export const ACTIVITY_LIMIT = 25

export type ActivitySource = 'human' | 'agent' | 'system'
export type ActivityModule = 'privacy' | 'accessibility' | 'site_guide'
export type ActivityOutcome = 'succeeded' | 'blocked' | 'failed'

export interface ActivityEvent {
  id: string
  timestamp: string
  source: ActivitySource
  module: ActivityModule
  action: string
  outcome: ActivityOutcome
  summary: string
  targetId?: string
}

export type ActivityEventInput = Omit<ActivityEvent, 'id' | 'timestamp'>

export interface ActivitySnapshot {
  events: ActivityEvent[]
}

export interface ActivityCoordinator {
  getSnapshot(): ActivitySnapshot
  subscribe(listener: (snapshot: ActivitySnapshot) => void): () => void
  record(input: ActivityEventInput): ActivityEvent
  clear(): void
}

export interface ActivityStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const eventSchema = z.object({
  id: z.string().min(1).max(128),
  timestamp: z.string().min(1).max(64),
  source: z.enum(['human', 'agent', 'system']),
  module: z.enum(['privacy', 'accessibility', 'site_guide']),
  action: z.string().trim().min(1).max(80),
  outcome: z.enum(['succeeded', 'blocked', 'failed']),
  summary: z.string().trim().min(1).max(300),
  targetId: z.string().trim().min(1).max(128).optional(),
}).strict()

const recordSchema = z.object({
  schemaVersion: z.literal(1),
  events: z.array(eventSchema).max(ACTIVITY_LIMIT),
}).strict()

export function createActivityCoordinator({
  storage,
  clock,
  idGenerator,
}: {
  storage: ActivityStorageLike
  clock: { now(): string }
  idGenerator: { next(): string }
}): ActivityCoordinator {
  let events = load(storage)
  const listeners = new Set<(snapshot: ActivitySnapshot) => void>()
  const snapshot = (): ActivitySnapshot => clone({ events })
  const publish = (next: ActivityEvent[]) => {
    const validated = recordSchema.parse({ schemaVersion: 1, events: next })
    storage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(validated))
    const written = storage.getItem(ACTIVITY_STORAGE_KEY)
    if (!written) throw new Error('Activity write could not be read back.')
    events = recordSchema.parse(JSON.parse(written)).events
    const nextSnapshot = snapshot()
    for (const listener of listeners) listener(nextSnapshot)
  }

  return {
    getSnapshot: snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    record(input) {
      const event = eventSchema.parse({ ...input, id: idGenerator.next(), timestamp: clock.now() })
      publish([...events, event].slice(-ACTIVITY_LIMIT))
      return clone(event)
    },
    clear() {
      events = []
      storage.removeItem(ACTIVITY_STORAGE_KEY)
      const nextSnapshot = snapshot()
      for (const listener of listeners) listener(nextSnapshot)
    },
  }
}

function load(storage: ActivityStorageLike): ActivityEvent[] {
  const stored = storage.getItem(ACTIVITY_STORAGE_KEY)
  if (!stored) return []
  try {
    return recordSchema.parse(JSON.parse(stored)).events
  } catch {
    storage.removeItem(ACTIVITY_STORAGE_KEY)
    return []
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
