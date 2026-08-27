# `@clearrights/privacy-sdk`

Framework-independent privacy planning and enforcement runtime used by the Waypoint WebMCP demo.

## Public surface

- `definePrivacyCatalog`
- `createPrivacyPlan`
- `createPresetInput`
- `createPrivacyRuntime`
- catalog, repository, enforcement, plan, receipt, and workflow types

The package is a private workspace package for the hackathon demo and is not published to npm.

## Enforcement contract

```ts
interface PrivacyEnforcementAdapter {
  readonly id: string;
  readonly scope: "local_demo" | "external";
  apply(command: PrivacyEnforcementCommand): Promise<void>;
  readCurrentState(): Promise<ProcessingState>;
}
```

`apply` should be idempotent for the supplied `operationId`. The runtime reads the complete adapter state after apply and refuses to issue an adapter-verified receipt when it differs from the reviewed target.

The SDK does not supply production storage, CMP, identity, legal compliance, distributed transactions, or rollback orchestration. Those remain host-application and infrastructure responsibilities.
