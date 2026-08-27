import { useState } from 'react'
import type { ActivityCoordinator } from '@/application'
import type {
  AccessibilityCatalog,
  AccessibilityPrimitiveId,
  AccessibilityRuntime,
  AccessibilitySnapshot,
  AccessibilityState,
} from '@/domain'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function AccessibilityPanel({
  runtime,
  catalog,
  snapshot,
  activity,
}: {
  runtime: AccessibilityRuntime
  catalog: AccessibilityCatalog
  snapshot: AccessibilitySnapshot
  activity: ActivityCoordinator
}) {
  const [pending, setPending] = useState<AccessibilityPrimitiveId | 'undo' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setPreference = async <K extends AccessibilityPrimitiveId>(id: K, value: AccessibilityState[K]) => {
    setPending(id)
    setError(null)
    try {
      const result = await runtime.setPreferences({ [id]: value }, 'human')
      activity.record({
        source: 'human',
        module: 'accessibility',
        action: 'changed_preferences',
        outcome: 'succeeded',
        summary: result.changed ? `${catalog.getPrimitive(id).label} was updated.` : `${catalog.getPrimitive(id).label} was already set.`,
        targetId: id,
      })
    } catch (cause) {
      activity.record({
        source: 'human',
        module: 'accessibility',
        action: 'changed_preferences',
        outcome: 'failed',
        summary: `${catalog.getPrimitive(id).label} could not be updated.`,
        targetId: id,
      })
      setError(cause instanceof Error ? cause.message : 'The preference could not be applied.')
    } finally {
      setPending(null)
    }
  }

  const undo = async () => {
    setPending('undo')
    setError(null)
    try {
      const result = await runtime.undo('human')
      activity.record({
        source: 'human',
        module: 'accessibility',
        action: 'undo',
        outcome: result.changed ? 'succeeded' : 'blocked',
        summary: result.changed ? 'The previous accessibility preferences were restored.' : 'There was no accessibility change to undo.',
      })
    } catch (cause) {
      activity.record({
        source: 'human',
        module: 'accessibility',
        action: 'undo',
        outcome: 'failed',
        summary: 'Display preferences could not be restored.',
      })
      setError(cause instanceof Error ? cause.message : 'Undo could not be completed.')
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl p-5 sm:px-8 sm:py-7" aria-labelledby="display-preferences-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-foreground/10 pb-6">
        <div>
          <h1 id="display-preferences-title" tabIndex={-1} className="text-[22px] font-medium tracking-tight outline-none">Display preferences</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Local, immediate, and reversible display preferences. This is not an accessibility overlay or a compliance claim.
          </p>
        </div>
        <Button variant="outline" className="rounded-full" disabled={!snapshot.undoAvailable || pending !== null} onClick={() => void undo()}>
          {pending === 'undo' ? 'Restoring…' : 'Undo'}
        </Button>
      </div>

      <div className="divide-y divide-foreground/10">
        {catalog.primitives.map((primitive) => (
          <fieldset key={primitive.id} className="py-6" disabled={pending !== null}>
            <legend className="font-medium">{primitive.label}</legend>
            <p className="mt-1 text-sm text-muted-foreground">{primitive.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {primitive.options.map((option) => {
                const selected = snapshot.current[primitive.id] === option.value
                return (
                  <Button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    variant={selected ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => void setPreference(primitive.id, option.value as never)}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{primitive.details}</p>
          </fieldset>
        ))}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Preference not applied</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        Adapter: {snapshot.adapterId} · {snapshot.scope === 'local_demo' ? 'local demo' : 'external'} · Revision {snapshot.revision}
      </p>
    </section>
  )
}
