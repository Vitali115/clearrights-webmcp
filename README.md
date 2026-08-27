# ClearRights Privacy

ClearRights Privacy is a WebMCP reference implementation for agent-prepared, human-approved, host-verified privacy changes.

**[Open the live demo](https://clearrights-webmcp.vercel.app/)** · [Developer integration](https://clearrights-webmcp.vercel.app/#/clearrights) · [Public source](https://github.com/Vitali115/clearrights-webmcp)

> **A developer declares privacy controls once. An agent can inspect and prepare an exact plan, a person reviews that plan, and the host applies and reads the result back through an explicit adapter.**

Waypoint Travel is the fictional product that demonstrates the complete workflow. The repository also contains the private workspace package `@clearrights/sdk@0.2.0`, a minimal independent host, and two secondary modules: ClearRights Accessibility Preferences—shown in Waypoint as **Display preferences**—and Site Guide.

The package is not published to npm. Clone this repository to run or study the integration.

## Run it

Requirements: Node.js 22.12 or newer and npm.

```bash
npm ci
npm run dev
```

Open the Vite URL, normally `http://127.0.0.1:5173`. Manual privacy settings work in an ordinary browser. Page-defined tools require `document.modelContext`; use ChatGPT's in-app browser or Chrome 149+ with WebMCP testing enabled.

To inspect the deployed build instead, open [`https://clearrights-webmcp.vercel.app`](https://clearrights-webmcp.vercel.app/).

## The two-minute privacy path

Reset the demo from **Privacy settings**, then ask a compatible agent:

1. `Show me what privacy processing is active and which settings are required.`
2. `Inspect partner advertising and explain its declared purpose, consequences and source.`
3. `Keep booking and account security, but disable personalised recommendations, location suggestions and partner offers.`
4. Before touching the hold: `Apply those changes now.`
5. Hold the visible review control, then ask: `Apply the exact plan I approved and show me the verified receipt.`

Before the hold, `apply_privacy_plan` is not registered. After the hold, it becomes the dynamic ninth tool for only the unchanged reviewed plan. Successful apply performs complete adapter readback, issues a scoped receipt, and changes the real Waypoint product surfaces.

When review is complete, the overview also exposes a machine-readable `nextAction` containing `apply_privacy_plan`, the exact reviewed `planId`, and `humanReviewComplete: true`. The read-only receipt tool explicitly does not apply pending plans and may return an older receipt.

The repeatable script is in [`docs/DEMO.md`](docs/DEMO.md). The five-case eval dataset is in [`evals/privacy-prompt-cases.json`](evals/privacy-prompt-cases.json), and the observed direct-tool, native Chrome, and model-driven results are recorded without an invented aggregate rate in [`docs/EVALS.md`](docs/EVALS.md).

## What is real in the demo

The live trust trace is derived from actual state:

```text
Declared by Waypoint
  → Prepared by agent
  → Reviewed by human
  → Applied by adapter
  → Readback matched
```

- catalog and notice versions come from the active host catalog;
- agent preparation requires `preparationOrigin: "webmcp_tool"` and the exact plan ID;
- human review requires the 1.2-second hold and an unchanged plan;
- applied and verified stages require a receipt matching the current revision and adapter readback;
- direct banner actions are labelled as direct human choices, never as agent preparation.

Waypoint also reads Global Privacy Control when the browser exposes `navigator.globalPrivacyControl`. This observation is informational only: `false` does not mean consent, and neither value automatically changes settings, notice state, revisions, or receipts.

## Architecture

```text
developer-authored privacy catalog
  → @clearrights/sdk/privacy runtime and deterministic planner
  → host repository and enforcement adapters
  → shared UI and WebMCP controller
  → visible human review gate
  → adapter apply and complete readback
  → scoped receipt
  → host product-effect selector
  → Waypoint UI
```

The SDK contains no React, DOM, browser storage, WebMCP, Tailwind, Waypoint content, backend, or compliance engine. Those are host concerns.

## WebMCP tools

Eight tools are registered normally. `apply_privacy_plan` becomes the ninth only while an exact non-no-op plan remains human-reviewed.

### ClearRights Privacy

| Tool | Purpose |
| --- | --- |
| `get_privacy_overview` | Read applied state, pending plan, planner options, workflow, observed browser signals, and the exact next tool action after human review. |
| `inspect_processing` | Inspect one complete developer-declared processing definition. |
| `stage_privacy_plan` | Prepare and reveal a deterministic privacy plan. |
| `get_privacy_receipt` | Read the latest adapter-verified receipt. |
| `get_privacy_history` | Read up to ten verified receipts. |
| `apply_privacy_plan` | Dynamically apply only the exact human-reviewed plan. |

### Additional modules

| Tool | Purpose |
| --- | --- |
| `get_accessibility_preferences` | Read local display preferences and observed system values. |
| `set_accessibility_preferences` | Apply, read back, and keep one Undo. |
| `navigate_to_site_destination` | Open one developer-declared route or panel. |

Display preferences and Site Guide appear under **Additional agent-ready controls** in Waypoint. Their SDK modules remain functional demonstrations of the architecture, but privacy is the primary product and submission path.

## From demo adapters to production

ClearRights defines replaceable host ports rather than pretending to be production infrastructure:

| Boundary | Waypoint | Production replacement |
| --- | --- | --- |
| `PrivacyRepository` | Versioned localStorage record | CMP or consent backend |
| `PrivacyEnforcementAdapter` | Local state plus readback | CMP decisions, feature flags, or data pipeline |
| `PrivacyReceipt` | Browser receipt history | Scoped audit/receipt store |
| privacy signal reader | `navigator.globalPrivacyControl` | Client signal plus server-side `Sec-GPC` handling |
| product-effect selector | React view model | Product components and services |

The detailed mapping, including OneTrust and Usercentrics as documentation-only examples, is in [`docs/INTEGRATION.md`](docs/INTEGRATION.md).

## Repository guide

```text
packages/clearrights-sdk/   headless SDK with privacy, accessibility, and site-guide subpaths
examples/minimal-host/      independent typechecked host integration
evals/                      machine-readable WebMCP prompt cases
docs/DEMO.md                repeatable presentation path
docs/INTEGRATION.md         host contracts and production adapter boundary
docs/EVALS.md               deterministic and browser-agent evaluation method
docs/SUBMISSION.md          Devpost copy, testing instructions, and video storyboard
src/adapters/               Waypoint storage, enforcement, browser, navigation, and WebMCP
src/demo/waypoint/          host catalogs, trust trace, registry, and experience selectors
src/ui/waypoint/            host-owned Waypoint UI
```

## Verify

```bash
npm run test:example
npm run test:webmcp-evals
npm test
npm run lint
npm run build
```

The suite covers catalog invariants, deterministic planning, review/revocation, dynamic tool registration, migrations, receipt retention, enforcement drift, readback mismatch, GPC observation, accessibility rollback/Undo, safe navigation, product effects, and the complete agent-guided privacy flow.

## Trust boundary

ClearRights does not claim legal compliance, identity proof, non-repudiation, accessibility remediation, automatic site understanding, or production infrastructure. Waypoint is a local fictional host. A production adopter remains responsible for accurate catalog content, authentication, authorisation, transactions, recovery, retention, and lawful enforcement.

This project was created during the OpenAI WebMCP Challenge submission period; the current Git history begins on August 27, 2026. Licensed under the [MIT License](LICENSE).
