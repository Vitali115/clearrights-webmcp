import { describe, expect, it, vi } from 'vitest'
import {
  ACTIVITY_LIMIT,
  ACTIVITY_STORAGE_KEY,
  createActivityCoordinator,
  type ActivityEventInput,
} from './activity-coordinator'

class MemoryStorage {
  values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

function createCoordinator(storage = new MemoryStorage()) {
  let id = 0
  return {
    storage,
    coordinator: createActivityCoordinator({
      storage,
      clock: { now: () => `2026-08-27T12:00:${String(id).padStart(2, '0')}.000Z` },
      idGenerator: { next: () => `activity-${++id}` },
    }),
  }
}

describe('ActivityCoordinator', () => {
  it('persists only the typed, user-readable event fields in session storage', () => {
    const { storage, coordinator } = createCoordinator()
    const event = coordinator.record({
      source: 'agent',
      module: 'privacy',
      action: 'staged_plan',
      outcome: 'succeeded',
      summary: 'The agent prepared privacy changes for human review.',
      targetId: 'plan-1',
    })

    expect(event).toEqual(expect.objectContaining({ id: 'activity-1', source: 'agent', targetId: 'plan-1' }))
    expect(JSON.parse(storage.getItem(ACTIVITY_STORAGE_KEY)!)).toEqual({ schemaVersion: 1, events: [event] })
    expect(JSON.stringify(event)).not.toContain('prompt')
    expect(JSON.stringify(event)).not.toContain('reasoning')
  })

  it('keeps the newest 25 events in chronological order', () => {
    const { coordinator } = createCoordinator()
    for (let index = 0; index < ACTIVITY_LIMIT + 5; index += 1) {
      coordinator.record({
        source: 'system',
        module: 'site_guide',
        action: 'navigation',
        outcome: 'succeeded',
        summary: `Opened destination ${index}.`,
      })
    }

    const events = coordinator.getSnapshot().events
    expect(events).toHaveLength(ACTIVITY_LIMIT)
    expect(events[0]?.summary).toBe('Opened destination 5.')
    expect(events.at(-1)?.summary).toBe('Opened destination 29.')
  })

  it('reloads the current session, repairs corrupt data, and clears without adding an event', () => {
    const first = createCoordinator()
    first.coordinator.record({
      source: 'human',
      module: 'accessibility',
      action: 'changed_preferences',
      outcome: 'succeeded',
      summary: 'Text size was changed.',
    })
    expect(createCoordinator(first.storage).coordinator.getSnapshot().events).toHaveLength(1)

    const listener = vi.fn()
    first.coordinator.subscribe(listener)
    first.coordinator.clear()
    expect(first.coordinator.getSnapshot().events).toEqual([])
    expect(first.storage.getItem(ACTIVITY_STORAGE_KEY)).toBeNull()
    expect(listener).toHaveBeenCalledWith({ events: [] })

    first.storage.setItem(ACTIVITY_STORAGE_KEY, '{invalid')
    expect(createCoordinator(first.storage).coordinator.getSnapshot().events).toEqual([])
    expect(first.storage.getItem(ACTIVITY_STORAGE_KEY)).toBeNull()
  })

  it('rejects raw or oversized event shapes instead of storing them', () => {
    const { coordinator } = createCoordinator()
    expect(() => coordinator.record({
      source: 'agent',
      module: 'privacy',
      action: 'raw_payload',
      outcome: 'failed',
      summary: 'x'.repeat(301),
      prompt: 'Do not persist this.',
    } as unknown as ActivityEventInput)).toThrow()
    expect(coordinator.getSnapshot().events).toEqual([])
  })
})
