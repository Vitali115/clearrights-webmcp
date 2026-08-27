export interface WaypointInfoSection {
  heading: string
  paragraphs: readonly string[]
}

export interface WaypointInfoPageDefinition {
  id: string
  eyebrow: string
  title: string
  summary: string
  sections: readonly WaypointInfoSection[]
}

export const waypointInfoPages: Readonly<Record<string, WaypointInfoPageDefinition>> = {
  'passenger-details': {
    id: 'passenger-details',
    eyebrow: 'Account and booking',
    title: 'Passenger details',
    summary: 'The information a fictional Waypoint booking needs for each traveller.',
    sections: [
      {
        heading: 'Used for a booking',
        paragraphs: [
          'Waypoint represents names, contact details, itinerary requirements, and booking references so a traveller can review a trip.',
          'This local demo does not create an account, verify an identity, or send passenger data to a carrier.',
        ],
      },
      {
        heading: 'What you can control',
        paragraphs: ['Optional personalisation is managed separately in Personal Controls. Information required to fulfil an active booking remains marked as required.'],
      },
    ],
  },
  'payment-methods': {
    id: 'payment-methods',
    eyebrow: 'Account and booking',
    title: 'Payment methods',
    summary: 'How payment information is represented in the Waypoint demo.',
    sections: [
      {
        heading: 'Local demonstration only',
        paragraphs: [
          'No card number, bank account, wallet, or payment credential is collected or stored by this application.',
          'The privacy catalog includes payment status only to explain the boundary of fictional trip fulfilment.',
        ],
      },
    ],
  },
  'privacy-notice': {
    id: 'privacy-notice',
    eyebrow: 'Privacy',
    title: 'Privacy notice',
    summary: 'A short, fictional notice that supplies context for the ClearRights privacy catalog.',
    sections: [
      {
        heading: 'Required uses',
        paragraphs: ['Waypoint declares trip fulfilment, account security, and transactional updates as required for the represented travel service.'],
      },
      {
        heading: 'Optional uses',
        paragraphs: ['Recommendations, precise-location suggestions, and partner advertising are separate choices. Their current state, consequences, and declared context are available in Personal Controls.'],
      },
      {
        heading: 'Demo boundary',
        paragraphs: ['This notice is sample product content, not legal advice or a privacy notice for a real service. ClearRights records the choices made against its versioned local catalog.'],
      },
    ],
  },
  'cookie-details': {
    id: 'cookie-details',
    eyebrow: 'Privacy',
    title: 'Cookie details',
    summary: 'The local records used to keep this demonstration coherent between views.',
    sections: [
      {
        heading: 'Local storage',
        paragraphs: ['Waypoint stores the privacy decision and its latest ten receipts separately from accessibility preferences. The enforcement adapter has its own local readback record.'],
      },
      {
        heading: 'Session activity',
        paragraphs: ['A maximum of 25 user-readable activity events is kept in session storage. Prompts, raw tool JSON, PII, and agent reasoning are not recorded.'],
      },
      {
        heading: 'Not represented',
        paragraphs: ['The demo does not connect analytics, advertising pixels, a CMP, cross-device identity, or a production backend.'],
      },
    ],
  },
  'accessibility-statement': {
    id: 'accessibility-statement',
    eyebrow: 'Accessibility',
    title: 'Accessibility statement',
    summary: 'How the demo treats additional visual and cognitive preferences.',
    sections: [
      {
        heading: 'Preferences, not an overlay',
        paragraphs: ['Text size, color scheme, contrast, motion, and reading layout are immediate, reversible product preferences. They are not presented as automated accessibility remediation or proof of conformance.'],
      },
      {
        heading: 'System settings remain authoritative',
        paragraphs: ['The system options delegate to browser media queries. Forced-colors mode is always respected, and no observed preference is used to infer or store a medical condition.'],
      },
    ],
  },
  'cancellation-policy': {
    id: 'cancellation-policy',
    eyebrow: 'Policies',
    title: 'Cancellation policy',
    summary: 'Fictional cancellation and refund rules used as a navigable Waypoint destination.',
    sections: [
      {
        heading: 'Flexible demo bookings',
        paragraphs: ['Sample trips may be cancelled before departure without a charge. In a real product, the applicable supplier fare and booking terms would determine the outcome.'],
      },
      {
        heading: 'Refund timing',
        paragraphs: ['The demo does not process money. A production integration would show the calculated refund and require the traveller to confirm before submitting a cancellation.'],
      },
    ],
  },
  'help-and-support': {
    id: 'help-and-support',
    eyebrow: 'Support',
    title: 'Help and support',
    summary: 'Common destinations for assistance with a fictional Waypoint trip.',
    sections: [
      {
        heading: 'Trip help',
        paragraphs: ['Review upcoming trips on the home page or open the cancellation policy from the Site Guide. No support ticket is created by this demo.'],
      },
      {
        heading: 'Personal Controls',
        paragraphs: ['Privacy choices, accessibility preferences, declared site destinations, and recent local activity remain available from the same panel.'],
      },
    ],
  },
  'contact-waypoint': {
    id: 'contact-waypoint',
    eyebrow: 'Support',
    title: 'Contact Waypoint',
    summary: 'Fictional contact options with no external messaging side effect.',
    sections: [
      {
        heading: 'Demo contact channels',
        paragraphs: ['A production Waypoint service could expose secure messaging, email, or phone support here. This page does not collect a message or contact an external party.'],
      },
    ],
  },
}

export function getWaypointInfoPage(id: string): WaypointInfoPageDefinition | null {
  return Object.hasOwn(waypointInfoPages, id) ? waypointInfoPages[id]! : null
}
