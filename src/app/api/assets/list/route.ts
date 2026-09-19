import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole } from '@/types';

export async function GET() {
  try {
    const session = await getVerifiedSession();
    const assetsWithPermissions = deviceStore.getAssetsForUser(session.userId);

    const safeList = assetsWithPermissions.map(item => ({
      id: item.asset.id,
      code: item.asset.asset_code,
      name: item.asset.name,
      classification: item.asset.classification,
      status: item.status,
      description: item.asset.description,
      canRead: item.can_read,
      canDecrypt: item.can_decrypt,
    }));

    return NextResponse.json({
      success: true,
      assets: safeList,
      role: session.role,
      userId: session.userId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    if (session.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Only administrators can modify asset assignments.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, assetId, targetUserId, canRead, canDecrypt } = body;

    if (action === 'revoke') {
      deviceStore.revokeAssignment(assetId, targetUserId);
      return NextResponse.json({ success: true, message: `Access for user ${targetUserId} revoked.` });
    }

    if (action === 'assign') {
      deviceStore.setAssignment(assetId, targetUserId, Boolean(canRead), Boolean(canDecrypt));
      return NextResponse.json({ success: true, message: `Access updated for user ${targetUserId}.` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update asset' }, { status: 500 });
  }
}
