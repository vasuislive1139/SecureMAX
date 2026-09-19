import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';
import { UserRole } from '@/types';

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { assetId, newContent, note } = body;

    if (!assetId || !newContent) {
      return NextResponse.json({ error: 'Asset ID and content are required' }, { status: 400 });
    }

    const assignment = deviceStore.getAssignment(session.userId, assetId);
    const isAdmin = session.role === UserRole.ADMIN;
    if (!isAdmin && (!assignment || !assignment.can_edit)) {
      return NextResponse.json({ error: 'You do not have permission to upload new versions for this asset' }, { status: 403 });
    }

    const updated = deviceStore.createNewAssetVersion({
      assetId,
      userId: session.userId,
      newContent,
      note: note || 'Incremental encrypted revision',
    });

    return NextResponse.json({
      success: true,
      message: `Version ${updated.key_version} committed with rotated AES-256-GCM key.`,
      keyVersion: updated.key_version,
      versions: updated.versions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to upload new version' }, { status: 500 });
  }
}
