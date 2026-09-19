import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole } from '@/types';

export async function GET() {
  try {
    const session = await getVerifiedSession();
    const user = deviceStore.getUserById(session.userId);
    const vaultItems = deviceStore.getAllVaultAssetsForUser(session.userId);

    const safeList = vaultItems.map(item => ({
      id: item.asset.id,
      code: item.asset.asset_code,
      name: item.asset.name,
      classification: item.asset.classification,
      status: item.status,
      description: item.asset.description,
      folder: item.asset.folder,
      category: item.asset.category,
      fileSize: item.asset.file_size,
      fileExtension: item.asset.file_extension,
      ownerName: item.asset.owner_name,
      ownerAddress: item.asset.owner_address,
      did: item.asset.did,
      tokenId: item.asset.token_id,
      encryptionAlgorithm: item.asset.encryption_algorithm || 'AES-256-GCM • Server-Side KMS • Authorized Decryption',
      keyVersion: item.asset.key_version,
      createdAt: item.asset.created_at,
      lastAccessedAt: item.asset.last_accessed_at,
      canRead: item.can_read,
      canDecrypt: item.can_decrypt,
      canDownload: item.can_download,
      canEdit: item.can_edit,
      canShare: item.can_share,
      canTransfer: item.can_transfer,
      canDelete: item.can_delete,
      expiresAt: item.expires_at || null,
      versions: item.asset.versions || [],
      accessHistory: item.asset.access_history || [],
      isArchived: Boolean(item.asset.is_archived),
    }));

    return NextResponse.json({
      success: true,
      assets: safeList,
      role: session.role,
      userId: session.userId,
      userName: user?.name || session.name || session.email || 'Vasu (Lead Engineer)',
      userEmail: user?.email || session.email || 'vasu@securemax.mil',
      deviceName: session.deviceName || 'Workstation Laptop A',
      shareableUsers: deviceStore.getAllShareableUsers(),
      notifications: deviceStore.getNotifications(),
      storageStats: {
        usedBytes: 48500000,
        totalBytes: 5000000000,
        usedFormatted: '48.5 MB',
        totalFormatted: '5.0 GB',
        percent: 9.7,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Controlled Sharing (Feature 14)
    if (action === 'share') {
      const { assetId, toUserId, permissions, expiresAt } = body;
      if (!assetId || !toUserId) {
        return NextResponse.json({ error: 'Missing assetId or toUserId' }, { status: 400 });
      }

      deviceStore.shareAsset({
        assetId,
        fromUserId: session.userId,
        toUserId,
        permissions: {
          canRead: Boolean(permissions?.canRead),
          canDecrypt: Boolean(permissions?.canDecrypt),
          canDownload: Boolean(permissions?.canDownload),
          canEdit: Boolean(permissions?.canEdit),
          canShare: Boolean(permissions?.canShare),
          canTransfer: Boolean(permissions?.canTransfer),
          canDelete: Boolean(permissions?.canDelete),
        },
        expiresAt: expiresAt || null,
      });

      return NextResponse.json({ success: true, message: 'Asset shared successfully.' });
    }

    // Rename Asset (Feature 2)
    if (action === 'rename') {
      const { assetId, newName } = body;
      if (!assetId || !newName) return NextResponse.json({ error: 'Missing assetId or newName' }, { status: 400 });
      deviceStore.renameAsset(assetId, newName, session.userId);
      return NextResponse.json({ success: true, message: 'Asset renamed successfully.' });
    }

    // Move Asset to Folder (Feature 2, 3)
    if (action === 'move') {
      const { assetId, targetFolder } = body;
      if (!assetId || !targetFolder) return NextResponse.json({ error: 'Missing assetId or targetFolder' }, { status: 400 });
      deviceStore.moveAsset(assetId, targetFolder, session.userId);
      return NextResponse.json({ success: true, message: `Asset moved to ${targetFolder}.` });
    }

    // Archive / Unarchive Asset (Feature 2)
    if (action === 'archive') {
      const { assetId, archive } = body;
      if (!assetId) return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });
      deviceStore.archiveAsset(assetId, session.userId, archive !== false);
      return NextResponse.json({ success: true, message: archive !== false ? 'Asset archived.' : 'Asset restored.' });
    }

    // Delete Asset (Feature 2)
    if (action === 'delete') {
      const { assetId } = body;
      if (!assetId) return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });
      const asset = deviceStore.assets.get(assetId);
      if (session.role !== UserRole.ADMIN && asset?.owner_name !== session.name) {
        return NextResponse.json({ error: 'Unauthorized to delete this asset' }, { status: 403 });
      }
      deviceStore.deleteAsset(assetId, session.userId);
      return NextResponse.json({ success: true, message: 'Asset deleted permanently.' });
    }

    // Mark Notification as Read (Feature 20)
    if (action === 'markNotificationRead') {
      const { notificationId } = body;
      if (notificationId) {
        deviceStore.markNotificationRead(notificationId);
      }
      return NextResponse.json({ success: true });
    }

    // Admin-specific actions
    if (action === 'revoke') {
      if (session.role !== UserRole.ADMIN) {
        return NextResponse.json({ error: 'Only administrators can revoke access.' }, { status: 403 });
      }
      const { assetId, targetUserId } = body;
      deviceStore.revokeAssignment(assetId, targetUserId);
      return NextResponse.json({ success: true, message: `Access for user ${targetUserId} revoked.` });
    }

    if (action === 'assign') {
      if (session.role !== UserRole.ADMIN) {
        return NextResponse.json({ error: 'Only administrators can modify asset assignments.' }, { status: 403 });
      }
      const { assetId, targetUserId, canRead, canDecrypt, canDownload, canEdit, canShare, expiresAt } = body;
      deviceStore.setAssignment(
        assetId,
        targetUserId,
        Boolean(canRead),
        Boolean(canDecrypt),
        canDownload !== undefined ? Boolean(canDownload) : true,
        canEdit !== undefined ? Boolean(canEdit) : false,
        canShare !== undefined ? Boolean(canShare) : false,
        false,
        false,
        expiresAt || null
      );
      return NextResponse.json({ success: true, message: `Access updated for user ${targetUserId}.` });
    }

    if (action === 'rejectRequest') {
      if (session.role !== UserRole.ADMIN) {
        return NextResponse.json({ error: 'Only administrators can reject requests.' }, { status: 403 });
      }
      const { requestId, reason } = body;
      deviceStore.rejectAccessRequest(requestId, session.userId, reason);
      return NextResponse.json({ success: true, message: 'Access request rejected.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process request' }, { status: 500 });
  }
}
