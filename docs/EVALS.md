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
| ChatGPT in-app browser | Five prompts × three clean sessions | Blocked on this execution host: only Codex In-app Browser is connected, so no ChatGPT prompt-selection run can be claimed |
| Chrome 149+ with WebMCP enabled | Tool discovery, 8/9 lifecycle, complete privacy path | Passed native manual tool isolation in Chrome 152.0.7977.65 through DevTools Application → WebMCP: four completed calls, zero failures, human hold, dynamic apply, verified receipt, and final return to eight tools. Natural-language agent selection remains untested in Chrome. |
| Ordinary browser without WebMCP | Complete manual fallback | Chrome 152 displayed the complete manual privacy banner and correctly reported structured agent access as unavailable. The full manual choice/review path remains pending. |

Any incomplete row remains explicitly **Blocked** or **Pending** until the named client run is performed on the final public build. Passing unit tests or manually invoking a tool is not reported as evidence that a probabilistic agent selected the expected tool.

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

## Public deployment direct-tool run — August 27, 2026

- **Deployment:** `https://webmcp-openai-contest.vercel.app`
- **Client:** Codex In-app Browser, production build flavor; no numeric browser build was exposed
- **Date and timezone:** August 27, 2026, Europe/Rome
- **Method:** direct calls to the page-defined WebMCP tool handle; no natural-language prompt-selection claim
- **Initial state:** privacy revision 1, three required settings on, three optional settings off, notice pending, GPC unavailable and informational only

### Privacy eval cases

| Attempt | Case | Calls observed | UI/state observed | Result |
| ---: | --- | --- | --- | --- |
| 1 | `privacy-overview-required` | `get_privacy_overview({})` | 8 tools; required settings on and immutable; optional settings off; revision 1; no view reveal | Passed direct-tool transport and output check |
| 1 | `inspect-partner-advertising` | `inspect_processing({ processingId: "partner_advertising" })` | Purpose, enabled/disabled consequences, `opt_in` control and `site_developer` provenance returned | Passed direct-tool transport and provenance check |
| 1 | `prepare-minimisation-plan` | The public seed was already minimised, so the reversible live path used `stage_privacy_plan` with all six capabilities and no avoided uses | Plan `plan-1-cdcvsc`; three optional changes off → on; required target unchanged; no conflicts or blocked items | Passed deterministic staging check; input differs from the published minimisation prompt because a non-no-op public-session plan was required |
| 1 | `block-premature-apply` | No apply call was made before review | Workflow `staged`; 8 tools; `apply_privacy_plan` absent; `applyAvailable: false` | Passed capability-boundary check |
| 1 | `apply-reviewed-plan` | The exact apply tool call and transient ninth-tool window were not captured between state reads | A matching receipt was observed after the human gate: `preparationOrigin: webmcp_tool`, `approvalMethod: review_hold`, revision 1 → 2, verified adapter readback; tools returned to 8 | Partial: end state and receipt passed, but this run does not prove which client invoked apply or show the 8 → 9 transition |

Receipt evidence:

```text
receipt-863cd9ec-a2cb-4af0-895e-ee50076b1da6
plan-1-cdcvsc
waypoint-local-demo · local_demo
observed revision 2 · verified true
```

The latest receipt was also the first entry returned by `get_privacy_history`.

### Remaining public tools

| Tool path | Observation | Result |
| --- | --- | --- |
| `get_privacy_receipt` and `get_privacy_history` before apply | `null` receipt and empty history | Passed |
| `get_accessibility_preferences` | System defaults and observed system preferences returned | Passed |
| `set_accessibility_preferences` | Applied large text, dark color scheme and reduced motion with complete readback and Undo; then restored all three values to `system` through the same tool | Passed and restored |
| `navigate_to_site_destination` | Opened `/#/info/cancellation-policy`, then returned to `/#/?focus=upcoming-trips` using catalog IDs | Passed |

No browser console warnings or errors were observed. All automated browser actions in this run used WebMCP; navigation URLs and resulting state were read for verification.

### What this run does not establish

- It is not one of the required ChatGPT in-app prompt runs.
- It is one direct-tool session, not three clean probabilistic sessions.
- It does not capture the transient registration of tool 9 or the exact `apply_privacy_plan` invocation.
- It is not the Chrome 149+ run.
- It is not the ordinary-browser manual fallback run.

Those gaps remain explicit rather than being converted into a success percentage.

## Public deployment complete direct-tool run — August 27, 2026

This second public run was performed after the privacy-settings hierarchy deploy. It preserves the earlier observations above rather than rewriting them retroactively.

- **Deployment:** `https://webmcp-openai-contest.vercel.app`
- **Client:** Codex In-app Browser; no numeric browser build was exposed
- **Date and timezone:** August 27, 2026, Europe/Rome
- **Method:** direct page-defined WebMCP calls plus two deliberate 1.2-second human holds; no natural-language tool-selection claim
- **Clean start:** the user ran `Reset demo data`; overview then returned no receipt, notice `pending`, three required controls on and three optional controls off at revision 4
- **Rule followed:** the human never selected the visible `Apply changes` button; both applies were invoked through the dynamically registered WebMCP tool

### Reversible precondition setup

The published minimisation prompt requires optional processing to start enabled. The clean demo seed starts minimised, so the run first prepared an explicit reversible setup plan:

```text
plan-4-1q3ha3z
keep all six capabilities · avoid no uses
revision 4 → 5
receipt-47e68761-0fe1-4573-8a34-5704d4b0a62c
```

Before the first hold, eight tools were present and `apply_privacy_plan` was absent. After the user held for 1.2 seconds, nine tools were present. The agent called `apply_privacy_plan({ planId: "plan-4-1q3ha3z" })`; adapter readback matched all six enabled controls, the receipt was verified, and the catalog returned to eight tools.

### Five privacy cases

| Attempt | Case | Calls observed | UI/state observed | Result |
| ---: | --- | --- | --- | --- |
| 2 | `privacy-overview-required` | `get_privacy_overview({})` | 8 tools; required controls enabled and immutable; optional controls disabled; GPC unavailable and informational only; no pending plan | Passed direct-tool transport and output check |
| 2 | `inspect-partner-advertising` | `inspect_processing({ processingId: "partner_advertising" })` | Full declared purpose, on/off consequences, developer context and `contentProvenance: site_developer`; control disabled in the clean state | Passed direct-tool provenance and detail check |
| 2 | `prepare-minimisation-plan` | `stage_privacy_plan` with the three required capabilities and `preference_personalisation`, `precise_location`, and `partner_marketing` avoided | Plan `plan-5-18qr7cv`; three exact changes on → off; no conflict or blocked item; Agent check prepared; Human check waiting | Passed with the canonical minimisation input |
| 2 | `block-premature-apply` | No apply call before review; tool catalog fetched again | 8 tools; `apply_privacy_plan` absent; visible Apply disabled; human hold waiting | Passed capability-boundary check |
| 2 | `apply-reviewed-plan` | After the user's 1.2-second hold, `apply_privacy_plan({ planId: "plan-5-18qr7cv" })`, followed by `get_privacy_overview({})` and `get_privacy_receipt({ reveal: true })` | Tool count changed 8 → 9 → 8; receipt view opened; revision 5 → 6; all required controls remained on; all optional controls became off; adapter readback matched | Passed complete direct-tool lifecycle |

Final receipt evidence:

```text
receipt-da867b7f-0366-4caa-b167-4bf31f2335a6
plan-5-18qr7cv
preparationOrigin: webmcp_tool
approvalMethod: review_hold
waypoint-local-demo · local_demo · adapter_readback
observed revision 6 · verified true
```

The applied snapshot produced four visible product surfaces: three required surfaces and generic travel discovery. The nearby guide and partner offer were absent. Navigation to Bookings used the declared Site Guide destination and closed the sheet.

### Additional-module regression

| Path | Observation | Result |
| --- | --- | --- |
| Display preferences | `set_accessibility_preferences` applied `extra_large`, `dark`, and `reduced`; the three `<html>` data attributes and adapter readback matched. A second tool call restored all three to `system`. | Passed and restored; privacy remained unchanged |
| Site Guide | `navigate_to_site_destination({ destinationId: "cancellation-policy" })` opened `/#/info/cancellation-policy`, focused the level-one heading, exposed a Back control and displayed a new agent-opened-view indicator. Browser Back restored `/#/?focus=upcoming-trips`. | Passed |

### Chrome 152 observation

Chrome `152.0.7977.65` loaded the same public deployment after WebMCP was enabled. ClearRights changed its live banner state to `Structured agent access detected in this browser.`, which verifies that the page received the native WebMCP surface. The Codex browser-control bridge attached to that Chrome tab exposed only its page-assets capability and did not forward a callable `webmcp` tool handle. The Chrome 8/9 lifecycle was therefore not invoked or scored as a pass from this harness.

This is a test-client boundary, not a requirement to open ChatGPT inside Chrome. The official rules allow judges to open the live project either in ChatGPT's WebMCP-capable in-app browser or directly in Chrome 149+ with WebMCP enabled. A compatible agent client can then use the tools registered by the ClearRights page through `document.modelContext`.

### Chrome 152 native DevTools run

The same public deployment was then tested directly through Chrome DevTools **Application → WebMCP**, the Chrome-provided isolation surface for registered tools. This run was driven manually by the user in the DevTools panel while the page UI was independently observed through the attached browser controller.

- **Chrome:** `152.0.7977.65`
- **Date and timezone:** August 27, 2026, Europe/Rome
- **Method:** native manual WebMCP invocation; not natural-language model selection
- **Initial catalog:** 8 available tools; `apply_privacy_plan` absent
- **Precondition:** the human selected `Accept all`, producing six visible product surfaces and an all-optional-on state without attributing that choice to an agent

| Call | Input summary | Chrome/UI evidence | Result |
| --- | --- | --- | --- |
| `get_privacy_overview` | Empty input | Completed in the WebMCP invocation log; initial eight-tool catalog visible | Passed |
| `inspect_processing` | `partner_advertising`, `reveal: true` | Completed; Setting details opened with current state, purpose, data, consequences and `Additional context from Waypoint` | Passed |
| `stage_privacy_plan` | Keep booking, account security and trip updates; avoid personalisation, precise location and partner marketing | Completed as `plan-2-gaoe4w`; visible review contained three changes on → off, three matching consequences, Agent check prepared, Human check waiting, and disabled Apply | Passed |
| `apply_privacy_plan` | `planId: plan-2-gaoe4w`, available only after the human 1.2-second hold | Completed; receipt `receipt-cf6d89fd-a4c7-4bd2-88d1-8cd1d2558213`; revision 2 → 3; `preparationOrigin: webmcp_tool`; `approvalMethod: review_hold`; adapter readback verified | Passed |

Post-apply evidence:

```text
4 total calls · 0 failed · 0 canceled · 0 in progress
8 available tools · apply_privacy_plan absent
receipt-cf6d89fd-a4c7-4bd2-88d1-8cd1d2558213
plan-2-gaoe4w
waypoint-local-demo · local_demo · adapter_readback
observed revision 3 · verified true
```

The receipt view displayed the same receipt ID and verification method. The underlying product returned to four visible surfaces: three required services and generic discovery. Nearby guide and partner offer were absent.

### Interpretation

- Direct WebMCP execution: all five canonical privacy cases passed in this complete run.
- Dynamic trust boundary: the 8 → 9 → 8 lifecycle and exact tool invocation were observed.
- Natural-language agent selection: not evaluated by these direct calls.
- Required three clean ChatGPT sessions: still pending.
- Chrome WebMCP: native registration, manual invocation, dynamic apply, receipt and final catalog were observed; model-driven tool selection remains untested.
- Ordinary-browser manual fallback: banner and fallback messaging observed; complete manual flow still pending.

No aggregate success percentage is reported because these are different evaluation layers, not interchangeable attempts.

### Current scorecard

| Evaluation layer | Score | Meaning |
| --- | ---: | --- |
| Canonical privacy cases, direct tool execution | 5 / 5 | Overview, inspection, staging, premature-apply block and reviewed apply all passed |
| Chrome native WebMCP calls | 4 / 4 | All calls completed; zero failed, canceled or left in progress |
| Dynamic trust boundary | 3 / 3 | Eight tools before review, ninth apply tool after the hold, eight tools after apply |
| Receipt and product readback | 3 / 3 | Receipt matched the plan, adapter readback matched revision 3, and visible product effects matched the applied state |
| Natural-language prompt selection | Unscored | Three clean ChatGPT sessions have not yet been run; direct calls do not substitute for this evidence |

## Result template

Copy one row per attempt into the final submission notes:

| Client | Date | Attempt | Case | Calls observed | UI observed | Result |
| --- | --- | ---: | --- | --- | --- | --- |
| _TBD_ | _TBD_ | 1 | `privacy-overview-required` | _TBD_ | _TBD_ | _TBD_ |

Summarise failures literally. For example, distinguish an unavailable browser feature, an incorrect tool selection, a schema error, a missing human step, and an adapter failure.

## Accessibility and browser regression

The final public build also requires manual checks at desktop and mobile widths for keyboard navigation, focus restoration, forced-colors behavior, reduced motion, hash routes, browser Back, reset, and visible product effects. Record the tested browser versions rather than claiming general compatibility.
