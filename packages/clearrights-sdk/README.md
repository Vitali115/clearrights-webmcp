# `@clearrights/sdk`

Framework-independent ClearRights modules used by the Waypoint WebMCP demo.

## Public surface

- `@clearrights/sdk/privacy`
- `@clearrights/sdk/accessibility`
- `@clearrights/sdk/site-guide`

The package is private to the hackathon workspace and is not published to npm. It contains no React, DOM, storage, WebMCP, or Waypoint dependency.

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
