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
    render(<HoldToConfirm confirmed={false} onConfirm={onConfirm} />)
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
    render(<HoldToConfirm confirmed={false} onConfirm={onConfirm} />)
    const control = screen.getByRole('button', { name: 'Hold to confirm review' })

    fireEvent.pointerDown(control, { button: 0, pointerId: 1 })
    act(() => vi.advanceTimersByTime(HOLD_TO_CONFIRM_MS / 2))
    fireEvent.pointerUp(control, { button: 0, pointerId: 1 })
    act(() => vi.advanceTimersByTime(HOLD_TO_CONFIRM_MS))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('supports a keyboard hold', () => {
    vi.useFakeTimers()
    const onConfirm = vi.fn()
    render(<HoldToConfirm confirmed={false} onConfirm={onConfirm} />)
    const control = screen.getByRole('button', { name: 'Hold to confirm review' })

    fireEvent.keyDown(control, { key: 'Enter' })
    act(() => vi.advanceTimersByTime(HOLD_TO_CONFIRM_MS))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('exposes a confirmed seal and does not accept further holds', async () => {
    const onConfirm = vi.fn()
    render(<HoldToConfirm confirmed onConfirm={onConfirm} />)
    const control = screen.getByRole('button', { name: 'Human confirmation recorded' })
    expect(control).toHaveAttribute('aria-pressed', 'true')
    expect(control).toBeDisabled()
    await userEvent.setup().click(control)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
