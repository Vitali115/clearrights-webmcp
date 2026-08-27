import { defineAccessibilityCatalog } from '@clearrights/sdk/accessibility'

export const waypointAccessibilityCatalog = defineAccessibilityCatalog({
  version: 'waypoint-accessibility-2026.1',
  primitives: [
    {
      id: 'textScale',
      label: 'Text size',
      summary: 'Increase text and spacing across Waypoint.',
      details: 'This local preference scales the root text size while preserving responsive layouts and browser zoom.',
      options: [
        { value: 'system', label: 'System', summary: 'Use the normal Waypoint text scale.' },
        { value: 'large', label: 'Large', summary: 'Scale text and spacing to 112.5%.' },
        { value: 'extra_large', label: 'Extra large', summary: 'Scale text and spacing to 125%.' },
      ],
    },
    {
      id: 'contrast',
      label: 'Contrast',
      summary: 'Use stronger text, border, and focus contrast.',
      details: 'The higher option adjusts Waypoint design tokens. Forced-colors mode always remains controlled by the browser and operating system.',
      options: [
        { value: 'system', label: 'System', summary: 'Follow the normal Waypoint tokens and system contrast preference.' },
        { value: 'higher', label: 'Higher', summary: 'Use stronger contrast for text, muted text, borders, and focus.' },
      ],
    },
    {
      id: 'motion',
      label: 'Motion',
      summary: 'Reduce interface animation and transitions.',
      details: 'System follows prefers-reduced-motion. Reduced removes or shortens non-essential Waypoint motion.',
      options: [
        { value: 'system', label: 'System', summary: 'Follow the operating-system motion preference.' },
        { value: 'reduced', label: 'Reduced', summary: 'Remove or minimise non-essential motion.' },
      ],
    },
    {
      id: 'readingLayout',
      label: 'Reading layout',
      summary: 'Keep primary trip tasks visually prominent.',
      details: 'Focused keeps search and upcoming trips primary while moving discovery and promotional content into a closed native disclosure that remains available.',
      options: [
        { value: 'standard', label: 'Standard', summary: 'Show the complete Waypoint layout.' },
        { value: 'focused', label: 'Focused', summary: 'Reduce secondary discovery and promotional content.' },
      ],
    },
  ],
})
