import type {
  PrivacyApprovalMethod,
  PrivacyControllerSnapshot,
  PrivacyPreparationOrigin,
  PrivacyVerificationScope,
} from '@/domain'

export interface PrivacyTrustTrace {
  declared: {
    catalogVersion: string
    noticeVersion: string
  }
  prepared: {
    status: 'pending' | 'agent_prepared' | 'human_direct'
    planId: string | null
    origin: PrivacyPreparationOrigin | null
  }
  reviewed: {
    status: 'pending' | 'human_reviewed' | 'not_required'
    reviewedAt: string | null
    method: PrivacyApprovalMethod | null
  }
  applied: {
    status: 'pending' | 'applied'
    receiptId: string | null
    revision: number | null
    adapterId: string | null
  }
  verified: {
    status: 'pending' | 'readback_matched'
    method: string | null
    scope: PrivacyVerificationScope | null
  }
}

export function selectPrivacyTrustTrace({
  snapshot,
  catalogVersion,
  noticeVersion,
}: {
  snapshot: PrivacyControllerSnapshot
  catalogVersion: string
  noticeVersion: string
}): PrivacyTrustTrace {
  const activePlan = snapshot.plan && (snapshot.workflow === 'staged' || snapshot.workflow === 'reviewed')
    ? snapshot.plan
    : null
  const latestReceipt = snapshot.record.receipts[0] ?? null
  const receiptMatchesAppliedRevision = Boolean(
    latestReceipt
    && latestReceipt.afterRevision === snapshot.record.state.revision
    && latestReceipt.verification.observedRevision === latestReceipt.afterRevision,
  )

  const prepared = activePlan
    ? {
        status: snapshot.preparationOrigin === 'webmcp_tool' ? 'agent_prepared' as const : 'pending' as const,
        planId: activePlan.id,
        origin: snapshot.preparationOrigin,
      }
    : receiptMatchesAppliedRevision && latestReceipt
      ? {
          status: latestReceipt.preparationOrigin === 'webmcp_tool'
            ? 'agent_prepared' as const
            : 'human_direct' as const,
          planId: latestReceipt.planId,
          origin: latestReceipt.preparationOrigin,
        }
      : { status: 'pending' as const, planId: null, origin: null }

  const reviewed = snapshot.workflow === 'reviewed' && snapshot.reviewedAt && snapshot.approvalMethod
    ? {
        status: 'human_reviewed' as const,
        reviewedAt: snapshot.reviewedAt,
        method: snapshot.approvalMethod,
      }
    : receiptMatchesAppliedRevision && latestReceipt
      ? {
          status: latestReceipt.approvalMethod === 'review_hold'
            ? 'human_reviewed' as const
            : 'not_required' as const,
          reviewedAt: latestReceipt.reviewedAt,
          method: latestReceipt.approvalMethod,
        }
      : { status: 'pending' as const, reviewedAt: null, method: null }

  return {
    declared: { catalogVersion, noticeVersion },
    prepared,
    reviewed,
    applied: receiptMatchesAppliedRevision && latestReceipt
      ? {
          status: 'applied',
          receiptId: latestReceipt.id,
          revision: latestReceipt.afterRevision,
          adapterId: latestReceipt.verification.adapterId,
        }
      : { status: 'pending', receiptId: null, revision: null, adapterId: null },
    verified: receiptMatchesAppliedRevision && latestReceipt?.verified
      ? {
          status: 'readback_matched',
          method: latestReceipt.verification.method,
          scope: latestReceipt.verification.scope,
        }
      : { status: 'pending', method: null, scope: null },
  }
}
