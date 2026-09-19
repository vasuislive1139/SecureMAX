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
    let tempToken: string;
    try {
      const authResult = await authorizeAssetAccess(
        session.userId,
        assetId,
        session.sessionId,
        session.deviceId
      );
      tempToken = authResult.tempToken;
    } catch (authErr: any) {
      deviceStore.recordAssetAccess(
        assetId,
        session.userId,
        'DECRYPT',
        'DENIED',
        authErr.message || 'Authorization rejected'
      );
      throw authErr;
    }

    // 2. Decrypt encrypted content
    let encryptedBuffer: Buffer | null = null;
    try {
      const { supabaseAdmin } = require('@/lib/db/client');
      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin.storage.from('securemax-vault').download(`assets/${assetId}`);
        if (!error && data) {
          encryptedBuffer = Buffer.from(await data.arrayBuffer());
        }
      }
    } catch (e) {
      console.warn('[Storage] Exception downloading from Supabase:', e);
    }

    if (!encryptedBuffer) {
      if (asset.encrypted_content === 'stored_in_supabase_cloud') {
         return NextResponse.json({ error: 'Asset data missing from memory and storage' }, { status: 500 });
      }
      encryptedBuffer = Buffer.from(asset.encrypted_content, 'base64');
    }
    const decryptedBuffer = await executeDecryption(
      assetId,
      encryptedBuffer,
      asset.iv,
      asset.auth_tag,
      tempToken,
      session.sessionId
    );

    const decryptedText = decryptedBuffer.toString('utf8');

    // 3. Record successful access log
    deviceStore.recordAssetAccess(
      assetId,
      session.userId,
      'DECRYPT',
      'SUCCESS',
      'In-memory AES-256-GCM controlled decryption completed'
    );

    return NextResponse.json({
      success: true,
      assetId: asset.id,
      assetName: asset.name,
      classification: asset.classification,
      folder: asset.folder,
      fileType: asset.file_type,
      mimeType: asset.mime_type,
      fileSizeBytes: asset.file_size_bytes,
      decryptedData: decryptedText,
      decryptedAt: new Date().toISOString(),
      keyVersion: asset.key_version,
      encryptionStandard: 'AES-256-GCM • Server-Side KMS • Controlled Decryption',
      authorizedBy: 'SecureMAX Server-Side KMS & Blockchain Identity Layer',
    });
  } catch (error: any) {
    console.error('[Decryption API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Access Denied: You are not authorized to decrypt this asset.' },
      { status: 403 }
    );
  }
}
