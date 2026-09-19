import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { authorizeAssetAccess, executeDecryption } from '@/lib/api/access-flow';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json({ error: 'Missing assetId parameter' }, { status: 400 });
    }

    const asset = deviceStore.assets.get(assetId);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // 1. Authorize access via 10-step flow
    const { tempToken } = await authorizeAssetAccess(
      session.userId,
      assetId,
      session.sessionId,
      session.deviceId
    );

    // 2. Decrypt encrypted content
    const encryptedBuffer = Buffer.from(asset.encrypted_content, 'base64');
    const decryptedBuffer = await executeDecryption(
      assetId,
      encryptedBuffer,
      asset.iv,
      asset.auth_tag,
      tempToken,
      session.sessionId
    );

    const decryptedText = decryptedBuffer.toString('utf8');

    return NextResponse.json({
      success: true,
      assetId: asset.id,
      assetName: asset.name,
      classification: asset.classification,
      decryptedData: decryptedText,
      decryptedAt: new Date().toISOString(),
      authorizedBy: 'SecureMAX KMS & Blockchain Identity Layer',
    });
  } catch (error: any) {
    console.error('[Decryption API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Access Denied: You are not authorized to decrypt this asset.' },
      { status: 403 }
    );
  }
}
