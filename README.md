# ClearRights WebMCP

ClearRights is a WebMCP-native privacy-settings surface embedded in the fictional Waypoint Travel product. Every setting is visible in one grouped index instead of a promotional or wizard-style entry screen. A person and a browser agent share the same state: the agent can inspect a setting, open its detail, prepare deterministic changes, and apply them only after a person reviews the effects in the page. The application then rereads persisted state and produces a verified receipt.

This is a local, single-page demo. It has no backend, login, internal AI, OpenAI API integration, account deletion flow, or formal GDPR request workflow.

## Requirements

- Node.js 22.12 or newer
- npm
- A current browser for the manual experience
- A browser exposing page-defined WebMCP tools for agent-tool testing

Install and start the project:

```bash
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

Available scripts:

```bash
npm run dev        # local Vite server
npm run build      # TypeScript check and production build
npm test           # deterministic Vitest suite
npm run test:watch # watch mode
npm run lint       # Oxlint
```

## Demo flow

### Manual fallback

1. Open Waypoint Travel and select **Privacy settings**.
2. Read every setting in the grouped index or open an individual setting for its purpose, data, legal basis, dependencies, and effect.
3. Turn optional settings on or off. Required settings remain visible and labelled **Required**.
4. Pending rows are marked **Will turn on/off**; select **Review changes**.
5. Inspect the exact before/after state and the effect of each change.
6. Confirm that **Agent check** is prepared when the change set came from WebMCP, then provide the separate **Human check**.
7. Select **Apply changes**.
8. Inspect the verified receipt produced after persisted-state readback. **Previous changes** retains the latest ten receipts, newest first.

The complete flow remains available when WebMCP is absent. **Reset demo data** restores all six processing activities, clears workflow state, and deletes the full receipt history after an explicit confirmation.

### WebMCP agent flow

The Codex in-app browser can exercise the page-defined tools directly when its WebMCP page capability is available, so Chrome is not required in that environment. For local Chrome development, enable the browser's WebMCP testing support and open the Vite page; origin-trial requirements may apply outside local development. Consult the current [WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp).

The intended agent sequence is:

1. `get_privacy_overview` or `inspect_processing`; pass `reveal: true` only when the relevant view should open.
2. `stage_privacy_plan`
3. Wait while a person reviews the visible plan and marks the checkbox.
4. `apply_privacy_plan` using the staged `planId`.
5. `get_privacy_receipt` or `get_privacy_history` for later read-only inspection.

Staging always opens **Review changes**, marks the visible **Agent check** as prepared, and creates an `opened` agent-activity event. The independent **Human check** remains incomplete. Apply always opens the verified receipt. Clicking the activity popover or closing the sheet does not acknowledge the view: the blue dot clears only after click, keyboard, or scroll engagement in the view. Engagement never checks the human-confirmation checkbox.

Example staging input:

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

This disables recommendations and partner advertising while retaining nearby suggestions. If `nearby_suggestions` is kept while `precise_location` is avoided, the plan keeps the capability and reports the conflict.

## WebMCP tools

Six tool definitions exist. Five are registered initially; the sixth appears only after human review:

| Tool | Input | Lifecycle | Hint |
| --- | --- | --- | --- |
| `get_privacy_overview` | `{ reveal?: boolean }` | Registered at load | Read-only |
| `inspect_processing` | `{ processingId, reveal?: boolean }` | Registered at load | Read-only |
| `stage_privacy_plan` | `{ keepCapabilities, avoidUses }` | Registered at load | Mutating in-memory workflow |
| `apply_privacy_plan` | `{ planId }` | Registered only while reviewed | Persistent mutation |
| `get_privacy_receipt` | `{ reveal?: boolean }` | Registered at load | Read-only |
| `get_privacy_history` | `{ reveal?: boolean }` | Registered at load | Read-only |

`apply_privacy_plan` is registered through an `AbortController` only after the visible review checkbox is selected. It is removed if review is revoked, a plan is replaced, apply completes, demo data is reset, or the page adapter is disposed. The application controller independently checks review state, plan identity, and storage revision before every commit.

Zod validates all tool inputs and outputs. Input JSON Schemas are included in WebMCP registration. The current imperative API has no `outputSchema` registration field, so output validation happens immediately before each value is returned. Results use a stable `{ ok, data }` or `{ ok, error }` envelope.

## Architecture

```text
src/domain             pure catalog, model, planner, state machine
src/application        controller, repository port, and session UI coordinator
src/adapters/storage   versioned localStorage repository
src/adapters/webmcp    tool contracts and registration lifecycle
src/adapters/browser   browser composition root
src/demo               travel catalog and repeatable seed
src/ui                 React feature composition
src/components/ui      unmodified shadcn registry primitives
```

The data flow is:

```text
React UI ─────┐
              ├─> observable PrivacyController ─> PrivacyRepository ─> localStorage
WebMCP ───────┘
     │
     └──────────> PrivacyViewCoordinator <────────── React UI
```

`domain` and `application` do not import React or access the DOM. The framework-agnostic `PrivacyViewCoordinator` holds only current-session navigation and the latest agent activity (`opened | engaged`); it is created in the browser composition root and shared by React and WebMCP. React never registers tools, and the WebMCP adapter contains mapping and validation rather than privacy business logic.

## Planner and commit rules

- Required processing is always enabled and cannot be changed.
- The planner enables the minimum processing closure needed by `keepCapabilities`.
- Optional processing not needed by a selected capability is disabled.
- A selected capability can restore previously disabled optional processing.
- When a kept capability needs an avoided use, the capability wins and the conflict is visible.
- Avoided uses belonging to required processing appear as blocked items.
- Semantically equivalent input arrays produce the same plan ID regardless of order.
- New staging revokes an earlier review.
- A no-op plan displays **You’re already set** and cannot be approved or applied.
- Plans and review state are intentionally not persisted.
- Apply recalculates the reviewed plan, checks its base revision, writes the complete record, rereads it, and only then exposes the receipt.

The localStorage key is `clearrights.demo.v2`. The v2 record contains the current revision, six activity states, and up to ten verified receipts in newest-first order. A valid `clearrights.demo.v1` record is migrated automatically with its state and latest receipt, then the legacy key is removed. Corrupt records fall back to the repeatable seed.

## Tests

The Vitest suite covers:

- standard minimisation and keep/avoid conflicts;
- locked required processing and corrupted-storage repair;
- optional processing restoration and stable no-op plans;
- `idle → staged → reviewed → applied` transitions;
- stale-plan and missing-review rejection;
- receipt persistence, v1 migration, newest-first retention, reload, and full-history reset;
- five tools at load and review-gated sixth-tool registration;
- WebMCP input/output validation and registration races;
- reveal navigation that is opt-in for reads and automatic for staging/apply;
- grouped settings navigation, detail focus return, desktop/mobile layout, and the complete manual flow;
- agent activity persistence through popover, rerender, and close, plus click/keyboard/scroll engagement;
- agent staging → visible agent check → separate human checkbox → agent apply → verified receipt.

## Interface design

The settings list intentionally has no decorative menu icons, branded setup card, or cleanup funnel. It uses text hierarchy, native-looking switches, and only sparse monochrome outline icons for universal controls such as back, disclosure, and status. This follows the optional, system-oriented approach in the [OpenAI UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines); the guidelines do not define a separate required GPT Apps SDK icon pack.

## Blueprint boundary

This demo remains one shared page with visible WebMCP actions, a deterministic planner, human review, and verified local receipts. It does not add versioned legal contracts or notices, regulatory research, an account backend, cross-device sync, formal GDPR requests, or persistent agent telemetry. WebMCP-originated navigation is known exactly; native mouse and keyboard events are treated as engagement, but the page cannot prove whether browser automation or a person generated those events without an out-of-scope identity or telemetry system.

## Safety statement

All privacy purposes and legal bases shown here are fictional information **declared by the demo service**. ClearRights does not provide legal advice, determine GDPR compliance, sign receipts, delete accounts, or submit formal data-subject requests. A “verified” receipt means only that the application reread local persisted state and found it equal to the reviewed target.
