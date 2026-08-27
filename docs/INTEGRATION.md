# Integrating ClearRights Privacy into a host product

ClearRights is currently a private workspace package used by this repository. It is not published to npm. The runnable reference is `examples/minimal-host`; Waypoint Travel is the complete browser implementation.

## Architecture

```text
host-authored catalogs
  → independent ClearRights runtimes
  → host repositories and enforcement/navigation adapters
  → the same controllers used by UI and WebMCP
  → host experience selector
  → product UI
  → adapter readback and scoped evidence
```

ClearRights Privacy is the primary integration. ClearRights Accessibility Preferences—shown in Waypoint as **Display preferences**—and Site Guide remain independent, optional modules with different approval policies; there is no universal control runtime.

## 1. Import only the modules you use

```ts
import { definePrivacyCatalog, createPrivacyRuntime } from "@clearrights/sdk/privacy";
import { defineAccessibilityCatalog, createAccessibilityRuntime } from "@clearrights/sdk/accessibility";
import { defineSiteGuideCatalog, createSiteGuideRuntime } from "@clearrights/sdk/site-guide";
```

The SDK package has no React, DOM, browser storage, WebMCP, Waypoint, or UI-library dependency.

## 2. Declare host facts

Each catalog belongs to the host product:

- Privacy defines processing, controls, capabilities, uses, consequences, policy context, and bounded developer context.
- Accessibility defines the labels and available options for the five supported primitives, including the host-mapped `system | light | dark` color scheme.
- Site Guide defines curated same-origin routes and supported host-panel destinations.

Developer context is descriptive data. WebMCP exposes it with `contentProvenance: "site_developer"`; an agent must not interpret it as an instruction.

See:

- `examples/minimal-host/catalogs.ts` for a small independent host;
- `src/demo/travel-catalog.ts` and `src/demo/waypoint/*-catalog.ts` for Waypoint.

## 3. Implement the host ports

| Port | Host responsibility | Waypoint reference |
| --- | --- | --- |
| `PrivacyRepository` | Versioned decision state, notice, receipts, conflict detection, reset | `src/adapters/storage/local-storage-privacy-repository.ts` |
| `PrivacyEnforcementAdapter` | Apply an exact target and return complete current-state readback | `src/adapters/enforcement/local-demo-enforcement-adapter.ts` |
| `AccessibilityRepository` | Current state, one previous state, revision conflicts | `src/adapters/accessibility/local-storage-accessibility-repository.ts` |
| `AccessibilityEnforcementAdapter` | Apply the complete visual state and read it back | `src/adapters/accessibility/waypoint-dom-accessibility-adapter.ts` |
| `SiteNavigationAdapter` | Open a validated catalog target, manage focus, report location | `src/adapters/navigation/waypoint-navigation-adapter.ts` |

The in-memory implementations in `examples/minimal-host/memory-adapters.ts` are intentionally local and replaceable. Production adapters remain responsible for authentication, authorisation, transactions, retries, retention, and recovery.

### Privacy adapter mapping

| ClearRights boundary | Waypoint proof | Production target | Evidence required from the host |
| --- | --- | --- | --- |
| `PrivacyRepository` | Versioned localStorage record | CMP or consent backend | Current revision, notice state, complete decisions, and receipt history |
| `PrivacyEnforcementAdapter.apply` | Local demo enforcement | CMP decision API, feature flags, or data pipeline | Exact target state associated with an operation ID |
| `readCurrentState` | Local adapter readback | Authoritative CMP/backend query | Complete state after apply; any mismatch fails closed |
| `PrivacyReceipt` | Last ten browser receipts | Scoped audit or receipt store | Catalog/notice versions, before/after, approval method, adapter, scope, and readback |
| Browser signal reader | `navigator.globalPrivacyControl` | Browser signal plus server-side `Sec-GPC` handling | Observation only; `false` is not consent and no automatic mapping is performed |
| Product-effect selector | Waypoint React view model | Product components, feature services, or API responses | Product surfaces consume only the applied snapshot |

Possible authorised adapter targets include the documented [OneTrust consent group APIs](https://developer.onetrust.com/onetrust/reference/getconsentgrouplistusingget) and [Usercentrics decision APIs](https://docs.usercentrics.com/cmp_in_app_sdk/latest/api/usercentrics-core/). They are reference examples, not bundled integrations, certifications, or claims that vendor transactions are already implemented here.

Global Privacy Control is a narrower observed signal, not a substitute for the complete ClearRights catalog. Waypoint exposes its client-side state as informational data. A production server that acts on the [`Sec-GPC` header](https://www.w3.org/TR/gpc/) must implement and verify that behavior outside this repository.

## 4. Create runtimes during host bootstrap

`examples/minimal-host/bootstrap.ts` constructs all three modules and exposes one host-level `selectExperience()` function. The example is included in TypeScript build checking and has an executable Vitest flow.

Run it with:

```bash
npm run test:example
```

Waypoint performs the equivalent composition in `src/adapters/browser/bootstrap.ts` and `src/App.tsx`.

## 5. Connect snapshots to product UI

Product components should not read SDK IDs, repositories, local storage, or WebMCP directly. The host derives a view model once:

```text
ClearRights snapshots
  → host product-effect registry
  → host experience selector
  → product component props
```

Waypoint declares the copyable host mapping in `src/demo/waypoint/product-effect-registry.ts` and projects it through `src/demo/waypoint/product-effects.ts`. Its React product surfaces consume `WaypointExperienceViewModel`.

## 6. Register WebMCP against the same controllers

WebMCP belongs to the host adapter layer. It should:

- generate input schemas from the active catalogs;
- validate and map tool calls to the same runtime controllers used by the UI;
- contain no planner or approval business logic;
- register consequential privacy apply dynamically only after visible human review;
- keep complete developer context out of compact overview calls;
- remain optional so manual UI continues to work without `document.modelContext`.

Waypoint implements this in `src/adapters/webmcp/`.

## Verification semantics

- **Agent prepared**: tool provenance for a plan or navigation, not approval.
- **Human reviewed**: deliberate confirmation of the exact unchanged privacy plan, not identity or signature.
- **Adapter verified**: complete readback matched the target within the adapter scope.
- **Product effect**: host code derived a UI result from the applied runtime snapshot.

Privacy fails closed on stale plans, repository conflicts, enforcement drift, apply errors, or readback mismatches. Accessibility attempts a best-effort rollback when apply or readback fails. Site Guide accepts catalog IDs rather than arbitrary paths.

## Replacing demo infrastructure

The SDK contracts do not change when a host replaces local adapters with a CMP, consent backend, CRM, feature-flag service, or product data pipeline. Those integrations are outside this repository; ClearRights does not claim their transactions are atomic or compliant by construction.
