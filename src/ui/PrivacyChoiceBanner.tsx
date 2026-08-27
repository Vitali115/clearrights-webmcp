import { useState } from 'react'
import type { PrivacyController } from '@/application'
import type { PrivacyPreset } from '@/domain'
import { Button } from '@/components/ui/button'
import { CopyAgentInstructionsButton } from './CopyAgentInstructionsButton'

interface PrivacyChoiceBannerProps {
  controller: PrivacyController
  pending: boolean
  webMcpAvailable: boolean
  onManage(): void
  onLearn(): void
}

export function PrivacyChoiceBanner({
  controller,
  pending,
  webMcpAvailable,
  onManage,
  onLearn,
}: PrivacyChoiceBannerProps) {
  const [applying, setApplying] = useState<PrivacyPreset | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!pending) return null

  const applyChoice = async (preset: PrivacyPreset) => {
    setApplying(preset)
    setError(null)
    try {
      await controller.applyInitialChoice(preset)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The privacy choice could not be applied.')
    } finally {
      setApplying(null)
    }
  }

  return (
    <section
      aria-labelledby="privacy-choices-title"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-5xl border border-foreground/15 bg-background p-5 shadow-[0_18px_60px_rgba(0,0,0,0.14)] sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:gap-10">
        <div>
          <h2 id="privacy-choices-title" className="text-lg font-medium tracking-tight">Privacy choices</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Choose whether Waypoint can use optional data for recommendations, location suggestions, and partner offers. Essential services always stay on.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={applying !== null}
              onClick={() => void applyChoice('essential_only')}
            >
              {applying === 'essential_only' ? 'Applying…' : 'Essential only'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={applying !== null}
              onClick={() => void applyChoice('accept_all')}
            >
              {applying === 'accept_all' ? 'Applying…' : 'Accept all'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              disabled={applying !== null}
              onClick={onManage}
            >
              Manage choices
            </Button>
          </div>
        </div>

        <div className="border-t border-foreground/10 pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
          <p className="text-sm font-medium">Agent-ready · Human-approved</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your agent can inspect these settings, explain their effects, and prepare changes. You approve them before they are applied.
          </p>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {webMcpAvailable
              ? 'Structured agent access detected in this browser.'
              : 'Structured agent access is unavailable here; manual choices still work.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            <CopyAgentInstructionsButton
              className="h-8 rounded-full px-3"
              onError={setError}
            />
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3" onClick={onLearn}>
              How it works
            </Button>
          </div>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <p className="mt-4 text-xs text-muted-foreground">
        Local demo: choices and receipts are stored in this browser. No legal compliance or identity claim is made.
      </p>
    </section>
  )
}
