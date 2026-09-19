'use server';

import { deviceStore, StoredAccessRequest, StoredAuditEvent } from '@/lib/auth/deviceStore';
import { getVerifiedSession } from '@/lib/auth/session';
import { UserRole } from '@/types';

export async function submitAccessRequestAction(params: {
  assetId?: string;
  requestType: 'HIGH_RISK_DATA' | 'AUDIT_UPDATE';
  reason: string;
}) {
  try {
    const session = await getVerifiedSession();
    const req = deviceStore.createAccessRequest({
      userId: session.userId,
      requestType: params.requestType,
      assetId: params.assetId,
      reason: params.reason || 'Official duty requirement',
    });

    return { success: true, request: req };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit access request' };
  }
}

export async function approveAccessRequestAction(params: { requestId: string }) {
  try {
    const session = await getVerifiedSession();
    if (session.role !== UserRole.ADMIN) {
      return { success: false, error: 'Only administrators can approve access requests and mint NFT permits' };
    }

    const approved = deviceStore.approveAccessRequest(params.requestId, session.userId);
    return { success: true, request: approved };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to approve request' };
  }
}

export async function fetchAllAccessRequestsAction() {
  try {
    await getVerifiedSession();
    return { success: true, requests: deviceStore.getAccessRequests() };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch requests', requests: [] };
  }
}

export async function fetchAuditLedgerAction() {
  try {
    await getVerifiedSession();
    return { success: true, events: deviceStore.getAuditEvents() };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch audit events', events: [] };
  }
}
