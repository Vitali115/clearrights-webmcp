# ClearRights Privacy evaluation protocol

The evaluation separates deterministic repository tests from probabilistic browser-agent observations. It does not convert a small demo run into an invented success rate.

## Machine-readable cases

The canonical five cases live in [`../evals/privacy-prompt-cases.json`](../evals/privacy-prompt-cases.json). Each case records:

- initial state and reset requirements;
- prompt text;
- expected calls and accepted arguments;
- allowed additional read-only calls;
- forbidden calls;
- expected UI and outcome.

Validate the pack and its real catalog references with:

```bash
npm run test:webmcp-evals
```

## Deterministic checks

The Vitest suite verifies behavior that must not depend on an agent's wording:

- required settings cannot be disabled;
- a changed draft revokes human review and dynamic apply registration;
- `apply_privacy_plan` is unavailable before review;
- a no-op plan cannot be approved;
- receipt data matches the reviewed plan and applied revision;
- enforcement drift and readback mismatch fail closed;
- GPC `true`, `false`, and unavailable are represented without persistent effects;
- manual fallback works without `document.modelContext`;
- Accessibility Preferences and Site Guide remain independent;
- product effects use only the applied snapshot.

Run the complete deterministic verification with:

```bash
npm run test:example
npm run test:webmcp-evals
npm test
npm run lint
npm run build
```

## Browser-agent protocol

Run all five cases, in order, in three clean sessions for each declared client. Reset demo data before a case whose `initialState` is `clean`; cases 3–5 form one stateful sequence.

For every attempt, record only observed evidence:

| Field | Value to record |
| --- | --- |
| Client | Product and exact version/build |
| Date | Local date and timezone |
| Attempt | 1, 2, or 3 |
| Case ID | ID from the JSON pack |
| Tool calls | Function names and privacy-safe argument summary |
| Forbidden call | Whether one occurred |
| UI state | View opened, review state, tool count, and final route |
| Result | Observed outcome or exact failure |

Do not store prompts beyond the published eval cases, chain-of-thought, PII, browser credentials, or unrelated session data.

## Required clients

| Client | Target | Status |
| --- | --- | --- |
| ChatGPT in-app browser | Five prompts × three clean sessions | Pending recorded submission run |
| Chrome 149 with WebMCP enabled | Tool discovery, 8/9 lifecycle, complete privacy path | Pending recorded submission run |
| Ordinary browser without WebMCP | Complete manual fallback | Pending recorded submission run |

These rows deliberately remain **Pending** until those runs are performed on the final public build. Passing unit tests is not reported as evidence that a probabilistic agent selected the expected tool.

## Development smoke run — August 27, 2026

This was a direct page-tool smoke test in the Codex in-app browser against `http://127.0.0.1:5173`. It verifies the live WebMCP transport and UI effects, not natural-language tool selection. The browser build number was not exposed to the page.

| Attempt | Case | Calls observed | UI observed | Result |
| ---: | --- | --- | --- | --- |
| 1 | `privacy-overview-required` | `get_privacy_overview({})` | No reveal; 8 tools; required and optional state returned | Passed direct-tool smoke |
| 1 | `inspect-partner-advertising` | `inspect_processing({ processingId: "partner_advertising", reveal: true })` | Detail opened; agent indicator present; developer provenance visible | Passed direct-tool smoke |
| 1 | `prepare-minimisation-plan` | `stage_privacy_plan` with the three required capabilities and three avoided uses | Three-change review; Agent check complete; Human check waiting | Passed direct-tool smoke |
| 1 | `block-premature-apply` | No apply call; live catalog still contained 8 tools | Hold visible; apply button disabled | Passed capability-boundary smoke |
| — | `apply-reviewed-plan` | Not invoked | Human hold intentionally left untouched | Not run: browser automation must not be presented as human review |

The same run opened `/#/clearrights` through `navigate_to_site_destination`, observed the staged-plan warning in Product effects, checked the full-viewport mobile sheet with no horizontal overflow, and found no browser console warnings or errors. It also exposed and led to a regression fix: an active plan no longer combines its preparation phase with review, apply, or readback evidence from an older receipt.

## Result template

Copy one row per attempt into the final submission notes:

| Client | Date | Attempt | Case | Calls observed | UI observed | Result |
| --- | --- | ---: | --- | --- | --- | --- |
| _TBD_ | _TBD_ | 1 | `privacy-overview-required` | _TBD_ | _TBD_ | _TBD_ |

Summarise failures literally. For example, distinguish an unavailable browser feature, an incorrect tool selection, a schema error, a missing human step, and an adapter failure.

## Accessibility and browser regression

The final public build also requires manual checks at desktop and mobile widths for keyboard navigation, focus restoration, forced-colors behavior, reduced motion, hash routes, browser Back, reset, and visible product effects. Record the tested browser versions rather than claiming general compatibility.
