import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AGENT_PRIVACY_PROMPT, CopyAgentInstructionsButton } from './CopyAgentInstructionsButton'

afterEach(cleanup)

describe('CopyAgentInstructionsButton', () => {
  it('copies the transparent agent prompt and reports completion', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<CopyAgentInstructionsButton />)

    await user.click(screen.getByRole('button', { name: 'Copy agent instructions' }))

    expect(writeText).toHaveBeenCalledWith(AGENT_PRIVACY_PROMPT)
    expect(screen.getByRole('button', { name: 'Instructions copied' })).toBeVisible()
  })
})
