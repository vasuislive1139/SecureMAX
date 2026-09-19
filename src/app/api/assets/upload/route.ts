import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));

    const {
      name,
      folder = 'Projects',
      category = 'Documents',
      classification = 'CONFIDENTIAL',
      description = 'Secure enterprise asset encrypted at rest',
      content = 'Default confidential asset content encrypted via AES-256-GCM',
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Asset filename is required' }, { status: 400 });
    }

    const newAsset = deviceStore.createAsset({
      name,
      folder,
      category,
      classification,
      description,
      content,
      uploaderUserId: session.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Asset encrypted (AES-256-GCM) and registered on-chain.',
      asset: {
        id: newAsset.id,
        code: newAsset.asset_code,
        name: newAsset.name,
        classification: newAsset.classification,
        folder: newAsset.folder,
        category: newAsset.category,
        fileSize: newAsset.file_size,
        did: newAsset.did,
        tokenId: newAsset.token_id,
        keyVersion: newAsset.key_version,
        encryptionAlgorithm: newAsset.encryption_algorithm,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to upload and encrypt asset' }, { status: 500 });
  }
}
