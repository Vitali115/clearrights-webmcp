# ClearRights SDK v0.2 · Waypoint Travel demo

ClearRights is a headless SDK for product controls that are readable by people, callable by compatible agents, and applied through explicit host adapters.

> **A developer declares product controls once; people and compatible agents inspect the same structured catalog; the host connects verified targets to real adapters and product surfaces.**

This repository contains:

- `@clearrights/sdk@0.2.0`, a private workspace package with independent Privacy, Accessibility Preferences, and Site Guide modules;
- Waypoint Travel, the fictional host application used for the complete browser demo;
- an independent, typechecked minimal-host example;
- a WebMCP adapter generated from the active host catalogs.

The SDK workspace is not currently published to npm and does not provide a compiled distribution package. Clone this repository to run or study the integration.

## Run the demo

Requirements: Node.js 22.12 or newer and npm.

```bash
npm install
npm run dev
```

Vite normally serves Waypoint at `http://127.0.0.1:5173` or `http://localhost:5173`.

Manual controls work in an ordinary browser. Page-defined WebMCP tools require browser support for `document.modelContext`; the Codex in-app browser can exercise them when that capability is enabled.

## Try it in two minutes

Reset the demo from Waypoint Personal Controls, then ask:

> Keep booking and account security, but disable personalised recommendations, location suggestions and partner offers.

Review the exact visible plan, complete the human hold, apply it, and inspect the verified receipt and changed Waypoint surfaces.

Then ask:

> Make the text larger, reduce motion and take me to the cancellation policy.

This demonstrates immediate accessibility readback, Undo, catalog-constrained navigation, visible focus, and agent activity provenance.

The repeatable presentation script and expected results are in [`docs/DEMO.md`](docs/DEMO.md).

## What a developer can do after cloning

- run the complete Waypoint UI and WebMCP demo;
- change the host-authored privacy, accessibility, and destination catalogs;
- replace local repositories and adapters with host implementations;
- derive different product view models from runtime snapshots;
- run the minimal host independently of Waypoint;
- use the workspace subpath exports from another package in this monorepo.

Start the standalone example with:

```bash
npm run test:example
```

The example lives in [`examples/minimal-host/`](examples/minimal-host/) and covers catalog declaration, adapter ports, runtime bootstrap, privacy receipt verification, accessibility readback, navigation, and a host experience selector.

## Architecture

```text
host-authored catalogs
  → @clearrights/sdk domain runtimes
  → host repositories and enforcement/navigation adapters
  → shared UI and WebMCP controllers
  → host product-effect selector
  → product UI
  → readback and scoped evidence
```

There is no universal control runtime:

- **ClearRights Privacy** uses deterministic planning, visible human review, apply, readback, and versioned receipts.
- **ClearRights Accessibility Preferences** applies local reversible preferences immediately and retains one Undo.
- **ClearRights Site Guide** navigates only to developer-declared routes and panels.

The SDK contains no React, DOM, browser storage, WebMCP, Tailwind, Waypoint content, backend, or compliance engine. Those are host concerns.

## WebMCP surface

Eight tools are registered normally. `apply_privacy_plan` becomes the dynamic ninth tool only while an exact non-no-op privacy plan remains human-reviewed.

| Tool | Purpose |
| --- | --- |
| `get_privacy_overview` | Read applied privacy state and any separate pending plan. |
| `inspect_processing` | Inspect one complete developer-declared processing definition. |
| `stage_privacy_plan` | Prepare and reveal a deterministic privacy plan. |
| `get_privacy_receipt` | Read the latest adapter-verified receipt. |
| `get_privacy_history` | Read the latest ten verified receipts. |
| `get_accessibility_preferences` | Read the catalog, current state, system observations, and Undo status. |
| `set_accessibility_preferences` | Apply and read back a non-empty local preference change. |
| `navigate_to_site_destination` | Open one catalog-declared route or panel. |
| `apply_privacy_plan` | Apply only the exact human-reviewed privacy plan. |

The WebMCP adapter maps validated calls to the same controllers used by the manual UI. It contains no domain decision logic.

## Routes

| Route | Purpose |
| --- | --- |
| `/#/` | Waypoint Travel home. |
| `/#/?effects=1` | Non-persistent product-effect preview. |
| `/#/clearrights` | Live integration guide and inspector. |
| `/#/info/<destination-id>` | Developer-declared Waypoint information page. |

## Repository map

```text
packages/clearrights-sdk/   headless SDK and its public module documentation
examples/minimal-host/      independent, typechecked integration
docs/DEMO.md                repeatable hackathon presentation
docs/INTEGRATION.md         host catalogs, adapters, bootstrap, UI and WebMCP
src/adapters/               Waypoint storage, enforcement, DOM, navigation and WebMCP
src/demo/waypoint/          host catalogs, content and product-effect registry
src/ui/waypoint/            host-owned product and Personal Controls UI
```

Detailed documentation:

- [`packages/clearrights-sdk/README.md`](packages/clearrights-sdk/README.md) — package API, module policies, and SDK boundary;
- [`docs/INTEGRATION.md`](docs/INTEGRATION.md) — implementation path and production adapter responsibilities;
- [`docs/DEMO.md`](docs/DEMO.md) — two-minute demo, expected evidence, and claims to avoid.

## Trust boundary

- **Agent prepared** is provenance for a plan or navigation, not approval.
- **Human reviewed** is deliberate interaction with the exact visible plan, not identity or signature.
- **Adapter verified** means complete readback matched the target within the declared adapter scope.
- **Developer context** is site-authored descriptive data, never agent instruction.
- **Local demo** means state and effects remain in this browser unless the host replaces the adapters.

ClearRights does not claim legal compliance, identity proof, non-repudiation, accessibility remediation, automatic site understanding, or production infrastructure.

## Verify the repository

```bash
npm run test:example
npm test -- --run
npm run lint
npm run build
```

The test suite covers catalog invariants, deterministic planning, review and revocation, migrations and retention, adapter drift and mismatch failures, accessibility rollback and Undo, safe navigation, catalog-derived WebMCP schemas, activity retention, product-effect combinations, and the complete agent-guided flow.
