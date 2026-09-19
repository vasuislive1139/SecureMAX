import { NextResponse } from 'next/server';
import { getVerifiedSession } from '@/lib/auth/session';
import { deviceStore } from '@/lib/auth/deviceStore';

export async function POST(req: Request) {
  try {
    const session = await getVerifiedSession();
    const body = await req.json().catch(() => ({}));

    const { 
      name, 
      folder, 
      classification, 
      description, 
      plaintext, 
      mimeType, 
      fileType, 
      sizeBytes,
      shareScope,
      targetUserId,
      canDecryptShared,
      canDownloadShared,
      expiresAt,
      saveDefaultPolicy
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    if (!plaintext || typeof plaintext !== 'string') {
      return NextResponse.json({ error: 'File content payload is required for encryption' }, { status: 400 });
    }

    const validFolders = ['Projects', 'Finance', 'HR', 'Engineering', 'Legal'];
    const assignedFolder = validFolders.includes(folder) ? folder : 'Projects';

    const validClassifications = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];
    const assignedClassification = validClassifications.includes(classification) ? classification : 'CONFIDENTIAL';

    const effectiveShareScope = ['PRIVATE', 'SPECIFIC_USER', 'ALL_PEOPLE'].includes(shareScope) 
      ? shareScope 
      : 'PRIVATE';

    const newAsset = deviceStore.createAsset({
      name: name.trim(),
      folder: assignedFolder,
      classification: assignedClassification,
      description: description || `Uploaded via Secure Data Vault by ${session.name || session.email}`,
      plaintext,
      mimeType: mimeType || 'text/plain',
      fileType: fileType || (name.includes('.') ? name.split('.').pop()?.toUpperCase() || 'TXT' : 'TXT'),
      ownerId: session.userId,
      ownerName: session.name || session.email || 'Authorized User',
      sizeBytes: sizeBytes || Buffer.byteLength(plaintext, 'utf8'),
      shareScope: effectiveShareScope,
      targetUserId: effectiveShareScope === 'SPECIFIC_USER' ? targetUserId : undefined,
      canDecryptShared: canDecryptShared !== false,
      canDownloadShared: canDownloadShared !== false,
      expiresAt,
    });

    if (saveDefaultPolicy) {
      const policyToSave = effectiveShareScope === 'ALL_PEOPLE' ? 'ORGANIZATION' : 'PRIVATE';
      deviceStore.setUserDefaultAccessPolicy(session.userId, policyToSave);
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: newAsset.id,
        code: newAsset.asset_code,
        name: newAsset.name,
        classification: newAsset.classification,
        folder: newAsset.folder,
        fileType: newAsset.file_type,
        fileSizeBytes: newAsset.file_size_bytes,
        status: newAsset.status,
        ownerId: newAsset.owner_id,
        ownerName: newAsset.owner_name,
        sharedWithAll: newAsset.shared_with_all,
      },
      message: `Asset encrypted with AES-256-GCM and registered successfully (${effectiveShareScope === 'ALL_PEOPLE' ? 'Shared with All People' : effectiveShareScope === 'SPECIFIC_USER' ? 'Shared with Specific Person' : 'Private to You'}).`,
    });
  } catch (error: any) {
    console.error('[Vault Upload Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload asset' }, { status: 500 });
  }
}
