import { Button } from '@/components/ui/button'
import type { WaypointDeveloperPreviewModel } from '@/demo/waypoint/developer-product-preview'
import type { WaypointProductEffect } from '@/demo/waypoint/product-effects'

export function DeveloperSurfaceInspector({
  effect,
  preview,
  onClose,
}: {
  effect: WaypointProductEffect
  preview: WaypointDeveloperPreviewModel
  onClose(): void
}) {
  const evidence = preview.evidence.kind === 'applied'
    ? `Applied revision ${preview.evidence.revision} · ${preview.evidence.verified ? 'verified receipt' : 'no matching receipt'}`
    : preview.evidence.kind === 'pending_plan'
      ? `${preview.evidence.planId} · pending and unverified`
      : 'Sandbox override · temporary and unverified'

  return (
    <aside
      aria-label="Product surface inspector"
      className="fixed inset-x-3 bottom-3 z-40 max-h-[min(34rem,calc(100svh-2rem))] overflow-auto border border-blue-950/20 bg-background p-5 text-foreground shadow-xl sm:inset-x-auto sm:right-5 sm:w-[24rem]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Waypoint surface</p>
          <h2 className="mt-2 text-xl font-medium tracking-tight">{effect.surfaceLabel}</h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{effect.surfaceId}</p>
        </div>
        <Button variant="ghost" size="sm" className="rounded-full" onClick={onClose}>Close</Button>
      </div>

      <dl className="mt-6 grid gap-4 text-sm">
        <InspectorValue label="Source setting" value={`${effect.settingLabel} · ${effect.settingId}`} />
        <InspectorValue label="Runtime value" value={effect.runtimeValue} mono />
        <InspectorValue label="Rendered result" value={effect.result} />
        <InspectorValue label="Value source" value={evidence} />
        <InspectorValue label="Host mapping" value={effect.technicalCopy} />
        <InspectorValue label="Adapter" value={`${effect.adapterId} · ${effect.adapterScope}`} />
        <InspectorValue
          label="Readback evidence"
          value={effect.verification.verified
            ? effect.verification.kind === 'privacy_receipt'
              ? `${effect.verification.receiptId} · ${effect.verification.value}`
              : `DOM readback · ${effect.verification.value}`
            : 'No receipt verifies this preview value'}
        />
      </dl>
    </aside>
  )
}

function InspectorValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-t border-foreground/10 pt-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={`mt-1.5 leading-relaxed ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}
