# ClearRights hackathon demo

This is the shortest repeatable path through the working Waypoint Travel integration. It demonstrates product effects and trust boundaries rather than a production compliance system.

## Before presenting

1. Run `npm install` and `npm run dev`.
2. Open the local Vite URL in a browser with WebMCP support when agent tools are part of the presentation.
3. Use **Reset demo data** from Waypoint Personal Controls.
4. Confirm that the privacy notice banner is visible and that the normal WebMCP tool count is eight.

Manual controls remain available in an ordinary browser. WebMCP requires `document.modelContext` support.

## Two-minute path

### 1. Privacy: prepare, approve, verify

Ask:

> Keep booking and account security, but disable personalised recommendations, location suggestions and partner offers.

Expected result:

- the agent stages a deterministic plan and opens the exact review;
- required service processing remains enabled and locked;
- a person holds the visible confirmation for 1.2 seconds;
- `apply_privacy_plan` becomes the dynamic ninth tool only after that confirmation;
- apply reads the host adapter back and produces a scoped, verified receipt;
- Waypoint keeps generic discovery and removes the nearby guide and partner offer.

The human hold is not identity, a signature, or legal proof. Some browser security policies can require the person to press the visible **Apply changes** button even after the hold. Do not bypass that browser decision.

### 2. Accessibility: apply and read back

Ask:

> Make the text larger and reduce motion.

Expected result:

- the change applies immediately without a privacy approval hold;
- the Waypoint DOM adapter reports the complete readback;
- the product visibly uses the new text scale and motion preference;
- one Undo remains available.

These are local, reversible product preferences. They are not an accessibility overlay, medical inference, or compliance claim.

### 3. Site Guide: inspect and navigate

Ask:

> Which pages can you open? Take me to the cancellation policy.

Expected result:

- the agent can describe only developer-declared destinations;
- `navigate_to_site_destination` accepts the catalog ID rather than a free path;
- Waypoint opens the cancellation page, focuses its heading, and keeps browser Back working;
- the blue dot identifies the agent-opened destination until a meaningful interaction occurs.

## What to show at the end

Open `/#/clearrights` after the product flow. Use it as technical evidence:

- live tool count and runtime revisions;
- product-effect mapping for the applied privacy revision;
- receipt-backed privacy verification and DOM accessibility readback;
- SDK/host responsibility boundary;
- concrete Waypoint implementation paths.

## Claims to avoid

Do not describe the demo as a CMP, compliance engine, signature system, identity layer, accessibility remediation product, site crawler, or production backend. The credible claim is:

> A developer declares product controls once, people and compatible agents inspect the same structured catalog, and the host connects verified targets to real adapters and product surfaces.
