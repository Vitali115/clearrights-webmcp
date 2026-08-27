import { defineAccessibilityCatalog } from '@clearrights/sdk/accessibility'
import { definePrivacyCatalog } from '@clearrights/sdk/privacy'
import { defineSiteGuideCatalog } from '@clearrights/sdk/site-guide'

export const minimalPrivacyCatalog = definePrivacyCatalog({
  version: 'minimal-1',
  noticeVersion: 'minimal-notice-1',
  sections: [
    { id: 'service', label: 'Service', description: 'Controls required and optional product behaviour.' },
  ],
  capabilities: [
    { id: 'use_service', label: 'Use the service', description: 'Keep the core signed-in experience available.' },
    { id: 'personalised_feed', label: 'Personalised feed', description: 'Tailor the product feed to represented interests.' },
  ],
  uses: [
    { id: 'service_operations', label: 'Service operations', description: 'Operate the core product.' },
    { id: 'preference_personalisation', label: 'Preference personalisation', description: 'Use represented interests to tailor the feed.' },
  ],
  processing: [
    {
      id: 'service_delivery',
      sectionId: 'service',
      label: 'Service delivery',
      description: {
        summary: 'Keeps the core product available.',
        details: 'Processes the minimum account and session data needed to render the signed-in product.',
      },
      purpose: 'Deliver the requested service.',
      data: ['Account identifier', 'Session state'],
      control: { mode: 'required', mutable: false, defaultEnabled: true },
      dependencies: [],
      consequences: {
        whenEnabled: 'The core product remains available.',
        whenDisabled: 'This required processing cannot be disabled while using the product.',
      },
      policyContexts: [{
        id: 'requested_service',
        label: 'Requested service',
        rationale: 'The host declares this processing as necessary to deliver the signed-in product.',
        references: [],
      }],
      developerContext: {
        factualBackground: 'Replace this example statement with factual product documentation reviewed by the host team.',
        decisionFactors: ['Whether the product can operate without this processing.'],
        limitations: ['This example does not determine a legal basis or compliance outcome.'],
        references: [],
      },
      capabilities: ['use_service'],
      uses: ['service_operations'],
    },
    {
      id: 'recommendations',
      sectionId: 'service',
      label: 'Recommendations',
      description: {
        summary: 'Tailors the product feed to represented interests.',
        details: 'Selects feed items using interests explicitly represented inside this example host.',
      },
      purpose: 'Personalise optional discovery content.',
      data: ['Represented interests'],
      control: { mode: 'opt_in', mutable: true, defaultEnabled: false },
      dependencies: ['service_delivery'],
      consequences: {
        whenEnabled: 'The feed can use represented interests.',
        whenDisabled: 'The same feed surface uses a generic selection.',
      },
      policyContexts: [{
        id: 'optional_personalisation',
        label: 'Optional personalisation',
        rationale: 'The host exposes a separate optional control for this product effect.',
        references: [],
      }],
      developerContext: {
        factualBackground: 'The example maps this setting to a generic or personalised feed mode.',
        decisionFactors: ['The user request to receive personalised discovery.'],
        limitations: ['No advertising network or external profile is connected.'],
        references: [],
      },
      capabilities: ['personalised_feed'],
      uses: ['preference_personalisation'],
    },
  ],
})

export const minimalAccessibilityCatalog = defineAccessibilityCatalog({
  version: 'minimal-1',
  primitives: [
    {
      id: 'textScale',
      label: 'Text size',
      summary: 'Adjust product text size.',
      details: 'The host maps this value to its own design system or DOM adapter.',
      options: [
        { value: 'system', label: 'System', summary: 'Use the host default.' },
        { value: 'large', label: 'Large', summary: 'Use larger text and spacing.' },
      ],
    },
    {
      id: 'colorScheme',
      label: 'Color scheme',
      summary: 'Choose a system, light, or dark product theme.',
      details: 'The host maps this preference to its own design tokens and remains responsible for contrast.',
      options: [
        { value: 'system', label: 'System', summary: 'Follow the operating-system color scheme.' },
        { value: 'light', label: 'Light', summary: 'Use the host light token set.' },
        { value: 'dark', label: 'Dark', summary: 'Use the host dark token set.' },
      ],
    },
    {
      id: 'contrast',
      label: 'Contrast',
      summary: 'Adjust product contrast.',
      details: 'The host remains responsible for its tokens and forced-colors support.',
      options: [
        { value: 'system', label: 'System', summary: 'Follow the system and host defaults.' },
        { value: 'higher', label: 'Higher', summary: 'Use higher-contrast host tokens.' },
      ],
    },
    {
      id: 'motion',
      label: 'Motion',
      summary: 'Adjust non-essential motion.',
      details: 'System delegates to the observed preference; reduced is explicit.',
      options: [
        { value: 'system', label: 'System', summary: 'Follow the system preference.' },
        { value: 'reduced', label: 'Reduced', summary: 'Reduce non-essential motion.' },
      ],
    },
    {
      id: 'readingLayout',
      label: 'Reading layout',
      summary: 'Adjust secondary content layout.',
      details: 'The host defines which content remains primary and reachable.',
      options: [
        { value: 'standard', label: 'Standard', summary: 'Use the standard layout.' },
        { value: 'focused', label: 'Focused', summary: 'Reduce secondary visual weight.' },
      ],
    },
  ],
})

export const minimalSiteGuideCatalog = defineSiteGuideCatalog({
  version: 'minimal-1',
  destinations: [
    {
      id: 'home',
      label: 'Home',
      summary: 'Open the product home.',
      category: 'Product',
      keywords: ['start'],
      target: { kind: 'route', path: '/', hash: '#/' },
    },
    {
      id: 'privacy-controls',
      label: 'Privacy controls',
      summary: 'Open the host privacy panel.',
      category: 'Controls',
      keywords: ['consent'],
      target: { kind: 'panel', panel: 'personal_controls', section: 'privacy' },
    },
  ],
})
