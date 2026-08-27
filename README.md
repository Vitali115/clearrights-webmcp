# ClearRights WebMCP

ClearRights is a WebMCP-native privacy center embedded in the fictional Waypoint Travel product. A person and a browser agent share the same visible state: the agent can inspect service-declared processing, stage a deterministic minimisation plan, and apply it only after a person reviews the plan in the page. The application then rereads persisted state and produces a verified receipt.

This is a local, single-page demo. It has no backend, login, internal AI, OpenAI API integration, account deletion flow, or formal GDPR request workflow.

## Requirements

- Node.js 22.12 or newer
- npm
- A current browser for the manual experience
- A browser implementing the WebMCP imperative API for agent-tool testing

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

1. Open Waypoint Travel and select **Privacy Center**.
2. Inspect Required and Optional activities in the left column.
3. In **Keep capabilities**, clear optional capabilities you do not need.
4. Optionally select service uses under **Uses to avoid**.
5. Select **Stage privacy plan** and inspect before/after changes, consequences, conflicts, and blocked required processing.
6. Mark the human-review checkbox.
7. Select **Apply reviewed plan**.
8. Inspect the verified receipt produced after persisted-state readback.

The complete flow remains available when `document.modelContext` is absent. **Reset demo data** restores all six processing activities, clears workflow state, and removes the latest receipt after an explicit confirmation.

### WebMCP agent flow

For local Chrome development, enable `chrome://flags/#enable-webmcp-testing`, restart Chrome, and open the Vite page. Chrome origin-trial requirements may apply outside local development; consult the current [WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp).

The intended agent sequence is:

1. `get_privacy_overview`
2. `inspect_processing`
3. `stage_privacy_plan`
4. Wait while a person reviews the visible plan and marks the checkbox.
5. `apply_privacy_plan` using the staged `planId`.
6. `get_privacy_receipt`

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

Exactly five tools exist in the implementation:

| Tool | Input | Lifecycle | Hint |
| --- | --- | --- | --- |
| `get_privacy_overview` | `{}` | Registered at load | Read-only |
| `inspect_processing` | `{ processingId }` | Registered at load | Read-only |
| `stage_privacy_plan` | `{ keepCapabilities, avoidUses }` | Registered at load | Mutating in-memory workflow |
| `apply_privacy_plan` | `{ planId }` | Registered only while reviewed | Persistent mutation |
| `get_privacy_receipt` | `{}` | Registered at load | Read-only |

`apply_privacy_plan` is registered through an `AbortController` only after the visible review checkbox is selected. It is removed if review is revoked, a plan is replaced, apply completes, demo data is reset, or the page adapter is disposed. The application controller independently checks review state, plan identity, and storage revision before every commit.

Zod validates all tool inputs and outputs. Input JSON Schemas are included in WebMCP registration. The current imperative API has no `outputSchema` registration field, so output validation happens immediately before each value is returned. Results use a stable `{ ok, data }` or `{ ok, error }` envelope.

## Architecture

```text
src/domain             pure catalog, model, planner, state machine
src/application        repository port and observable controller
src/adapters/storage   versioned localStorage repository
src/adapters/webmcp    tool contracts and registration lifecycle
src/adapters/browser   browser composition root
src/demo               travel catalog and repeatable seed
src/ui                 React feature composition
src/components/ui      unmodified shadcn registry primitives
```

The data flow is:

```text
React UI ─┐
          ├─> observable PrivacyController ─> PrivacyRepository ─> localStorage
WebMCP ───┘
```

`domain` and `application` do not import React or access the DOM. The controller and repository interfaces can be reused from Next.js, Astro, or vanilla JavaScript with different composition and persistence adapters. React never registers tools, and the WebMCP adapter contains mapping and validation rather than privacy business logic.

## Planner and commit rules

- Required processing is always enabled and cannot be changed.
- The planner enables the minimum processing closure needed by `keepCapabilities`.
- Optional processing not needed by a selected capability is disabled.
- A selected capability can restore previously disabled optional processing.
- When a kept capability needs an avoided use, the capability wins and the conflict is visible.
- Avoided uses belonging to required processing appear as blocked items.
- Semantically equivalent input arrays produce the same plan ID regardless of order.
- New staging revokes an earlier review.
- Plans and review state are intentionally not persisted.
- Apply recalculates the reviewed plan, checks its base revision, writes the complete record, rereads it, and only then exposes the receipt.

The localStorage key is `clearrights.demo.v1`. The versioned record contains the current revision, six activity states, and only the latest receipt.

## Tests

The Vitest suite covers:

- standard minimisation and keep/avoid conflicts;
- locked required processing and corrupted-storage repair;
- optional processing restoration and stable no-op plans;
- `idle → staged → reviewed → applied` transitions;
- stale-plan and missing-review rejection;
- receipt persistence, readback, reload, and reset;
- four tools at load and review-gated apply registration;
- WebMCP input/output validation and registration races;
- the complete manual shadcn flow without WebMCP;
- automatic Sheet opening after agent staging.

## Safety statement

All privacy purposes and legal bases shown here are fictional information **declared by the demo service**. ClearRights does not provide legal advice, determine GDPR compliance, sign receipts, delete accounts, or submit formal data-subject requests. A “verified” receipt means only that the application reread local persisted state and found it equal to the reviewed target.
