import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { authorizeAssetAccess, prepareDecryptionStream } from '@/lib/api/access-flow';
import { Readable } from 'stream';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));
    const { assetId } = body;

    if (!assetId) {
      
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return NextResponse.json({ error: 'Missing assetId parameter' }, { status: 400 });
    }

    const asset = deviceStore.assets.get(assetId);
    if (!asset) {
      
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
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

    // 2. Prepare Decryption Stream
    const decryptStream = await prepareDecryptionStream(
      assetId,
      asset.iv,
      asset.auth_tag,
      tempToken,
      session.sessionId
    );

    let finalWebStream: any;

    if (asset.encrypted_content === 'stored_in_supabase_cloud') {
      const { supabaseAdmin } = require('@/lib/db/client');
      if (!supabaseAdmin) throw new Error('Supabase admin client not initialized');
      
      const { data, error } = await supabaseAdmin.storage.from('securemax-vault').createSignedUrl(`assets/${assetId}`, 60);
      if (error || !data?.signedUrl) throw new Error('Failed to generate secure download URL');

      const response = await fetch(data.signedUrl);
      if (!response.ok || !response.body) throw new Error('Failed to fetch encrypted asset stream');

      const nodeReadable = Readable.fromWeb(response.body as any);
      const finalNodeStream = nodeReadable.pipe(decryptStream);
      finalWebStream = Readable.toWeb(finalNodeStream);
    } else {
      // Fallback for legacy assets stored in-memory
      const encryptedBuffer = Buffer.from(asset.encrypted_content, 'base64');
      const nodeReadable = Readable.from(encryptedBuffer);
      const finalNodeStream = nodeReadable.pipe(decryptStream);
      finalWebStream = Readable.toWeb(finalNodeStream);
    }

    // 3. Record successful access log
    deviceStore.recordAssetAccess(
      assetId,
      session.userId,
      'DECRYPT',
      'SUCCESS',
      'Streaming AES-256-GCM decryption started'
    );

    return new NextResponse(finalWebStream, {
      headers: {
        'Content-Type': asset.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${asset.name.replace(/"/g, '')}"`,
        'X-SecureMAX-Standard': 'AES-256-GCM • Streaming Decryption'
      }
    });
  } catch (error: any) {
    console.error('[Decryption API Error]:', error);
    
    if (require('@/lib/auth/deviceStore').deviceStore?.lastSyncPromise) {
      await require('@/lib/auth/deviceStore').deviceStore.lastSyncPromise;
    }
    return NextResponse.json(
      { error: error.message || 'Access Denied: You are not authorized to decrypt this asset.' },
      { status: 403 }
    );
  }
}
