import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getVerifiedSession().catch(() => null);
    const allRequests = deviceStore.getAccessRequests();
    const liveGrants = deviceStore.getLiveGrants();

    let requests = allRequests;
    if (session && session.role !== UserRole.ADMIN) {
      requests = allRequests.filter(r => r.user_id === session.userId);
    }

    return NextResponse.json({
      success: true,
      requests,
      liveGrants,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch access data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { action, assetId, assetCode, reason, ttlMinutes, requestId, grantId, additionalMinutes } = body;

    if (action === 'submit' || !action) {
      let resolvedAssetId = assetId;
      if (!resolvedAssetId && assetCode) {
        for (const [id, a] of deviceStore.assets.entries()) {
          if (a.asset_code === assetCode) {
            resolvedAssetId = id;
            break;
          }
        }
      }

      const request = deviceStore.createAccessRequest({
        userId: session.userId,
        requestType: 'ASSET_ACCESS',
        assetId: resolvedAssetId,
        reason: reason || 'Operational clearance',
      });

      if (ttlMinutes) {
        request.ttl_minutes = Number(ttlMinutes);
        deviceStore.saveToDisk();
      }

      return NextResponse.json({ success: true, request });
    }

    if (action === 'approve') {
      if (session.role !== UserRole.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required to approve clearances' }, { status: 403 });
      }
      if (!requestId) {
        return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
      }

      const approved = deviceStore.approveAccessRequest(requestId, session.userId, ttlMinutes || 30);
      return NextResponse.json({ success: true, request: approved });
    }

    if (action === 'reject') {
      if (session.role !== UserRole.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required to reject clearances' }, { status: 403 });
      }
      if (!requestId) {
        return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
      }

      const rejected = deviceStore.rejectAccessRequest(requestId, session.userId, reason);
      return NextResponse.json({ success: true, request: rejected });
    }

    if (action === 'revoke_grant') {
      if (session.role !== UserRole.ADMIN) {
        return NextResponse.json({ error: 'Unauthorized: Admin access required to revoke live grants' }, { status: 403 });
      }
      if (!grantId) {
        return NextResponse.json({ error: 'Grant ID is required' }, { status: 400 });
      }

      const revoked = deviceStore.revokeLiveGrant(grantId, session.name || session.email || 'Administrator');
      return NextResponse.json({ success: true, grant: revoked });
    }

    if (action === 'extend_grant') {
      if (!grantId) {
        return NextResponse.json({ error: 'Grant ID is required' }, { status: 400 });
      }
      const extended = deviceStore.extendLiveGrant(grantId, additionalMinutes || 15);
      return NextResponse.json({ success: true, grant: extended });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 400 });
  }
}
