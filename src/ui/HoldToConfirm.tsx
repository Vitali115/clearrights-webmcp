import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

export const HOLD_TO_CONFIRM_MS = 1200

const RING_LENGTH = 138.2

interface HoldToConfirmProps {
  confirmed: boolean
  onConfirm(): void
  describedBy?: string
}

export function ApprovalSeal({ complete }: { complete: boolean }) {
  return (
    <span
      className={`flex size-11 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-foreground text-background' : 'border border-dashed border-foreground/30'}`}
      aria-hidden="true"
    >
      {complete ? <Check className="size-3" strokeWidth={2.5} /> : null}
    </span>
  )
}

export function HoldToConfirm({ confirmed, onConfirm, describedBy }: HoldToConfirmProps) {
  const [holding, setHolding] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    <button
      type="button"
      aria-label={confirmed ? 'Human confirmation recorded' : 'Hold to confirm review'}
      aria-describedby={describedBy}
      aria-pressed={confirmed}
      disabled={confirmed}
      className={`relative flex size-11 shrink-0 items-center justify-center rounded-full outline-none select-none touch-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none ${confirmed ? 'bg-foreground text-background' : 'border border-dashed border-foreground/30 bg-transparent'}`}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* synthetic events */ }
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
        <svg
          className="pointer-events-none absolute -inset-0.5 size-12 -rotate-90"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="22" fill="none" stroke="transparent" strokeWidth="2" />
          <circle
            cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={holding ? 0 : RING_LENGTH}
            style={{ transition: `stroke-dashoffset ${holding ? HOLD_TO_CONFIRM_MS : 120}ms linear` }}
          />
        </svg>
      )}
      {confirmed ? <Check className="size-3" strokeWidth={2.5} aria-hidden="true" /> : null}
    </button>
  )
}
