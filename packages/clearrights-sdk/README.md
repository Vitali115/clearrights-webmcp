# `@clearrights/sdk` 0.2.0

Headless ClearRights domain modules used by the Waypoint Travel demo.

## Public imports

```ts
import * as privacy from "@clearrights/sdk/privacy";
import * as accessibility from "@clearrights/sdk/accessibility";
import * as siteGuide from "@clearrights/sdk/site-guide";
```

The root export provides the same three namespaces. Subpath imports are recommended so each domain boundary stays explicit.

The package has no React, DOM, browser storage, WebMCP, UI-library, or Waypoint dependency. It is private to this workspace and is not published to npm.

## Privacy

`definePrivacyCatalog` validates control modes, sections, processing dependencies, capability/use references, bounded descriptions and developer context, and HTTP(S)-only context URLs. `createPrivacyRuntime` provides deterministic planning, review state, direct choices, adapter application, complete readback, receipt v4 generation, and fail-closed drift handling.

```ts
const runtime = await createPrivacyRuntime({
  catalog: definePrivacyCatalog({
    version: "product-catalog-1",
    noticeVersion: "privacy-notice-1",
    sections,
    processing,
    capabilities,
    uses,
  }),
  repository,
  enforcement,
  clock,
  idGenerator,
});
```

Hosts implement `PrivacyRepository` and `PrivacyEnforcementAdapter`. Adapter `apply` should be idempotent for its `operationId`; the runtime issues a verified receipt only after the complete target is read back.

Detailed plan application requires `review_hold`. Direct preset or managed decisions use `explicit_action` through `applyDirectChoice`. The runtime has no banner copy or component assumptions.

## Accessibility Preferences

`defineAccessibilityCatalog` configures labels, descriptions, and the available options for the four fixed primitive IDs. `createAccessibilityRuntime` provides snapshots, subscriptions, partial updates, full readback, best-effort rollback, one consumable Undo, and reset.

```ts
const runtime = await createAccessibilityRuntime({
  catalog,
  repository,
  enforcement,
  idGenerator,
});

await runtime.setPreferences({ textScale: "large", motion: "reduced" }, "human");
await runtime.undo("human");
```

Hosts implement `AccessibilityRepository` and `AccessibilityEnforcementAdapter`. The module does not inspect media queries, modify the DOM, persist medical information, or create privacy receipts.

## Site Guide

`defineSiteGuideCatalog` validates unique IDs and keywords plus safe relative route or known panel targets. `createSiteGuideRuntime` resolves only catalog IDs and delegates visible navigation to `SiteNavigationAdapter`.

```ts
const runtime = createSiteGuideRuntime({ catalog, navigator });
await runtime.navigate("cancellation-policy", "agent");
```

The module does not crawl pages, accept arbitrary paths, change privacy or accessibility state, or persist navigation history.

## Host responsibilities

The SDK does not provide production storage, UI, WebMCP registration, authentication, authorisation, CMP or CRM connectivity, legal analysis, distributed transactions, or operational rollback across external systems. The host owns:

- catalog accuracy and versioning;
- adapter scope and real side effects;
- persistence keys and migration policy;
- UI, focus, navigation, and approval affordances;
- access control, observability, recovery, and legal review.

Developer-authored descriptions and context are data. Adapters and agents must not interpret them as executable instructions.
