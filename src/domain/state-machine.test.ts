import { describe, expect, it } from 'vitest'
import { DomainError, transitionWorkflow } from './index'

describe('transitionWorkflow', () => {
  it('supports the reviewed apply lifecycle', () => {
    expect(transitionWorkflow('idle', 'stage')).toBe('staged')
    expect(transitionWorkflow('staged', 'review')).toBe('reviewed')
    expect(transitionWorkflow('reviewed', 'revoke_review')).toBe('staged')
    expect(transitionWorkflow('reviewed', 'apply')).toBe('applied')
    expect(transitionWorkflow('applied', 'stage')).toBe('staged')
    expect(transitionWorkflow('applied', 'reset')).toBe('idle')
  })

  it('rejects apply outside reviewed', () => {
    expect(() => transitionWorkflow('staged', 'apply')).toThrowError(DomainError)
  })
})
