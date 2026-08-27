import {
  definePrivacyCatalog,
  type ContextReference,
  type DeveloperContext,
  type PolicyContext,
} from '@/domain'

const noticeReference = (citation: string): ContextReference => ({
  label: 'Waypoint Demo Privacy Notice',
  citation,
})

function policyContext({ id, rationale, legalBasis, category, userAction, citation }: {
  id: string
  rationale: string
  legalBasis: string
  category: string
  userAction: string
  citation: string
}): PolicyContext {
  return {
    id,
    label: 'Waypoint declared policy context',
    rationale,
    legalBasis,
    category,
    userAction,
    references: [noticeReference(citation)],
  }
}

function developerContext(
  factualBackground: string,
  decisionFactors: readonly string[],
  limitations: readonly string[],
  citation: string,
): DeveloperContext {
  return {
    factualBackground,
    decisionFactors,
    limitations,
    references: [noticeReference(citation)],
  }
}

export const travelCatalog = definePrivacyCatalog({
  version: 'waypoint-travel-2026.3',
  noticeVersion: 'waypoint-privacy-choices-2026.3',
  sections: [
    { id: 'essential_services', label: 'Essential services', description: 'Needed to provide booked trips and protect your account.' },
    { id: 'personalisation', label: 'Personalisation', description: 'Controls experiences adapted to your interests.' },
    { id: 'location', label: 'Location', description: 'Controls features that use your precise location.' },
    { id: 'partner_offers', label: 'Partner offers', description: 'Controls tailored offers from selected partners.' },
  ],
  processing: [
    {
      id: 'trip_fulfilment',
      sectionId: 'essential_services',
      label: 'Trip fulfilment',
      description: {
        summary: 'Create, manage, and complete the trips you book.',
        details: 'Waypoint uses booking and traveller details to create an itinerary, keep the reservation available in the account, and complete the services explicitly requested by the traveller.',
      },
      purpose: 'Provide the booked travel service from reservation through completion.',
      data: ['Traveller identity', 'Booking details', 'Payment status'],
      control: { mode: 'required', mutable: false, defaultEnabled: true },
      dependencies: [],
      consequences: {
        whenEnabled: 'Booking, itinerary management, and trip fulfilment remain available.',
        whenDisabled: 'Trips could not be booked or managed.',
      },
      policyContexts: [policyContext({
        id: 'waypoint-service-contract',
        rationale: 'Waypoint declares this processing necessary to provide travel services requested in the demo.',
        legalBasis: 'Contract',
        category: 'Essential service delivery',
        userAction: 'Stop using booking services or contact Waypoint about an existing booking.',
        citation: '§2.1',
      })],
      developerContext: developerContext(
        'The demo treats the booking record as the operational source needed to display and manage confirmed travel. This control is intentionally not presented as optional.',
        ['Whether the traveller has an active booking.', 'Whether disabling the processing would make the requested service impossible to provide.'],
        ['This demo does not model retention schedules, payment processors, or account deletion requests.'],
        '§2.1',
      ),
      capabilities: ['book_and_manage_trips'],
      uses: ['booking_operations'],
    },
    {
      id: 'account_security',
      sectionId: 'essential_services',
      label: 'Account security',
      description: {
        summary: 'Detect suspicious access and protect the demo account.',
        details: 'Waypoint evaluates sign-in events, device information, and security signals to detect suspicious access and maintain the integrity of the demo account.',
      },
      purpose: 'Protect the account and booked trips from suspicious access.',
      data: ['Sign-in events', 'Device information', 'Security signals'],
      control: { mode: 'required', mutable: false, defaultEnabled: true },
      dependencies: [],
      consequences: {
        whenEnabled: 'Account security checks remain active.',
        whenDisabled: 'Account protection would be reduced.',
      },
      policyContexts: [policyContext({
        id: 'waypoint-security-interest',
        rationale: 'Waypoint declares a need to protect accounts and reservations against misuse.',
        legalBasis: 'Legitimate interest',
        category: 'Security and fraud prevention',
        userAction: 'Contact Waypoint support to question or report a security event.',
        citation: '§2.2',
      })],
      developerContext: developerContext(
        'Security processing is represented as a required technical safeguard in the local demo. It is separate from advertising and travel personalisation.',
        ['The risk of unauthorised account access.', 'The need to protect existing reservations and account actions.'],
        ['The demo does not perform real authentication, device fingerprinting, or fraud scoring.'],
        '§2.2',
      ),
      capabilities: ['protect_account'],
      uses: ['fraud_prevention'],
    },
    {
      id: 'transactional_updates',
      sectionId: 'essential_services',
      label: 'Transactional updates',
      description: {
        summary: 'Send confirmations, schedule changes, and essential trip notices.',
        details: 'Waypoint uses contact details and booking status to deliver confirmations and service messages directly related to active or recently requested travel.',
      },
      purpose: 'Deliver operational communications about booked trips.',
      data: ['Contact details', 'Booking status', 'Journey schedule'],
      control: { mode: 'required', mutable: false, defaultEnabled: true },
      dependencies: ['trip_fulfilment'],
      consequences: {
        whenEnabled: 'Essential booking messages can be delivered.',
        whenDisabled: 'Essential booking updates could not be delivered.',
      },
      policyContexts: [policyContext({
        id: 'waypoint-service-communications',
        rationale: 'Waypoint declares these communications necessary to keep a requested travel service usable.',
        legalBasis: 'Contract',
        category: 'Transactional communication',
        userAction: 'Update contact details or contact support about delivery problems.',
        citation: '§2.3',
      })],
      developerContext: developerContext(
        'Transactional updates are limited in this demo to booking confirmations, schedule changes, and service notices. They are not used as a synonym for marketing.',
        ['Whether the message is necessary for an active booking.', 'Whether the same content would be sent without a booking relationship.'],
        ['Email delivery providers and retention are not represented.'],
        '§2.3',
      ),
      capabilities: ['receive_trip_updates'],
      uses: ['service_communications'],
    },
    {
      id: 'recommendations',
      sectionId: 'personalisation',
      label: 'Recommendations',
      description: {
        summary: 'Suggest destinations and itineraries based on travel preferences.',
        details: 'When enabled, Waypoint adapts destination and itinerary suggestions using interests inferred from viewed destinations, saved preferences, and past trips represented by the demo.',
      },
      purpose: 'Personalise destination and itinerary suggestions.',
      data: ['Travel preferences', 'Viewed destinations', 'Past trips'],
      control: { mode: 'opt_in', mutable: true, defaultEnabled: false },
      dependencies: ['trip_fulfilment'],
      consequences: {
        whenEnabled: 'Destination suggestions can reflect represented travel interests.',
        whenDisabled: 'Destination and itinerary suggestions will be generic.',
      },
      policyContexts: [policyContext({
        id: 'waypoint-personalisation-choice',
        rationale: 'Waypoint declares personalisation optional and controlled by an explicit choice.',
        legalBasis: 'Consent',
        category: 'Experience personalisation',
        userAction: 'Allow or deny this use from Personal Controls.',
        citation: '§3.1',
      })],
      developerContext: developerContext(
        'The recommendation surface visibly changes between interest-based suggestions and a generic popular-destinations list, allowing the applied state to be inspected in the product.',
        ['Whether tailored discovery is useful to the traveller.', 'Whether using viewed and past-trip information is acceptable for this purpose.'],
        ['The demo uses fixed sample content and does not run a recommendation model.'],
        '§3.1',
      ),
      capabilities: ['personalised_recommendations'],
      uses: ['preference_personalisation'],
    },
    {
      id: 'location_suggestions',
      sectionId: 'location',
      label: 'Location suggestions',
      description: {
        summary: 'Suggest nearby places during a trip.',
        details: 'When enabled, Waypoint may use precise location together with destination context to present nearby suggestions during a trip.',
      },
      purpose: 'Provide place suggestions based on current location.',
      data: ['Precise location', 'Destination context'],
      control: { mode: 'opt_in', mutable: true, defaultEnabled: false },
      dependencies: ['trip_fulfilment'],
      consequences: {
        whenEnabled: 'Nearby place suggestions become available in the trip view.',
        whenDisabled: 'Nearby place suggestions will no longer be available.',
      },
      policyContexts: [policyContext({
        id: 'waypoint-location-choice',
        rationale: 'Waypoint declares precise-location suggestions optional and controlled by an explicit choice.',
        legalBasis: 'Consent',
        category: 'Precise location',
        userAction: 'Allow or deny this use from Personal Controls and manage device permissions separately.',
        citation: '§3.2',
      })],
      developerContext: developerContext(
        'The setting represents product-level permission to use precise location for suggestions. Operating-system or browser location permission remains a separate prerequisite outside ClearRights.',
        ['Whether nearby suggestions are needed.', 'Whether precise rather than general destination context is acceptable.'],
        ['The demo does not request real geolocation or infer a live position.'],
        '§3.2',
      ),
      capabilities: ['nearby_suggestions'],
      uses: ['precise_location'],
    },
    {
      id: 'partner_advertising',
      sectionId: 'partner_offers',
      label: 'Partner advertising',
      description: {
        summary: 'Tailor advertising from selected travel partners.',
        details: 'When enabled, Waypoint uses represented travel interests and partner engagement to tailor offers shown inside the demo product.',
      },
      purpose: 'Personalise partner advertising displayed by Waypoint.',
      data: ['Travel interests', 'Partner engagement'],
      control: { mode: 'opt_in', mutable: true, defaultEnabled: false },
      dependencies: [],
      consequences: {
        whenEnabled: 'A partner offer may be tailored to represented travel interests.',
        whenDisabled: 'Partner offers will no longer be personalised.',
      },
      policyContexts: [policyContext({
        id: 'waypoint-partner-marketing-choice',
        rationale: 'Waypoint declares partner advertising optional and separate from booking fulfilment.',
        legalBasis: 'Consent',
        category: 'Partner marketing',
        userAction: 'Allow or deny this use from Personal Controls.',
        citation: '§3.3',
      })],
      developerContext: developerContext(
        'The demo shows or removes one in-product partner offer so the enforcement result is visible. It does not send data to an advertising platform.',
        ['Whether tailored partner offers are wanted.', 'Whether travel-interest data should be used for advertising.'],
        ['No partner network, auction, audience sharing, or tracking pixel is connected.'],
        '§3.3',
      ),
      capabilities: ['partner_offers'],
      uses: ['partner_marketing'],
    },
  ],
  capabilities: [
    { id: 'book_and_manage_trips', label: 'Book and manage trips', description: 'Keep booking and trip management available.' },
    { id: 'protect_account', label: 'Protect the account', description: 'Keep account security checks active.' },
    { id: 'receive_trip_updates', label: 'Receive trip updates', description: 'Keep essential booking messages.' },
    { id: 'personalised_recommendations', label: 'Personalised recommendations', description: 'Keep suggestions based on travel preferences.' },
    { id: 'nearby_suggestions', label: 'Nearby suggestions', description: 'Keep suggestions based on current location.' },
    { id: 'partner_offers', label: 'Partner offers', description: 'Keep tailored offers from travel partners.' },
  ],
  uses: [
    { id: 'booking_operations', label: 'Booking operations', description: 'Use data to create and manage trips.' },
    { id: 'fraud_prevention', label: 'Fraud prevention', description: 'Use security signals to protect the account.' },
    { id: 'service_communications', label: 'Service communications', description: 'Use contact details for essential trip updates.' },
    { id: 'preference_personalisation', label: 'Preference personalisation', description: 'Use travel interests to personalise recommendations.' },
    { id: 'precise_location', label: 'Precise location', description: 'Use current location for nearby suggestions.' },
    { id: 'partner_marketing', label: 'Partner marketing', description: 'Use travel interests for partner advertising.' },
  ],
})
