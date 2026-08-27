import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

export const HOLD_TO_CONFIRM_MS = 1200

interface HoldToConfirmProps {
  confirmed: boolean
  onConfirm(): void
  onRevoke(): void
}

export function HoldToConfirm({ confirmed, onConfirm, onRevoke }: HoldToConfirmProps) {
  const [holding, setHolding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const descriptionId = useId()

  const cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setHolding(false)
  }

  const start = () => {
    if (confirmed || timerRef.current) return
    setHolding(true)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setHolding(false)
      onConfirm()
    }, HOLD_TO_CONFIRM_MS)
  }

  useEffect(() => cancel, [])

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label={confirmed ? 'Human confirmation recorded' : 'Hold to confirm review'}
          aria-describedby={descriptionId}
          aria-pressed={confirmed}
          className={`relative h-11 min-h-11 flex-1 overflow-hidden rounded-full px-4 text-sm font-medium outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none ${confirmed ? 'bg-foreground text-background' : 'border border-foreground/10 bg-background'}`}
          disabled={confirmed}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.currentTarget.setPointerCapture?.(event.pointerId)
            start()
          }}
          onPointerUp={cancel}
          onPointerCancel={cancel}
          onPointerLeave={cancel}
          onKeyDown={(event) => {
            if ((event.key !== ' ' && event.key !== 'Enter') || event.repeat) return
            event.preventDefault()
            start()
          }}
          onKeyUp={(event) => {
            if (event.key !== ' ' && event.key !== 'Enter') return
            event.preventDefault()
            cancel()
          }}
          onBlur={cancel}
          onContextMenu={(event) => event.preventDefault()}
        >
          {!confirmed && (
            <span
              className="absolute inset-y-0 left-0 bg-foreground/8 transition-[width] ease-linear"
              style={{
                width: holding ? '100%' : '0%',
                transitionDuration: holding ? `${HOLD_TO_CONFIRM_MS}ms` : '120ms',
              }}
              aria-hidden="true"
            />
          )}
          <span className="relative flex items-center justify-center gap-2">
            {confirmed && <Check className="size-4" aria-hidden="true" />}
            {confirmed ? 'Human confirmation recorded' : holding ? 'Keep holding…' : 'Hold to confirm'}
          </span>
        </button>
        {confirmed && (
          <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={onRevoke}>Remove confirmation</Button>
        )}
      </div>
      <p id={descriptionId} className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Hold for 1.2 seconds with pointer, Space, or Enter. This records a deliberate in-page confirmation, not identity or a legal signature.
      </p>
    </div>
  )
}
