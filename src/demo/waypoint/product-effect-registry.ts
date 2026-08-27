import type { WaypointProductEffectDefinition } from './product-effects'

export const WAYPOINT_PRODUCT_EFFECT_REGISTRY_FILE = 'src/demo/waypoint/product-effect-registry.ts'

const productPage = 'src/ui/TravelProductPage.tsx'
const accessibilityAdapter = 'src/adapters/accessibility/waypoint-dom-accessibility-adapter.ts'

export const waypointProductEffectRegistry = [
  {
    id: 'privacy-trip-summary', source: 'privacy', settingId: 'trip_fulfilment', settingLabel: 'Trip fulfilment',
    surfaceId: 'trip-summary', surfaceLabel: 'Upcoming trip summary',
    technicalCopy: 'Keeps the booked-trip summary available because fulfilment is a required service.',
    code: { consumerFile: productPage, expression: 'experience.essentials.tripSummary' },
  },
  {
    id: 'privacy-protection-status', source: 'privacy', settingId: 'account_security', settingLabel: 'Account security',
    surfaceId: 'protection-status', surfaceLabel: 'Account protection status',
    technicalCopy: 'Keeps the account protection state visible because security processing is required.',
    code: { consumerFile: productPage, expression: 'experience.essentials.protectionStatus' },
  },
  {
    id: 'privacy-trip-updates', source: 'privacy', settingId: 'transactional_updates', settingLabel: 'Transactional updates',
    surfaceId: 'trip-updates', surfaceLabel: 'Essential trip updates',
    technicalCopy: 'Keeps operational booking updates available and separate from marketing.',
    code: { consumerFile: productPage, expression: 'experience.essentials.tripUpdates' },
  },
  {
    id: 'privacy-discovery', source: 'privacy', settingId: 'recommendations', settingLabel: 'Recommendations',
    surfaceId: 'travel-discovery', surfaceLabel: 'Travel discovery',
    technicalCopy: 'Switches the same discovery surface between generic and interest-based content.',
    code: { consumerFile: productPage, expression: 'experience.discovery' },
  },
  {
    id: 'privacy-nearby-guide', source: 'privacy', settingId: 'location_suggestions', settingLabel: 'Location suggestions',
    surfaceId: 'nearby-guide', surfaceLabel: 'Nearby guide',
    technicalCopy: 'Shows the nearby guide only when the represented location setting is active.',
    code: { consumerFile: productPage, expression: "experience.nearbyGuide === 'visible'" },
  },
  {
    id: 'privacy-partner-offer', source: 'privacy', settingId: 'partner_advertising', settingLabel: 'Partner advertising',
    surfaceId: 'partner-offer', surfaceLabel: 'Partner rail offer',
    technicalCopy: 'Shows the tailored partner offer only when partner advertising is active.',
    code: { consumerFile: productPage, expression: "experience.partnerOffer === 'visible'" },
  },
  {
    id: 'accessibility-root-scale', source: 'accessibility', settingId: 'textScale', settingLabel: 'Text size',
    surfaceId: 'root-scale', surfaceLabel: 'Root text scale',
    technicalCopy: 'Maps the chosen text scale to the Waypoint root element.',
    code: { consumerFile: accessibilityAdapter, expression: "root.dataset.textScale = target.textScale" },
  },
  {
    id: 'accessibility-color-scheme', source: 'accessibility', settingId: 'colorScheme', settingLabel: 'Color scheme',
    surfaceId: 'waypoint-color-scheme', surfaceLabel: 'Waypoint color scheme',
    technicalCopy: 'Follows the operating-system theme or applies an explicit light or dark Waypoint token set.',
    code: { consumerFile: accessibilityAdapter, expression: "root.dataset.colorScheme = target.colorScheme" },
  },
  {
    id: 'accessibility-tokens', source: 'accessibility', settingId: 'contrast', settingLabel: 'Contrast',
    surfaceId: 'waypoint-tokens', surfaceLabel: 'Waypoint design tokens',
    technicalCopy: 'Selects the normal or higher-contrast Waypoint token set while respecting forced colors.',
    code: { consumerFile: accessibilityAdapter, expression: "root.dataset.contrast = target.contrast" },
  },
  {
    id: 'accessibility-motion', source: 'accessibility', settingId: 'motion', settingLabel: 'Motion',
    surfaceId: 'waypoint-motion', surfaceLabel: 'Waypoint motion',
    technicalCopy: 'Delegates to the system or removes non-essential Waypoint transitions.',
    code: { consumerFile: accessibilityAdapter, expression: "root.dataset.motion = target.motion" },
  },
  {
    id: 'accessibility-secondary-content', source: 'accessibility', settingId: 'readingLayout', settingLabel: 'Reading layout',
    surfaceId: 'secondary-content', surfaceLabel: 'Secondary travel content',
    technicalCopy: 'Keeps secondary content inline or moves it into a reachable native disclosure.',
    code: { consumerFile: productPage, expression: "experience.accessibility.readingLayout === 'focused'" },
  },
] as const satisfies readonly WaypointProductEffectDefinition[]
