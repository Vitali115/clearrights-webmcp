# `@clearrights/sdk` v0.2

Headless domain modules for product controls that can be inspected by people and compatible agents and applied through explicit host adapters.

## Package status

This package is a **private workspace package** used by the Waypoint Travel hackathon demo. It is typechecked and tested inside the repository but is not currently published to npm and does not provide a compiled distribution directory.

Use the subpath exports inside this workspace:

```ts
import * as privacy from "@clearrights/sdk/privacy";
import * as accessibility from "@clearrights/sdk/accessibility";
import * as siteGuide from "@clearrights/sdk/site-guide";
```

The root export exposes only the three namespaces.

## Design boundary

The package contains:

- catalog validation and domain models;
- deterministic privacy planning and approval state;
- runtime snapshots and subscriptions;
- repository, enforcement, and navigation ports;
- verification and failure semantics.

The package does not contain React, DOM access, local or session storage, WebMCP registration, Tailwind, UI components, Waypoint content, geography rules, legal determinations, or backend integrations.

## Privacy

Main exports:

- `definePrivacyCatalog`;
- `createPrivacyRuntime`;
- `createPrivacyPlan`;
- `PrivacyRepository`;
- `PrivacyEnforcementAdapter`;
- privacy model and receipt types.

Workflow:

```text
inspect → stage → visible human review → apply → readback → receipt
```

The host alone decides when a real human interaction is sufficient to call `setReviewed(true, "review_hold")`. The runtime rejects apply before review, stale plan IDs, drift, conflicts, enforcement failures, and mismatched readback.

Controls are `required`, `opt_in`, or `opt_out`. Receipt v4 records the complete decision snapshot, revisions, preparation and approval provenance, adapter scope, and verification readback.

## Accessibility Preferences

Main exports:

- `defineAccessibilityCatalog`;
- `createAccessibilityRuntime`;
- `createDefaultAccessibilityState`;
- `AccessibilityRepository`;
- `AccessibilityEnforcementAdapter`.

Workflow:

```text
inspect → set → readback → one Undo
```

The runtime supports `textScale`, `colorScheme`, `contrast`, `motion`, and `readingLayout`. `colorScheme` accepts `system`, `light`, or `dark`; the host maps those values to its own design tokens. The module does not perform DOM remediation, diagnose a condition, or claim accessibility compliance.

## Site Guide

Main exports:

- `defineSiteGuideCatalog`;
- `createSiteGuideRuntime`;
- `SiteNavigationAdapter`.

Workflow:

```text
select catalog destination → host navigation
```

The catalog validates relative same-origin route targets and known panel targets. It does not crawl a site or accept arbitrary URLs.

## Runnable reference

Start with:

- `examples/minimal-host/` for an independent, typechecked integration;
- `docs/INTEGRATION.md` for the host adapter boundary;
- `src/adapters/browser/bootstrap.ts` for Waypoint composition;
- `src/adapters/webmcp/` for catalog-derived host tools.

From the repository root:

```bash
npm run test:example
npm test -- --run
npm run build
```
