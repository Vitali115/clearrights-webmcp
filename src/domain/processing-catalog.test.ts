import { describe, expect, it } from 'vitest'
import { definePrivacyCatalog, DomainError } from './index'

function createCatalog() {
  return definePrivacyCatalog({
    version: 'example-1',
    noticeVersion: 'notice-1',
    sections: [{ id: 'analytics', label: 'Analytics', description: 'Site measurement.' }],
    processing: [{
      id: 'audience_measurement',
      sectionId: 'analytics',
      label: 'Audience measurement',
      group: 'optional',
      locked: false,
      defaultEnabled: false,
      purpose: 'Measure aggregate visits.',
      data: ['Page events'],
      declaredLegalBasis: 'consent',
      control: 'Can be changed.',
      dependencies: [],
      consequence: 'Aggregate measurement is disabled.',
      policyReference: 'Example §1',
      capabilities: ['measure_site'],
      uses: ['analytics_use'],
    }],
    capabilities: [{ id: 'measure_site', label: 'Measure site', description: 'Keep analytics.' }],
    uses: [{ id: 'analytics_use', label: 'Analytics', description: 'Measure visits.' }],
  })
}

describe('definePrivacyCatalog', () => {
  it('accepts developer-defined IDs and display sections', () => {
    const catalog = createCatalog()

    expect(catalog.getSection('analytics').label).toBe('Analytics')
    expect(catalog.getProcessing('audience_measurement').defaultEnabled).toBe(false)
  })

  it('rejects ambiguous capability providers in the initial SDK contract', () => {
    const catalog = createCatalog()
    const duplicate = { ...catalog.processing[0], id: 'second_measurement' }

    expect(() => definePrivacyCatalog({
      version: catalog.version,
      noticeVersion: catalog.noticeVersion,
      sections: catalog.sections,
      processing: [...catalog.processing, duplicate],
      capabilities: catalog.capabilities,
      uses: catalog.uses,
    })).toThrowError(DomainError)
  })
})
