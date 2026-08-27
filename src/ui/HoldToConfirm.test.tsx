import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HOLD_TO_CONFIRM_MS, HoldToConfirm } from './HoldToConfirm'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('HoldToConfirm', () => {
  it('confirms only after the full pointer hold', () => {
    vi.useFakeTimers()
    const onConfirm = vi.fn()
    render(<HoldToConfirm confirmed={false} onConfirm={onConfirm} onRevoke={vi.fn()} />)
    const control = screen.getByRole('button', { name: 'Hold to confirm review' })

    fireEvent.pointerDown(control, { button: 0, pointerId: 1 })
    act(() => vi.advanceTimersByTime(HOLD_TO_CONFIRM_MS - 1))
    expect(onConfirm).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('cancels a short hold', () => {
    vi.useFakeTimers()
    const onConfirm = vi.fn()
    render(<HoldToConfirm confirmed={false} onConfirm={onConfirm} onRevoke={vi.fn()} />)
    const control = screen.getByRole('button', { name: 'Hold to confirm review' })

    fireEvent.pointerDown(control, { button: 0, pointerId: 1 })
    act(() => vi.advanceTimersByTime(HOLD_TO_CONFIRM_MS / 2))
    fireEvent.pointerUp(control, { button: 0, pointerId: 1 })
    act(() => vi.advanceTimersByTime(HOLD_TO_CONFIRM_MS))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('supports a keyboard hold and explicit revocation', async () => {
    vi.useFakeTimers()
    const onConfirm = vi.fn()
    const onRevoke = vi.fn()
    const { rerender } = render(<HoldToConfirm confirmed={false} onConfirm={onConfirm} onRevoke={onRevoke} />)
    const control = screen.getByRole('button', { name: 'Hold to confirm review' })

    fireEvent.keyDown(control, { key: 'Enter' })
    act(() => vi.advanceTimersByTime(HOLD_TO_CONFIRM_MS))
    expect(onConfirm).toHaveBeenCalledOnce()

    rerender(<HoldToConfirm confirmed onConfirm={onConfirm} onRevoke={onRevoke} />)
    vi.useRealTimers()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove confirmation' }))
    expect(onRevoke).toHaveBeenCalledOnce()
  })
})
