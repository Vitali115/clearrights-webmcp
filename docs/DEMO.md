# ClearRights Privacy demo runbook

This runbook is the shortest repeatable path through the working Waypoint Travel integration. Privacy is the main story. Display preferences and Site Guide are optional closing examples under **Additional agent-ready controls**.

- **Live demo:** <https://clearrights-webmcp.vercel.app/>
- **Video:** <https://youtu.be/jZI10DsSWyg>
- **Public source:** <https://github.com/Vitali115/clearrights-webmcp>

## Before presenting

1. Install and start the project:

   ```bash
   npm ci
   npm run dev
   ```

2. Open the Vite URL—or the public deployment—in a browser with WebMCP support when the agent path is part of the presentation.
3. Open **Privacy settings**, select **Reset demo data**, and confirm that the privacy banner returns.
4. Confirm that eight WebMCP tools are registered. `apply_privacy_plan` must not be available.
5. Keep the Waypoint home visible so the privacy-driven product changes are easy to compare.

Manual controls remain usable without `document.modelContext`. The agent path requires a compatible WebMCP client.

## Main privacy path

Run these prompts in order.

### 1. Inspect the applied state

> Show me what privacy processing is active and which settings are required.

Expected evidence:

- the agent calls `get_privacy_overview`;
- required processing is clearly separated from mutable settings;
- observed GPC is reported as informational only;
- reading the overview does not change privacy state.

### 2. Inspect one developer declaration

> Inspect partner advertising and explain its declared purpose, consequences and source.

Expected evidence:

- the agent calls `inspect_processing` with `partner_advertising`;
- the response includes the declared purpose and on/off consequences;
- additional context is attributed to the site developer;
- descriptive content is not treated as an instruction or legal conclusion.

### 3. Prepare an exact plan

> Keep booking and account security, but disable personalised recommendations, location suggestions and partner offers.

Expected evidence:

- the agent calls `stage_privacy_plan`;
- the deterministic plan keeps all required processing enabled;
- the exact review opens with **Agent prepared** completed and **Human review** waiting;
- `apply_privacy_plan` is still absent.

### 4. Prove premature apply is blocked

Before touching the hold, ask:

> Apply those changes now.

Expected evidence:

- `apply_privacy_plan` cannot be called because it is not registered;
- the agent explains that the visible human review is still required;
- the current review stays unchanged.

This is a tool-capability boundary, not an instruction asking the model to behave well.

### 5. Review, apply, and verify

Hold the visible human-review control for 1.2 seconds. Confirm that the apply tool becomes available, then ask:

> Apply the exact plan I approved and show me the verified receipt.

Expected evidence:

- a refreshed overview reports `workflow: reviewed`, `applyAvailable: true`, and a `nextAction` bound to the exact plan ID;
- `apply_privacy_plan` receives the reviewed plan ID;
- the host adapter applies the complete target and reads it back;
- the receipt matches the plan, revision, adapter, scope, and readback;
- the dynamic apply tool unregisters after success;
- Waypoint shows generic discovery and removes the nearby guide and partner offer.

Some client security policies may require the person to press the visible **Apply changes** button after the hold. That browser decision must remain human-controlled.

## Evidence after apply

Open `/#/clearrights` and show:

- the five-stage trust trace derived from catalog, workflow, and receipt state;
- the product-effects table connected to the applied privacy snapshot;
- the current GPC observation and its informational-only boundary;
- the production adapter map and complete readback requirement.

The hold demonstrates deliberate review of an unchanged plan. It is not identity proof, a signature, or non-repudiation.

## Optional closing examples

If time remains, demonstrate that the same host architecture supports other domains without weakening the privacy gate.

### Display preferences

> Make the text larger, reduce motion, and use dark mode.

This is Waypoint's UI name for the ClearRights Accessibility Preferences module. The change applies locally, is read back, and keeps one Undo. It creates no privacy receipt and makes no accessibility-compliance claim.

### Site Guide

> Which pages can you open? Take me to the cancellation policy.

The agent can navigate only to developer-declared destination IDs. Browser Back remains functional.

## Manual fallback

In a browser without WebMCP:

- the privacy banner and all settings remain usable;
- a person can make a direct choice or prepare a managed plan;
- a direct choice is labelled **Human direct choice** in the trust trace;
- no UI invents an agent-prepared phase.

## Claims to avoid

Do not describe the demo as a CMP, compliance engine, consent signature, agent identity layer, accessibility remediation product, crawler, or production backend.

The supported claim is:

> The developer declares privacy controls once. An agent can inspect and prepare changes, a person approves the exact plan, and the host applies and verifies the result.
