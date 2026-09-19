import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole } from '@/types';

export async function GET(req: Request) {
  try {
    const session = await getVerifiedSession();
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId') || session.userId;
    const scope = (url.searchParams.get('scope') as 'MY_DATA' | 'ALL_DATA') || 'MY_DATA';
    const targetUser = deviceStore.getUserById(targetUserId);

    const assetsWithPermissions = deviceStore.getAssetsForUser(targetUserId, { scope });

    const safeList = assetsWithPermissions.map(item => ({
      id: item.asset.id,
      code: item.asset.asset_code,
      name: item.asset.name,
      classification: item.asset.classification,
      status: item.status,
      description: item.asset.description,
      canRead: item.can_read,
      canDecrypt: item.can_decrypt,
      canDownload: item.can_download,
      canEdit: item.can_edit,
      canDelete: item.can_delete,
      expiresAt: item.expires_at,
      sharedBy: item.shared_by,
      folder: item.asset.folder,
      fileType: item.asset.file_type,
      mimeType: item.asset.mime_type,
      fileSizeBytes: item.asset.file_size_bytes,
      ownerId: item.asset.owner_id,
      ownerName: item.asset.owner_name,
      createdAt: item.asset.created_at,
      lastAccessedAt: item.asset.last_accessed_at,
      keyVersion: item.asset.key_version,
      versions: item.asset.versions || [],
      accessHistory: item.asset.access_history || [],
      blockchainTokenId: item.asset.blockchain_token_id,
      blockchainContract: item.asset.blockchain_contract,
      did: item.asset.did,
      isOwner: item.is_owner,
      sharingScope: item.sharing_scope,
      assignedUsersCount: item.assigned_users_count,
      shares: item.shares || [],
    }));

    // Calculate total vault storage used
    let totalStorageBytes = 0;
    for (const a of deviceStore.assets.values()) {
      totalStorageBytes += (a.file_size_bytes || 0);
    }

    // List active users for sharing modal
    const users = Array.from(deviceStore.users.values())
      .filter((u, index, self) => self.findIndex(t => t.id === u.id) === index)
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      }));

    const defaultAccessPolicy = deviceStore.getUserDefaultAccessPolicy(targetUserId);

    return NextResponse.json({
      success: true,
      assets: safeList,
      role: session.role,
      userId: targetUserId,
      userName: targetUser?.name || session.name || session.email || 'Authorized User',
      defaultAccessPolicy,
      storage: {
        usedBytes: totalStorageBytes,
        maxBytes: 524288000, // 500 MB
      },
      users,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { action, assetId, targetUserId, canRead, canDecrypt, policy } = body;
    const effectiveTargetUserId = targetUserId || session.userId;

    if (action === 'set_default_policy') {
      if (policy !== 'PRIVATE' && policy !== 'ORGANIZATION') {
        return NextResponse.json({ error: 'Invalid policy option' }, { status: 400 });
      }
      deviceStore.setUserDefaultAccessPolicy(session.userId, policy);
      return NextResponse.json({ success: true, message: `Default access policy set to ${policy}.` });
    }

    if (!assetId) {
      return NextResponse.json({ error: 'Missing assetId parameter' }, { status: 400 });
    }

    if (action === 'revoke_share') {
      deviceStore.revokeAssetShare(assetId, effectiveTargetUserId, session.userId);
      return NextResponse.json({ success: true, message: `Access for user ${effectiveTargetUserId} revoked.` });
    }

    // Admins can modify any user; users can toggle their own assignment
    if (session.role !== UserRole.ADMIN && effectiveTargetUserId !== session.userId) {
      return NextResponse.json({ error: 'Only administrators can modify other users\' assignments.' }, { status: 403 });
    }

    if (action === 'revoke') {
      deviceStore.revokeAssignment(assetId, effectiveTargetUserId);
      return NextResponse.json({ success: true, message: `Access for user ${effectiveTargetUserId} revoked.` });
    }

    if (action === 'assign') {
      deviceStore.setAssignment(assetId, effectiveTargetUserId, Boolean(canRead), Boolean(canDecrypt));
      return NextResponse.json({ success: true, message: `Access updated for user ${effectiveTargetUserId}.` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update asset' }, { status: 500 });
  }
}
