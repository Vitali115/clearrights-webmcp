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
      description: {
        summary: 'Measure aggregate visits.',
        details: 'Aggregate page events help the site understand which sections are used.',
      },
      purpose: 'Measure aggregate visits.',
      data: ['Page events'],
      control: { mode: 'opt_in', mutable: true, defaultEnabled: false },
      dependencies: [],
      consequences: {
        whenEnabled: 'Aggregate measurement is available.',
        whenDisabled: 'Aggregate measurement is disabled.',
      },
      policyContexts: [{
        id: 'example-policy',
        label: 'Example policy',
        rationale: 'The developer declares this use optional.',
        references: [{ label: 'Example notice', citation: '§1' }],
      }],
      developerContext: {
        factualBackground: 'Only aggregate demo events are represented.',
        decisionFactors: ['Whether aggregate measurement is useful.'],
        limitations: ['No production analytics service is connected.'],
        references: [],
      },
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
    expect(catalog.getProcessing('audience_measurement').control.defaultEnabled).toBe(false)
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

  it('validates control invariants and developer-authored context limits', () => {
    const catalog = createCatalog()
    const base = catalog.processing[0]

    expect(() => definePrivacyCatalog({
      ...catalog,
      processing: [{ ...base, control: { mode: 'opt_in', mutable: true, defaultEnabled: true } }],
    })).toThrowError(/disabled by default/)

    expect(() => definePrivacyCatalog({
      ...catalog,
      processing: [{
        ...base,
        developerContext: { ...base.developerContext!, decisionFactors: Array.from({ length: 13 }, () => 'Factor') },
      }],
    })).toThrowError(/12-item limit/)
  })

  it('rejects non-http reference URLs', () => {
    const catalog = createCatalog()
    const base = catalog.processing[0]

    expect(() => definePrivacyCatalog({
      ...catalog,
      processing: [{
        ...base,
        policyContexts: [{
          ...base.policyContexts[0],
          references: [{ label: 'Unsafe', url: 'javascript:alert(1)' }],
        }],
      }],
    })).toThrowError(/HTTP or HTTPS/)
  })
})
