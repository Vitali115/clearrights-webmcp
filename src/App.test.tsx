import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('application foundation', () => {
  it('renders the ClearRights shell', () => {
    render(<App />)

    expect(screen.getByText('ClearRights foundation')).toBeVisible()
  })
})
