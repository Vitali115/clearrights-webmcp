# ClearRights SDK v0.2 · Waypoint Travel demo

ClearRights is a headless SDK for product controls that are readable by people and callable by compatible agents. The fictional **Waypoint Travel** application demonstrates three separate modules inside one host-owned **Waypoint Personal Controls** sheet:

- **ClearRights Privacy** — deterministic privacy planning, human approval, adapter enforcement, readback, and versioned receipts.
- **ClearRights Accessibility Preferences** — immediate, reversible visual and cognitive preferences.
- **ClearRights Site Guide** — developer-declared, safe destinations that people and agents can open through the same catalog.

ClearRights is the technology. Waypoint Travel is the only demo application. The SDK contains no Waypoint UI or content.

## Run locally

Requirements: Node.js 22.12 or newer and npm.

```bash
npm install
npm run dev
```

Vite normally serves the app at `http://127.0.0.1:5173` or `http://localhost:5173`.

```bash
npm test -- --run
npm run lint
npm run build
```

Manual controls work in an ordinary browser. Page-defined WebMCP tools appear only when the browser provides `document.modelContext`; the Codex in-app browser can exercise them when that capability is enabled.

## Routes

| Route | Purpose |
| --- | --- |
| `/#/` | Waypoint Travel home. |
| `/#/?effects=1` | Non-persistent developer preview of the current product-effect mapping. |
| `/#/clearrights` | Live ClearRights developer integration page. |
| `/#/info/<destination-id>` | Developer-declared Waypoint information page. |
| `/#/privacy` | Legacy route; replaced with `/#/clearrights`. |

The Site Guide also exposes the home `Upcoming trips` anchor and panel destinations for Privacy and Accessibility. It never accepts arbitrary URLs.

## Package boundary

The private workspace package is `@clearrights/sdk@0.2.0`:

```ts
import { definePrivacyCatalog, createPrivacyRuntime } from "@clearrights/sdk/privacy";
import { defineAccessibilityCatalog, createAccessibilityRuntime } from "@clearrights/sdk/accessibility";
import { defineSiteGuideCatalog, createSiteGuideRuntime } from "@clearrights/sdk/site-guide";
```

The package is framework-independent and has no React, DOM, localStorage, sessionStorage, WebMCP, Tailwind, shadcn/ui, or Waypoint dependency. It supplies domain models, validation, runtimes, and adapter ports. The host supplies catalogs, persistence, enforcement, navigation, UI, and product effects.

There is deliberately no universal control runtime. Privacy, Accessibility Preferences, and Site Guide share host conventions and Activity, but keep distinct state and approval policies.

## ClearRights Privacy

Waypoint declares six processing settings using three control modes:

- `required`: enabled and immutable;
- `opt_in`: mutable and initially disabled;
- `opt_out`: mutable and initially enabled.

Every processing definition can provide a short summary, full details, on/off consequences, policy context, and bounded developer context. Full developer-authored content is returned by `inspect_processing` and disclosed in the UI as **Additional context from Waypoint** with `contentProvenance: "site_developer"`. It is treated as text data, never rendered as HTML or interpreted as an instruction.

The detailed workflow is:

```text
inspect → stage → review → human hold → apply → readback → receipt
```

The initial **Privacy choices** banner offers **Essential only**, **Accept all**, and **Manage choices**. Direct choices use `applyDirectChoice`, the same planner and adapter boundary, and record an explicit receipt even when the state is already identical. Opening Manage choices records no decision.

Changing a staged plan revokes review. Ordinary no-op plans cannot be reviewed or applied. Enforcement drift, stale plans, adapter errors, and readback mismatches fail closed.

### Notice and receipt v4

Notice status is `pending`, `recorded`, or `outdated`. A catalog notice-version change keeps the applied state and receipt history but reopens Privacy choices. The next explicit decision, including a direct no-op, records the current notice version.

A receipt v4 contains the complete decision snapshot, processing labels and control modes, compact policy-context snapshots, catalog and notice versions, entry surface, approval method, preparation origin, before/after revisions, adapter ID and scope, and readback verification. The latest ten receipts are retained newest-first.

## ClearRights Accessibility Preferences

The module exposes four catalogued primitives:

- Text size: `system`, `large` (112.5%), or `extra_large` (125%).
- Contrast: `system` or `higher`.
- Motion: `system` or `reduced`.
- Reading layout: `standard` or `focused`.

The workflow is intentionally lighter than privacy:

```text
inspect → set → visible effect → readback → Undo available
```

Preferences apply immediately through a Waypoint DOM adapter and are read back in full. A mismatch or adapter error triggers a best-effort rollback. One previous state is retained for a consumable Undo; a successful new change replaces it, while a no-op does not. Accessibility changes never create privacy receipts.

Explicit settings override system observations. `system` delegates to `prefers-reduced-motion` and `prefers-contrast`; `forced-colors: active` always remains authoritative. The demo does not infer, label, or persist medical conditions and does not present these preferences as an accessibility overlay or proof of compliance.

## ClearRights Site Guide

Waypoint declares twelve destinations with labels, summaries, categories, and unique keywords. Targets are limited to:

- relative same-origin routes with local hashes;
- known Waypoint Personal Controls sections.

The catalog rejects absolute URLs, schemes, backslashes, line breaks, unsafe encoded characters, duplicate IDs, and duplicate keywords. There is no crawling and no free-path tool input. The Waypoint adapter owns visible navigation, sheet state, and focus; browser Back remains available.

## WebMCP tools

Eight tools are registered in the normal state. A ninth, `apply_privacy_plan`, exists only while a non-no-op privacy plan is human-reviewed.

| Tool | Behaviour |
| --- | --- |
| `get_privacy_overview` | Compact applied privacy state, separate pending plan, and planner options; optional reveal. |
| `inspect_processing` | Complete definition and developer context for one declared processing ID; optional reveal. |
| `stage_privacy_plan` | Deterministically stages and reveals the exact privacy review. |
| `get_privacy_receipt` | Latest verified receipt; optional reveal. |
| `get_privacy_history` | Latest ten receipts; optional reveal. |
| `get_accessibility_preferences` | Catalog, current state, observed system values, and options; optional reveal. |
| `set_accessibility_preferences` | Applies a non-empty partial, reads back, opens Accessibility, and reports Undo. |
| `navigate_to_site_destination` | Opens one catalog-declared route or panel destination. |
| `apply_privacy_plan` | Dynamic ninth tool; applies only the exact human-reviewed plan ID. |

Privacy `reveal` defaults to `false`; staging always opens review. Accessibility and destination enums are generated from their runtime catalogs. The WebMCP adapter validates and maps calls to the same controllers used by the UI; it contains no domain decision logic.

Example demo requests:

> Keep booking and account security, but disable personalised recommendations, location suggestions and partner offers.

> Make the text larger, reduce motion and take me to the cancellation policy.

## Waypoint Personal Controls

One responsive sheet composes Privacy, Accessibility, Site Guide, and a secondary Activity timeline. Manual access remains complete without WebMCP.

Agent-opened panels and routes show a blue activity dot until the first meaningful click, keyboard action, or content scroll. Engagement removes the dot and is described only as an interaction; it never selects the privacy hold, implies review, or counts as approval. The timeline is separate and records only concise, user-readable outcomes.

`Reset demo data` restores the privacy seed and pending notice, clears receipts, synchronises local privacy enforcement, resets all accessibility preferences and Undo, clears Activity, closes the sheet, and returns to `/#/` without creating a new event after the clear.

## Host product-effect mapping

Waypoint demonstrates how a product can consume ClearRights state without coupling React components to SDK runtimes or storage:

```text
ClearRights snapshots
  → Waypoint product-effect registry
  → selectWaypointExperience(...)
  → WaypointExperienceViewModel
  → React product surfaces
```

The registry is host configuration in `src/demo/waypoint/product-effects.ts`; it is not part of `@clearrights/sdk`. A Waypoint component receives the final experience view model and never looks up processing IDs, repository keys, or runtime controllers.

| Source setting | Waypoint surface | Current product rule |
| --- | --- | --- |
| Trip fulfilment | Trip summary | Required and always present |
| Account security | Protection status | Required and always present |
| Transactional updates | Trip updates | Required and always present |
| Recommendations | Travel discovery | Generic when off; personalised when on |
| Location suggestions | Nearby guide | Removed when off; visible when on |
| Partner advertising | Partner rail offer | Removed when off; visible when on |
| Text size | Root scale | System, 112.5%, or 125% |
| Contrast | Waypoint tokens | System-aware or higher contrast |
| Motion | Waypoint motion | System-aware or reduced |
| Reading layout | Secondary content | Inline or inside a reachable native disclosure |

Every mapped product surface has a `data-clearrights-surface` hook for inspection, but the normal customer experience displays no technical badges. The developer page filters the live mapping by Privacy or Accessibility and exposes the complete current view model. It labels the applied privacy revision separately from any pending draft. A privacy effect is called verified only when the latest receipt matches that exact revision and value; Accessibility reports the DOM readback produced by its adapter.

Focused reading layout keeps search, upcoming trips, and essential services primary. Its closed disclosure still states whether travel ideas are generic or based on represented interests, so the current privacy outcome remains understandable without reopening secondary content.

The preview query `effects=1` adds discrete surface outlines and reports hidden surfaces. It does not persist, create Activity, change a preference, record a privacy choice, or add a WebMCP tool. Exiting the preview removes the query while preserving browser history.

## Storage and migration

Waypoint chooses the storage keys; the SDK does not.

| Record | Storage | Key | Retention |
| --- | --- | --- | --- |
| Privacy decision and receipts | `localStorage` | `waypoint.privacy.v4` | Latest 10 receipts |
| Privacy enforcement readback | `localStorage` | `waypoint.privacy.enforcement.v2` | Current adapter state |
| Accessibility current/previous | `localStorage` | `waypoint.accessibility.v1` | One Undo state |
| Activity | `sessionStorage` | `waypoint.activity.v1` | Latest 25 events |
| Site Guide | none | — | Session runtime state only |

Valid legacy `clearrights.demo.v3`, `.v2`, and `.v1` privacy records migrate to v4. Existing state and receipt history are preserved and legacy receipts are marked `migrated`. The legacy privacy key is deleted only after the v4 write is read back and validated. `clearrights.demo.enforcement.v1` follows the same verified migration rule to the v2 Waypoint enforcement record. Corrupt records fall back safely to the conservative seed.

## Repository layout

```text
packages/clearrights-sdk/src/
  privacy/          headless catalog, planner, runtime, repository and enforcement ports
  accessibility/    headless catalog, runtime, repository and enforcement ports
  site-guide/       headless catalog, runtime and navigation port

src/
  adapters/         Waypoint storage, DOM, navigation, enforcement and WebMCP adapters
  application/      Waypoint Activity and view coordinators
  demo/waypoint/    developer-authored catalogs, information content and product-effect registry
  ui/waypoint/      host-owned Personal Controls, pages and product UI
```

## Trust boundaries

- **Agent prepared** means a tool created the currently displayed plan or opened the destination. It is provenance, not a signature or guarantee.
- **Human reviewed** means the visible hold completed for the current unchanged plan. It is deliberate UI interaction, not identity proof.
- **Adapter verified** means readback matched the complete target within the adapter's declared scope.
- **Developer context** means site-authored descriptive data. It is not trusted agent instruction.
- **Local demo** means state and product effects remain in this browser unless a host replaces the adapters.

Browser automation can generate native-looking input. The demo does not claim to distinguish it from a person without an out-of-scope identity or telemetry system.

## Explicitly outside scope

- legal advice, compliance determination, signature, identity, or non-repudiation;
- backend accounts, login, cross-device synchronisation, CMP, CRM, or production pipelines;
- geography profiles, DSAR workflows, deletion workflows, or regulatory research;
- atomic transactions across independent external services;
- accessibility remediation, proprietary screen readers, medical inference, or conformance claims;
- automatic site crawling or arbitrary navigation.

The credible integration claim is: **a developer declares product controls once, people and compatible agents inspect the same structured catalog, and the host connects verified targets to its real adapters.**

## Verification

The Vitest suite covers catalog invariants, bounded developer context, deterministic planning, notice and receipt migration, retention, human hold and review revocation, adapter drift/mismatch failures, Accessibility apply/readback/rollback/Undo, Site Guide validation and focus, catalog-derived WebMCP schemas, Activity retention, reset, all eight optional privacy effect combinations, required-surface invariants, responsive control composition, and the complete agent-guided flow.
