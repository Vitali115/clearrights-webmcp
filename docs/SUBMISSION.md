# OpenAI WebMCP Challenge submission

## Submission fields

- **Title:** ClearRights Privacy
- **Tagline:** Privacy changes agents can prepare, people can approve, and hosts can prove.
- **Live application:** <https://clearrights-webmcp.vercel.app/>
- **Source code:** <https://github.com/Vitali115/clearrights-webmcp>
- **Demo video:** `TBD — public YouTube URL under three minutes`
- **License:** MIT

The live application and public repository were verified on August 27, 2026. Replace the remaining video `TBD` only after opening the public YouTube artifact from a signed-out session.

## Short description

ClearRights Privacy lets a developer declare privacy controls once so people and compatible agents can inspect the same structured model. An agent can prepare an exact deterministic plan, but the consequential apply tool appears only after a person reviews that unchanged plan. The host then applies the target through an explicit adapter, reads the complete state back, and issues a scoped receipt.

Waypoint Travel is a fictional product used to demonstrate the integration. Its recommendations, nearby guide, and partner offer react only to the applied privacy snapshot.

## Why WebMCP

Privacy settings are usually fragmented across banners, account pages, and policy text. Screen automation can click what happens to be visible, but it does not provide a stable model of required processing, consequences, dependencies, or the host's verification boundary.

ClearRights exposes compact page-defined tools generated from the same catalog and controller used by the human UI. Read and planning operations are available normally. `apply_privacy_plan` is registered dynamically only while an exact, non-no-op plan remains human-reviewed. This makes the boundary inspectable in the tool surface rather than relying on prompt instructions alone.

## What a person and agent can do together

1. Inspect active processing and identify required settings.
2. Open the developer-declared purpose, consequences, and provenance for a setting.
3. Translate an outcome such as avoiding personalisation, location use, and partner marketing into a deterministic plan.
4. Show the exact changes and consequences for deliberate human review.
5. Apply only that unchanged plan, read the host adapter back, and display the verified receipt.

Global Privacy Control is observed and reported separately. Its absence is never treated as consent, and the demo does not automatically map it to a complete privacy configuration.

## What makes it different

- **One shared model:** the visible settings UI and WebMCP tools use the same developer-authored catalog and controller.
- **Deterministic preparation:** the model translates requested outcomes into a bounded plan; it does not invent privacy controls or decide which required processing may be disabled.
- **A capability boundary, not a prompt reminder:** `apply_privacy_plan` is absent until a person reviews the exact unchanged plan.
- **Host verification:** apply is followed by complete adapter readback; mismatches fail closed instead of producing a successful receipt.
- **Visible product evidence:** Waypoint recommendations, nearby guidance, and partner offers react only to the applied snapshot.

## Implementation

The private workspace package `@clearrights/sdk@0.2.0` contains a headless privacy catalog, planner, runtime, repository and enforcement ports, workflow invariants, and receipt model. The Waypoint host owns React UI, storage, WebMCP registration, GPC observation, product-effect mapping, and adapters.

Eight tools are registered in the normal state; `apply_privacy_plan` is the ninth only after human review. The privacy trust trace is derived exclusively from the active catalog, workflow state, or matching receipt:

```text
Declared by Waypoint
  → Prepared by agent
  → Reviewed by human
  → Applied by adapter
  → Readback matched
```

Display preferences (powered by ClearRights Accessibility Preferences) and Site Guide remain small secondary modules to demonstrate that catalog-driven host controls can reuse architectural conventions while retaining different approval policies.

### Technology

TypeScript, React, Vite, Zod, Vitest, WebMCP's imperative `document.modelContext` API, and Vercel. The repository includes the headless `@clearrights/sdk` workspace package, a minimal independent host, the full Waypoint reference host, deterministic eval cases, and browser testing notes.

## Public testing instructions

1. Open <https://clearrights-webmcp.vercel.app/>.
2. Select **Privacy settings**, then **Reset demo data**.
3. Confirm that the initial privacy banner is visible.
4. Run the five prompts in [`DEMO.md`](DEMO.md) in order.
5. Before the human hold, verify that `apply_privacy_plan` is absent.
6. Hold the visible review control for 1.2 seconds.
7. Apply the exact reviewed plan and inspect the receipt.
8. Return to Waypoint home and compare the visible product surfaces.
9. Open `/#/clearrights` to inspect the trust trace, GPC observation, product effects, and adapter boundary.

Manual privacy settings continue to work when WebMCP is unavailable.

## Video storyboard — target 2:30

| Time | Visual | English narration goal |
| --- | --- | --- |
| 0:00–0:15 | Fragmented privacy choices, then Waypoint | State the problem and one-sentence value proposition. |
| 0:15–0:45 | Overview and partner-advertising inspection | Show structured state, required settings, consequences, and developer provenance. |
| 0:45–1:10 | Minimisation prompt and exact review | Show deterministic preparation and Agent prepared status. |
| 1:10–1:25 | Premature apply request | Show that the apply tool is not registered before human review. |
| 1:25–1:45 | Human hold, apply, readback, receipt | Show the unchanged-plan gate and host verification. |
| 1:45–2:05 | Waypoint home before/after | Show generic discovery and hidden location/partner surfaces. |
| 2:05–2:20 | Trust trace, GPC, adapter map | Explain real evidence and the production boundary. |
| 2:20–2:30 | Display preferences and Site Guide | Present them briefly as extensions, not competing products. |

Use English narration, no music, no credentials, no vendor logos, and no claim of certification or legal compliance.

## Demo limitations

The repository has no production CMP, backend, authentication, geography engine, agent identity proof, signature, npm release, or compliance guarantee. Local storage demonstrates versioning and failure semantics; production adopters must implement and validate their own authorised adapters, transaction behavior, recovery, retention, and legal requirements.

## Final publishing checklist

- [x] Public GitHub repository is named `clearrights-webmcp` and opens signed out.
- [x] Default branch contains the MIT license and reproducible install instructions.
- [x] Vercel deployment builds with `npm ci` and `npm run build` to `dist`.
- [x] Public deployment has no secret, login, or required environment variable.
- [ ] Tool count is 8 normally and 9 only after unchanged human review.
- [ ] All five eval prompts have three recorded clean-session runs in ChatGPT.
- [ ] Chrome 149 and manual fallback observations are recorded in `EVALS.md`.
- [ ] YouTube video is public and under three minutes.
- [ ] Devpost links, testing instructions, and submission text are final.
- [ ] Final artifacts are ready by September 2; September 3 is buffer only.

The repository's current Git history begins on August 27, 2026, within the challenge period. That date is evidence from Git and should not be replaced with an earlier unsupported date.
