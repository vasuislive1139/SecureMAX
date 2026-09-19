import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('server-only', () => ({}));

import { deviceStore } from '../../src/lib/auth/deviceStore';
import { authorizeAssetAccess, executeDecryption, revokeAssetAccess } from '../../src/lib/api/access-flow';

describe('End-to-End Decrypt and Revoke Flow', () => {
  beforeAll(() => {
    deviceStore.seedTestDataForTesting();
  });

  const vasuId = 'usr_vasu_002';
  const assetId = 'ast_alpha';
  const sessionId = 'test-session-1';
  const deviceId = 'dev_vasu_laptop';

  it('1. User with active assignment can authorize and decrypt AES-256-GCM data', async () => {
    const authRes = await authorizeAssetAccess(vasuId, assetId, sessionId, deviceId);
    expect(authRes.authorized).toBe(true);
    expect(authRes.tempToken).toBeDefined();

    const asset = deviceStore.assets.get(assetId)!;
    const encryptedBuffer = Buffer.from(asset.encrypted_content, 'base64');
    const decrypted = await executeDecryption(
      assetId,
      encryptedBuffer,
      asset.iv,
      asset.auth_tag,
      authRes.tempToken,
      sessionId
    );

    const text = decrypted.toString('utf8');
    expect(text).toContain('TOP SECRET // CONFIDENTIAL DEFENSE INTEL');
  });

  it('2. Revoking asset access immediately updates store and blocks decryption', async () => {
    // Revoke access
    await revokeAssetAccess('usr_admin_001', vasuId, assetId);

    // Verify in store
    const assetsAfterRevoke = deviceStore.getAssetsForUser(vasuId);
    const revokedAsset = assetsAfterRevoke.find(a => a.asset.id === assetId);
    expect(revokedAsset?.can_decrypt).toBe(false);
    expect(revokedAsset?.status).toBe('REVOKED');

    // Verify authorizeAssetAccess fails
    await expect(authorizeAssetAccess(vasuId, assetId, sessionId, deviceId)).rejects.toThrow(
      'Access Denied'
    );
  });

  it('3. Granting clearance restores decryption capability', async () => {
    // Grant clearance
    deviceStore.setAssignment(assetId, vasuId, true, true);

    const assetsAfterGrant = deviceStore.getAssetsForUser(vasuId);
    const grantedAsset = assetsAfterGrant.find(a => a.asset.id === assetId);
    expect(grantedAsset?.can_decrypt).toBe(true);
    expect(grantedAsset?.status).toBe('ACTIVE');

    // Decryption works again
    const authRes = await authorizeAssetAccess(vasuId, assetId, sessionId, deviceId);
    expect(authRes.authorized).toBe(true);

    const asset = deviceStore.assets.get(assetId)!;
    const encryptedBuffer = Buffer.from(asset.encrypted_content, 'base64');
    const decrypted = await executeDecryption(
      assetId,
      encryptedBuffer,
      asset.iv,
      asset.auth_tag,
      authRes.tempToken,
      sessionId
    );

    expect(decrypted.toString('utf8')).toContain('TOP SECRET // CONFIDENTIAL DEFENSE INTEL');
  });
});
