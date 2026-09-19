import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { deviceStore } from '../../src/lib/auth/deviceStore';
import { authorizeAssetAccess, executeDecryption } from '../../src/lib/api/access-flow';

describe('Secure Data Vault Core Features & Lifecycle Flow', () => {
  const adminId = 'usr_admin_001';
  const vasuId = 'usr_vasu_002';
  const auditorId = 'usr_auditor_003';
  const sessionId = 'test-session-vault';
  const deviceId = 'dev_vasu_laptop';

  it('1. Pre-seeded assets span all 5 folders with rich metadata', () => {
    const assets = Array.from(deviceStore.assets.values());
    expect(assets.length).toBeGreaterThanOrEqual(10);

    const folders = new Set(assets.map(a => a.folder));
    expect(folders.has('Projects')).toBe(true);
    expect(folders.has('Finance')).toBe(true);
    expect(folders.has('HR')).toBe(true);
    expect(folders.has('Engineering')).toBe(true);
    expect(folders.has('Legal')).toBe(true);

    // Each asset has blockchain token ID, contract, and DID
    for (const asset of assets) {
      expect(asset.blockchain_token_id).toMatch(/^NFT-SEPOLIA-#/);
      expect(asset.blockchain_contract).toBe('0xC5388f457D01cdF25B4A29f0A38d65f4e690bC2B');
      expect(asset.did).toContain('did:securemax:asset:');
    }
  });

  it('2. Upload & Encrypt asset generates DEK, wraps with KEK, and registers asset', () => {
    const newAsset = deviceStore.createAsset({
      name: 'Special_Ops_Directive.pdf',
      folder: 'Projects',
      classification: 'CONFIDENTIAL',
      description: 'Tactical deployment parameters for northern sector',
      plaintext: 'CONFIDENTIAL DIRECTIVE: Deployment commencing at 0400 hours with encrypted telemetry.',
      ownerId: vasuId,
      ownerName: 'Vasu (Lead Engineer)',
    });

    expect(newAsset.id).toBeDefined();
    expect(newAsset.asset_code).toMatch(/^SMX-PRO-/);
    expect(newAsset.folder).toBe('Projects');
    expect(newAsset.classification).toBe('CONFIDENTIAL');
    expect(newAsset.encrypted_content).toBeDefined();
    expect(deviceStore.getWrappedDEK(newAsset.id)).toBeDefined();

    // Owner gets full permissions
    const assignment = deviceStore.getAssignment(vasuId, newAsset.id);
    expect(assignment?.can_read).toBe(true);
    expect(assignment?.can_decrypt).toBe(true);
    expect(assignment?.can_download).toBe(true);
    expect(assignment?.can_edit).toBe(true);
    expect(assignment?.can_delete).toBe(true);
  });

  it('3. Controlled sharing with granular permissions and expiring access', () => {
    // Vasu shares Project Alpha with Auditor, expiring in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const assignment = deviceStore.shareAsset({
      assetId: 'ast_alpha',
      targetUserId: auditorId,
      callerUserId: vasuId,
      canRead: true,
      canDecrypt: true,
      canDownload: false,
      canEdit: false,
      canDelete: false,
      expiresAt,
    });

    expect(assignment.user_id).toBe(auditorId);
    expect(assignment.can_decrypt).toBe(true);
    expect(assignment.can_download).toBe(false);
    expect(assignment.expires_at).toBe(expiresAt);

    // Verify through getAssetsForUser
    const auditorAssets = deviceStore.getAssetsForUser(auditorId);
    const alpha = auditorAssets.find(a => a.asset.id === 'ast_alpha');
    expect(alpha?.can_decrypt).toBe(true);
    expect(alpha?.can_download).toBe(false);
    expect(alpha?.status).toBe('ACTIVE');
  });

  it('4. Expired access is strictly enforced by store and authorization flow', async () => {
    // KMS Module (ast_kms) was seeded with past expiration for Vasu
    const vasuAssets = deviceStore.getAssetsForUser(vasuId);
    const kmsAsset = vasuAssets.find(a => a.asset.id === 'ast_kms');
    expect(kmsAsset?.status).toBe('EXPIRED');
    expect(kmsAsset?.can_decrypt).toBe(false);

    // Attempting to authorize decryption throws Access Denied
    await expect(authorizeAssetAccess(vasuId, 'ast_kms', sessionId, deviceId)).rejects.toThrow(
      'Access Denied'
    );
  });

  it('5. Rename, move folder, and delete operations work with permission check', () => {
    // Create temporary asset to test operations
    const tempAsset = deviceStore.createAsset({
      name: 'Temporary_File.txt',
      folder: 'HR',
      classification: 'INTERNAL',
      description: 'Temporary note',
      plaintext: 'Temporary data to be renamed and deleted',
      ownerId: vasuId,
      ownerName: 'Vasu (Lead Engineer)',
    });

    // Rename
    const renamed = deviceStore.renameAsset(tempAsset.id, 'Renamed_File.txt', vasuId);
    expect(renamed.name).toBe('Renamed_File.txt');
    expect(renamed.versions.length).toBe(2);

    // Move folder
    const moved = deviceStore.moveAssetFolder(tempAsset.id, 'Legal', vasuId);
    expect(moved.folder).toBe('Legal');

    // Delete
    deviceStore.deleteAsset(tempAsset.id, vasuId);
    expect(deviceStore.assets.get(tempAsset.id)).toBeUndefined();
    expect(deviceStore.getWrappedDEK(tempAsset.id)).toBeUndefined();
  });

  it('6. Access history logging records events properly', () => {
    deviceStore.recordAssetAccess('ast_alpha', vasuId, 'DECRYPT', 'SUCCESS', 'Test audit log entry');
    const asset = deviceStore.assets.get('ast_alpha')!;
    const latestLog = asset.access_history[0];
    expect(latestLog.action).toBe('DECRYPT');
    expect(latestLog.status).toBe('SUCCESS');
    expect(latestLog.details).toBe('Test audit log entry');
  });
});
