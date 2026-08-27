# ClearRights WebMCP

ClearRights is a WebMCP-native privacy-control SDK demonstrated inside the fictional Waypoint Travel product. One developer-defined catalog powers the initial **Privacy choices** banner, the full settings index, structured WebMCP tools, deterministic planning, separate agent and human checks, enforcement-adapter readback, and scoped receipts.

The repository is an OpenAI hackathon demo, but its core boundary is real: `@clearrights/sdk/privacy` is a framework-independent workspace module and Waypoint consumes it through repository and enforcement adapters. The included adapter changes visible product behaviour in the browser. No backend, legal-compliance engine, identity proof, CMP, or external data-pipeline integration is claimed.

## Run locally

Requirements:

- Node.js 22.12 or newer
- npm
- a current browser
- a browser exposing page-defined WebMCP tools for agent-tool testing

```bash
npm install
npm run dev
```

Vite normally serves the app at `http://localhost:5173`.

```bash
npm run build
npm test
npm run lint
```

## Human flow

On a new or reset browser record, required processing starts on and optional processing starts off.

1. The **Privacy choices** banner offers **Essential only**, **Accept all**, and **Manage choices** with equal access.
2. **Essential only** and **Accept all** are explicit human banner actions. They use the same deterministic planner and adapter as the settings center, then store an `initial_choice` receipt. A matching no-op still records the human choice without making ordinary no-op plans approvable.
3. **Manage choices** opens the complete grouped settings index without recording anything.
4. Settings can be opened individually for purpose, data, declared legal basis, dependencies, consequence, and policy reference.
5. Pending settings are reviewed as an exact before/after plan.
6. Detailed plans require the separate 1.2-second human hold.
7. Apply runs through the enforcement adapter, reads the adapter state back, commits the decision record, and exposes a scoped receipt.
8. **Previous changes** retains the latest ten receipts, newest first.

The banner also exposes transparent agent instructions. The internal `/#/privacy` page explains the live architecture, SDK contract, what is real, and what remains outside the demo.

## WebMCP agent flow

The Codex in-app browser can exercise page-defined WebMCP tools directly when its page capability is available; Chrome is not required in that environment. Other browsers need compatible WebMCP support. See the current [WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp).

The intended sequence is:

1. `get_privacy_overview` or `inspect_processing`; pass `reveal: true` only when the corresponding visible view should open.
2. `stage_privacy_plan` with capabilities to keep and uses to avoid.
3. The page opens the exact review and records the plan preparation origin as `webmcp_tool`.
4. A person reads the effects and completes the independent hold control.
5. `apply_privacy_plan` becomes available only for the reviewed plan ID.
6. Apply invokes the SDK adapter, performs readback, and opens the receipt.

Example:

```json
{
  "keepCapabilities": [
    "book_and_manage_trips",
    "protect_account",
    "receive_trip_updates",
    "nearby_suggestions"
  ],
  "avoidUses": [
    "preference_personalisation",
    "partner_marketing"
  ]
}
```

This keeps location suggestions while avoiding preference personalisation and partner marketing. If a kept capability requires an avoided use, the capability is preserved and the conflict is visible.

## Tools

Five tools are registered initially. The sixth exists only while a non-no-op plan is human-reviewed.

| Tool | Input | Behaviour |
| --- | --- | --- |
| `get_privacy_overview` | `{ reveal?: boolean }` | Reads catalog version, notice status, current settings, and planner options. |
| `inspect_processing` | `{ processingId, reveal?: boolean }` | Reads one declared data use and can reveal its detail. |
| `stage_privacy_plan` | `{ keepCapabilities, avoidUses }` | Creates the deterministic plan and always reveals review. |
| `apply_privacy_plan` | `{ planId }` | Exists only after human review; applies and verifies the exact plan. |
| `get_privacy_receipt` | `{ reveal?: boolean }` | Reads the latest scoped receipt. |
| `get_privacy_history` | `{ reveal?: boolean }` | Reads the latest ten receipts. |

Tool input and output contracts are generated from the configured catalog and validated with Zod. Results use `{ ok, data }` or `{ ok, error }`. Read-only calls do not navigate unless `reveal` is true.

## SDK

The package lives at `packages/clearrights-sdk` and deliberately has no React, DOM, localStorage, or WebMCP dependency.

```ts
const privacy = await createPrivacyRuntime({
  catalog: definePrivacyCatalog({
    version: "my-site-1",
    noticeVersion: "my-notice-1",
    sections,
    processing,
    capabilities,
    uses,
  }),
  repository,
  enforcement: {
    id: "my-privacy-stack",
    scope: "external",
    apply: applyPrivacyTarget,
    readCurrentState: readPrivacyTarget,
  },
  clock,
  idGenerator,
});
```

The initial SDK version requires exactly one processing provider per capability. Alternative-provider optimisation is intentionally out of scope.

`PrivacyEnforcementAdapter.apply` receives an operation ID, plan ID, expected revision, complete target, and exact changes. After apply, the runtime calls `readCurrentState`. A receipt marked with `adapter_readback` is created only when every catalog processing value matches the reviewed target.

The runtime also fails closed with `enforcement_drift` when adapter readback does not match the stored decision at startup. The Waypoint-only local adapter explicitly synchronises during browser-schema migration; the generic SDK does not silently overwrite an external adapter.

## Architecture

```text
packages/clearrights-sdk
  catalog, planner, presets, workflow, runtime, repository and enforcement ports

src/demo
  Waypoint catalog and conservative repeatable seed

src/adapters/storage
  localStorage decision record, migrations and receipt retention

src/adapters/enforcement
  isolated Waypoint local-demo enforcement state

src/adapters/webmcp
  catalog-derived tool schemas and registration lifecycle

src/application
  compatibility exports and session-only view coordinator

src/ui
  banner, settings center, agent activity, explainer and product surface
```

```text
Privacy banner ───┐
Settings UI ──────┼──> SDK runtime ──> enforcement adapter ──> readback
WebMCP tools ─────┘          │
                             └──> decision repository ──> scoped receipt
```

The product page visibly consumes the applied state:

- Recommendations changes personalised suggestions to popular destinations.
- Location suggestions controls the nearby-Lisbon surface.
- Partner advertising controls the personalised partner offer.

## Storage and migration

The decision key is `clearrights.demo.v3`. A v3 record contains:

- aggregate revision and complete processing state;
- notice version and `pending | recorded` state;
- initial-choice method when recorded;
- up to ten adapter-scoped receipts.

Valid `clearrights.demo.v2` and `clearrights.demo.v1` records migrate automatically. Existing preference state and receipts are preserved, old receipts are labelled as legacy local-storage readback, the new notice remains pending, and the migrated key is removed. Corrupt records fall back to the repeatable conservative seed.

The isolated demo-enforcement key is `clearrights.demo.enforcement.v1`.

## Trust semantics

- **Agent check** means `stage_privacy_plan` produced the exact plan ID currently displayed. It is preparation provenance, not a signature or guarantee.
- **Human check** means the visible hold control completed. It records deliberate in-page interaction, not person identity.
- **Banner approval** means a person activated an explicit preset button. It does not use the detailed-review hold.
- **Adapter verified** means post-apply adapter readback matched the complete target within the receipt's declared scope.
- **Local demo** means enforcement, decision state, and receipts remain in this browser.

Browser automation can generate pointer or keyboard events. The page does not claim to distinguish it from a person without an out-of-scope identity or telemetry system.

## Blueprint boundary

Inside this demo:

- one shared site and one catalog;
- visible WebMCP actions;
- deterministic planning and conflicts;
- human-gated detailed apply;
- framework-independent SDK package;
- local adapter apply and readback;
- versioned local receipts;
- transparent architecture page.

Outside this demo:

- legal-compliance determination or legal advice;
- identity, trusted timestamps, signing, or non-repudiation;
- backend accounts or cross-device synchronisation;
- CMP, IAB TCF, tag-manager, or production data-pipeline integration;
- atomic transactions across independent external systems;
- formal GDPR requests or regulatory research.

The honest product claim is: **define data uses once, generate human-readable settings and agent-readable controls, then connect each reviewed target to real enforcement in your stack.**

## Tests

The Vitest suite covers catalog validation, deterministic planning, required dependencies, no-op rules, storage migration, receipt retention, initial banner choices, WebMCP lifecycle, agent navigation, human hold, adapter idempotency, drift and mismatch failures, direct routing, prompt copying, product effects, reset, and the complete agent-guided flow.

The interface follows the sparse system-oriented approach in the [OpenAI UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines): text hierarchy, native-looking controls, and only universal outline icons where they carry meaning.
